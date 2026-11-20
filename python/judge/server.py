import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from logHome import log_home

MODEL_REPO = "patronus-studio/wolf-defender-prompt-injection-small"
MODEL_REVISION = "2484cc9a13550aa4f2c29b577ff3ef331dc6ba07"
MODEL_FILE = "onnx/int8_int4_embeddings_x86/model.onnx"
MODEL_FILES = ["onnx/int8_int4_embeddings_x86/*", "tokenizer.json", "tokenizer_config.json", "config.json", "special_tokens_map.json"]
MAX_TOKENS = 512
BATCH = 16
HOST = "127.0.0.1"


def home():
    return Path(os.environ.get("LOG_HOME") or log_home())


def model_dir():
    return Path(os.environ.get("LOG_JUDGE_MODEL") or home() / "models" / "wolfDefenderSmall")


def state_file():
    return home() / "judge" / "server.json"


def port():
    return int(os.environ.get("LOG_JUDGE_PORT") or 47615)


def downloaded_revision(path):
    marker = path / ".cache" / "huggingface" / "download" / (MODEL_FILE + ".metadata")
    try:
        return marker.read_text(encoding="utf-8").splitlines()[0].strip()
    except (OSError, IndexError):
        return None


def on_pinned_revision(path):
    if not ((path / MODEL_FILE).exists() and (path / "tokenizer.json").exists()):
        return False
    said = downloaded_revision(path)
    return said is None or said == MODEL_REVISION


def ensure_model(path, download=None):
    if on_pinned_revision(path):
        return path
    if download is None:
        from huggingface_hub import snapshot_download
        download = snapshot_download
    download(MODEL_REPO, revision=MODEL_REVISION, allow_patterns=MODEL_FILES, local_dir=str(path))
    return path


class Judge:
    def __init__(self, path):
        import numpy
        import onnxruntime
        from tokenizers import Tokenizer
        self.np = numpy
        self.tokenizer = Tokenizer.from_file(str(path / "tokenizer.json"))
        self.tokenizer.enable_truncation(MAX_TOKENS)
        self.tokenizer.enable_padding()
        self.session = onnxruntime.InferenceSession(str(path / MODEL_FILE), providers=["CPUExecutionProvider"])
        self.inputs = {i.name for i in self.session.get_inputs()}
        labels = json.loads((path / "config.json").read_text(encoding="utf-8")).get("id2label", {})
        self.injection = next((int(k) for k, v in labels.items() if v.upper() == "INJECTION"), 1)
        self.lock = threading.Lock()

    def batch(self, texts):
        np = self.np
        encoded = self.tokenizer.encode_batch(texts)
        feed = {"input_ids": np.array([e.ids for e in encoded], dtype=np.int64), "attention_mask": np.array([e.attention_mask for e in encoded], dtype=np.int64)}
        logits = self.session.run(None, {k: v for k, v in feed.items() if k in self.inputs})[0]
        exp = np.exp(logits - logits.max(axis=1, keepdims=True))
        return (exp[:, self.injection] / exp.sum(axis=1)).tolist()

    def scores(self, texts):
        with self.lock:
            out = []
            for i in range(0, len(texts), BATCH):
                out += self.batch(texts[i:i + BATCH])
            return [float(s) for s in out]


def handler_of(judge):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            return

        def answer(self, code, body):
            data = json.dumps(body).encode("utf-8")
            self.send_response(code)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == "/health":
                return self.answer(200, {"ok": True, "model": MODEL_REPO, "revision": MODEL_REVISION, "pid": os.getpid()})
            return self.answer(404, {"ok": False})

        def do_POST(self):
            if self.path != "/score":
                return self.answer(404, {"ok": False})
            length = int(self.headers.get("content-length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
                texts = [str(t) for t in body.get("texts") or []]
                return self.answer(200, {"ok": True, "scores": judge.scores(texts) if texts else []})
            except Exception as error:
                return self.answer(500, {"ok": False, "error": str(error)})

    return Handler


def main():
    judge = Judge(ensure_model(model_dir()))
    server = ThreadingHTTPServer((HOST, port()), handler_of(judge))
    state = state_file()
    state.parent.mkdir(parents=True, exist_ok=True)
    state.write_text(json.dumps({"pid": os.getpid(), "port": port(), "model": MODEL_REPO, "revision": MODEL_REVISION}), encoding="utf-8")
    try:
        server.serve_forever()
    finally:
        if state.exists():
            state.unlink()


if __name__ == "__main__":
    main()
