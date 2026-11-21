from __future__ import annotations

import hashlib
import importlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import unicodedata
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from logHome import log_home

SERVICE = "logCli"
ALG = "aes256gcm"
TIMEOUT_S = 10
TAG_BYTES = 16
KEY_BYTES = 32
SCRYPT_PARAMS = {"N": 32768, "r": 8, "p": 1}
SCRYPT_MAXMEM = 64 * 1024 * 1024


class SecretStoreError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def db_path(named: str | None = None) -> Path:
    if named:
        return Path(named)
    if os.environ.get("LOG_DB"):
        return Path(os.environ["LOG_DB"])
    if os.environ.get("LOG_INBOX_STATE"):
        return Path(os.environ["LOG_INBOX_STATE"]) / "log.db"
    return log_home() / "log.db"


class _PycryptodomeGcm:
    def __init__(self, aes: Any, key: bytes) -> None:
        self._aes = aes
        self._key = key

    def encrypt(self, nonce: bytes, data: bytes, aad: bytes) -> bytes:
        cipher = self._aes.new(self._key, self._aes.MODE_GCM, nonce=nonce, mac_len=TAG_BYTES)
        cipher.update(aad)
        body, tag = cipher.encrypt_and_digest(data)
        return body + tag

    def decrypt(self, nonce: bytes, data: bytes, aad: bytes) -> bytes:
        if len(data) < TAG_BYTES:
            raise ValueError("ciphertext too short")
        cipher = self._aes.new(self._key, self._aes.MODE_GCM, nonce=nonce, mac_len=TAG_BYTES)
        cipher.update(aad)
        return cipher.decrypt_and_verify(data[:-TAG_BYTES], data[-TAG_BYTES:])


def _aesgcm(key: bytes):
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        return AESGCM(key)
    except ImportError:
        pass
    for name in ("Cryptodome.Cipher.AES", "Crypto.Cipher.AES"):
        try:
            aes = importlib.import_module(name)
        except ImportError:
            continue
        return _PycryptodomeGcm(aes, key)
    raise SecretStoreError("secretStoreNoCipher", f"no AES-GCM library is installed in {sys.executable} (cryptography or pycryptodome), so sealed secrets cannot be opened from Python")


def _key_aad(key_id: str) -> bytes:
    return f"logCli:storeKey:{key_id}".encode()


def _passphrase() -> str:
    return (os.environ.get("LOG_STORE_PASSPHRASE") or "").strip()


def _keystores_off() -> bool:
    named = (os.environ.get("LOG_STORE_KEYSTORE") or ("none" if os.environ.get("NODE_ENV") == "test" else "os")).strip().lower()
    return named == "none"


def _dpapi_unprotect(wrapped: bytes) -> bytes | None:
    if os.name != "nt":
        return None
    import ctypes
    import ctypes.wintypes as wt

    class Blob(ctypes.Structure):
        _fields_ = [("cbData", wt.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]

    buffer = ctypes.create_string_buffer(wrapped, len(wrapped))
    source = Blob(len(wrapped), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_char)))
    out = Blob()
    if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(out)):
        return None
    try:
        return ctypes.string_at(out.pbData, out.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(out.pbData)


def _cli_lookup(args: list[str]) -> bytes | None:
    if not shutil.which(args[0]):
        return None
    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=TIMEOUT_S, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.SubprocessError):
        return None
    text = (out.stdout or "").strip()
    if out.returncode != 0 or len(text) != 64:
        return None
    try:
        return bytes.fromhex(text)
    except ValueError:
        return None


def _recovery() -> str:
    return (os.environ.get("LOG_STORE_RECOVERY") or "").strip()


def _passphrase_key(passphrase: str, salt: bytes, params: dict[str, Any]) -> bytes:
    return hashlib.scrypt(unicodedata.normalize("NFKC", passphrase).encode("utf-8"), salt=salt, n=int(params.get("N", SCRYPT_PARAMS["N"])), r=int(params.get("r", SCRYPT_PARAMS["r"])), p=int(params.get("p", SCRYPT_PARAMS["p"])), maxmem=SCRYPT_MAXMEM, dklen=KEY_BYTES)


def _recover(row: sqlite3.Row) -> bytes | None:
    method = row["method"]
    key_id = row["keyId"]
    if method in ("passphrase", "recovery"):
        passphrase = _passphrase() if method == "passphrase" else _recovery()
        if not passphrase or not row["salt"] or not row["wrapped"]:
            return None
        params = json.loads(row["params"] or "{}")
        if not params.get("nonce"):
            return None
        cipher = _aesgcm(_passphrase_key(passphrase, bytes(row["salt"]), params))
        try:
            return cipher.decrypt(bytes.fromhex(params["nonce"]), bytes(row["wrapped"]), _key_aad(key_id))
        except Exception:
            return None
    if _keystores_off():
        return None
    if method == "dpapi" and row["wrapped"]:
        return _dpapi_unprotect(bytes(row["wrapped"]))
    if method == "keychain" and sys.platform == "darwin":
        return _cli_lookup(["security", "find-generic-password", "-s", SERVICE, "-a", f"storeKey:{key_id}", "-w"])
    if method == "secretService" and sys.platform.startswith("linux"):
        return _cli_lookup(["secret-tool", "lookup", "service", SERVICE, "account", f"storeKey:{key_id}"])
    return None


