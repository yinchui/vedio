import json
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

from config import FFPROBE_PATH

logger = logging.getLogger(__name__)


class VideoService:
    """Video processing service built on FFprobe."""

    def __init__(self, ffprobe_path: Optional[str] = None):
        self.ffprobe_path = ffprobe_path or FFPROBE_PATH

    def _resolve_ffprobe_cmd(self) -> str:
        local_path = Path(self.ffprobe_path)
        if local_path.exists():
            return str(local_path)

        ffprobe_in_path = shutil.which("ffprobe")
        if ffprobe_in_path:
            return ffprobe_in_path

        return str(local_path)

    def extract_video_info(self, video_path: Path) -> Dict[str, Any]:
        if not video_path.exists():
            raise FileNotFoundError(f"视频文件不存在: {video_path}")

        cmd = [
            self._resolve_ffprobe_cmd(),
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(video_path),
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=20,
            )
            payload = json.loads(result.stdout)
        except FileNotFoundError as exc:
            logger.error("FFprobe 未找到: %s", exc)
            raise RuntimeError("FFprobe 未安装或路径配置错误") from exc
        except subprocess.CalledProcessError as exc:
            logger.error("FFprobe 执行失败: %s", exc.stderr)
            raise RuntimeError(f"无法提取视频信息: {exc.stderr}") from exc
        except subprocess.TimeoutExpired as exc:
            logger.error("FFprobe 执行超时: %s", exc)
            raise RuntimeError("提取视频信息超时") from exc
        except json.JSONDecodeError as exc:
            logger.error("FFprobe 输出解析失败: %s", exc)
            raise RuntimeError("FFprobe 输出格式错误") from exc

        streams = payload.get("streams", [])
        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
        format_info = payload.get("format", {})

        frame_rate = self._parse_frame_rate(
            str(video_stream.get("r_frame_rate") or video_stream.get("avg_frame_rate") or "0/1")
        ) if video_stream else 0.0

        return {
            "duration": float(format_info.get("duration", 0) or 0),
            "file_size": int(format_info.get("size", 0) or 0),
            "format_name": format_info.get("format_name", "unknown"),
            "resolution": {
                "width": int(video_stream.get("width", 0) if video_stream else 0),
                "height": int(video_stream.get("height", 0) if video_stream else 0),
            },
            "frame_rate": frame_rate,
            "codec": (video_stream.get("codec_name", "unknown") if video_stream else "unknown"),
            "has_audio": audio_stream is not None,
        }

    @staticmethod
    def _parse_frame_rate(fps_str: str) -> float:
        if "/" in fps_str:
            num_str, den_str = fps_str.split("/", 1)
            num = float(num_str)
            den = float(den_str)
            return num / den if den else 0.0
        return float(fps_str)

    def check_ffmpeg_installed(self) -> bool:
        return Path(self.ffprobe_path).exists() or shutil.which("ffprobe") is not None
