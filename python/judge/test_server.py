import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from judge import server


def lay_out(path, commit=None):
    (path / server.MODEL_FILE).parent.mkdir(parents=True, exist_ok=True)
    (path / server.MODEL_FILE).write_bytes(b"weights")
    (path / "tokenizer.json").write_text("{}", encoding="utf-8")
    if commit:
        marker = path / ".cache" / "huggingface" / "download" / (server.MODEL_FILE + ".metadata")
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(f"{commit}\netag\n1.0\n", encoding="utf-8")


def recorder():
    calls = []

    def download(repo, **kwargs):
        calls.append((repo, kwargs["revision"], tuple(kwargs["allow_patterns"])))

    return calls, download


def test_downloads_the_pinned_revision_when_nothing_is_there(tmp_path):
    calls, download = recorder()
    server.ensure_model(tmp_path, download)
    assert calls == [(server.MODEL_REPO, server.MODEL_REVISION, tuple(server.MODEL_FILES))]


def test_keeps_files_already_on_the_pinned_revision(tmp_path):
    lay_out(tmp_path, server.MODEL_REVISION)
    calls, download = recorder()
    server.ensure_model(tmp_path, download)
    assert calls == []


def test_downloads_again_when_the_files_came_from_another_revision(tmp_path):
    lay_out(tmp_path, "0" * 40)
    calls, download = recorder()
    server.ensure_model(tmp_path, download)
    assert [c[1] for c in calls] == [server.MODEL_REVISION]


def test_files_without_a_recorded_commit_are_kept_for_log_models_to_verify(tmp_path):
    lay_out(tmp_path)
    calls, download = recorder()
    server.ensure_model(tmp_path, download)
    assert calls == []
