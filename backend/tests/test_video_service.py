import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from services.video_service import VideoService


@pytest.fixture
def video_service() -> VideoService:
    return VideoService(ffprobe_path="__missing_ffprobe__")


def test_check_ffmpeg_installed_returns_false_when_missing(
    video_service: VideoService, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("shutil.which", lambda _name: None)
    assert video_service.check_ffmpeg_installed() is False


def test_extract_video_info_raises_for_missing_file(video_service: VideoService) -> None:
    with pytest.raises(FileNotFoundError):
        video_service.extract_video_info(Path("tests/fixtures/not-found.mp4"))


def test_extract_video_info_parses_ffprobe_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    video_file = tmp_path / "sample.mp4"
    video_file.write_text("mock")

    service = VideoService(ffprobe_path="ffprobe")

    fake_output = {
        "format": {"duration": "12.5", "size": "2048", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": [
            {"codec_type": "video", "width": 1920, "height": 1080, "r_frame_rate": "30000/1001", "codec_name": "h264"},
            {"codec_type": "audio", "codec_name": "aac"},
        ],
    }

    def fake_run(*_args, **_kwargs):  # noqa: ANN002, ANN003
        return SimpleNamespace(stdout=json.dumps(fake_output))

    monkeypatch.setattr("subprocess.run", fake_run)

    info = service.extract_video_info(video_file)

    assert info["duration"] == 12.5
    assert info["file_size"] == 2048
    assert info["resolution"]["width"] == 1920
    assert info["resolution"]["height"] == 1080
    assert info["has_audio"] is True
    assert info["codec"] == "h264"