def _connect(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise SecretStoreError("secretStoreLocked", f"{path} does not exist, so it holds no sealed secrets")
    connection = sqlite3.connect(str(path), timeout=5)
    connection.row_factory = sqlite3.Row
    return connection


def _wrap_scrypted(connection: sqlite3.Connection, key_id: str, key: bytes, method: str, secret: str) -> None:
    salt = os.urandom(16)
    nonce = os.urandom(12)
    wrapped = _aesgcm(_passphrase_key(secret, salt, SCRYPT_PARAMS)).encrypt(nonce, key, _key_aad(key_id))
    params = json.dumps({"kdf": "scrypt", **SCRYPT_PARAMS, "nonce": nonce.hex()}, separators=(",", ":"))
    connection.execute("INSERT OR REPLACE INTO secretKeys (keyId, method, wrapped, salt, params, createdAt) VALUES (?, ?, ?, ?, ?, ?)", (key_id, method, wrapped, salt, params, datetime.now(timezone.utc).isoformat()))


def _unlock(connection: sqlite3.Connection, create: bool = False) -> tuple[str, bytes]:
    rows = connection.execute("SELECT keyId, method, wrapped, salt, params, createdAt FROM secretKeys ORDER BY createdAt DESC, keyId").fetchall()
    if not rows:
        if create and (_passphrase() or _recovery()):
            key_id, key = os.urandom(8).hex(), os.urandom(KEY_BYTES)
            if _passphrase():
                _wrap_scrypted(connection, key_id, key, "passphrase", _passphrase())
            if _recovery():
                _wrap_scrypted(connection, key_id, key, "recovery", _recovery())
            return key_id, key
        raise SecretStoreError("secretStoreLocked", "log.db has no store key yet")
    key_id = rows[0]["keyId"]
    rank = {"passphrase": 1, "recovery": 2}
    mine = sorted([row for row in rows if row["keyId"] == key_id], key=lambda row: rank.get(row["method"], 0))
    for row in mine:
        try:
            key = _recover(row)
        except SecretStoreError:
            raise
        except Exception:
            key = None
        if key and len(key) == KEY_BYTES:
            return key_id, key
    raise SecretStoreError("secretStoreLocked", f"none of the store key's holders ({', '.join(row['method'] for row in mine)}) opened it here")


def open_secret(ref: str, db: str | None = None) -> str | None:
    with closing(_connect(db_path(db))) as connection:
        row = connection.execute("SELECT keyId, alg, nonce, ciphertext FROM secrets WHERE ref = ?", (ref,)).fetchone()
        if row is None:
            return None
        key_id, key = _unlock(connection)
    if row["keyId"] != key_id or row["alg"] != ALG:
        raise SecretStoreError("secretStoreLocked", f"{ref} was sealed under another key")
    try:
        return _aesgcm(key).decrypt(bytes(row["nonce"]), bytes(row["ciphertext"]), ref.encode()).decode("utf-8")
    except SecretStoreError:
        raise
    except Exception as e:
        raise SecretStoreError("secretTampered", f"{ref} did not pass its authentication check, so it was not used") from e


def put_secret(ref: str, kind: str, value: str, db: str | None = None) -> None:
    with closing(_connect(db_path(db))) as connection:
        connection.execute("BEGIN IMMEDIATE")
        key_id, key = _unlock(connection, create=True)
        nonce = os.urandom(12)
        body = _aesgcm(key).encrypt(nonce, value.encode("utf-8"), ref.encode())
        connection.execute(
            "INSERT INTO secrets (ref, kind, keyId, alg, nonce, ciphertext, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ref) DO UPDATE SET kind = excluded.kind, keyId = excluded.keyId, alg = excluded.alg, nonce = excluded.nonce, ciphertext = excluded.ciphertext, updatedAt = excluded.updatedAt",
            (ref, kind, key_id, ALG, nonce, body, datetime.now(timezone.utc).isoformat()),
        )
        connection.commit()


def load_session(spec: dict[str, Any]) -> tuple[Any, dict[str, Any] | None]:
    handoff = spec.get("cookiesRef")
    if isinstance(handoff, dict) and handoff.get("ref"):
        text = open_secret(str(handoff["ref"]), handoff.get("db"))
        if text is None:
            raise SecretStoreError("secretStoreLocked", f"{handoff['ref']} is not in log.db")
        body = json.loads(text)
        return body.get("cookies", {}), body.get("storage")
    cookies = json.loads(Path(spec["cookiesPath"]).read_text(encoding="utf-8"))
    storage = json.loads(Path(spec["storagePath"]).read_text(encoding="utf-8")) if spec.get("storagePath") else None
    return cookies, storage


def write_private(path: str | Path, text: str) -> None:
    descriptor = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(text)
