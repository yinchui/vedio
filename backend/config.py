import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Paths
TEMP_DIR = BASE_DIR / "temp"
THUMBNAIL_DIR = TEMP_DIR / "thumbnails"
CACHE_DIR = TEMP_DIR / "cache"
DATA_DIR = BASE_DIR / "data"
MUSIC_LIBRARY_PATH = DATA_DIR / "music_library"
LOG_DIR = BASE_DIR / "logs"

for dir_path in [TEMP_DIR, THUMBNAIL_DIR, CACHE_DIR, DATA_DIR, MUSIC_LIBRARY_PATH, LOG_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# FFmpeg
FFMPEG_BIN_DIR = BASE_DIR / "bin" / "ffmpeg"
FFMPEG_PATH = str(FFMPEG_BIN_DIR / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg"))
FFPROBE_PATH = str(FFMPEG_BIN_DIR / ("ffprobe.exe" if os.name == "nt" else "ffprobe"))

# Database
DATABASE_URL = f"sqlite:///{DATA_DIR / 'projects.db'}"

# AI API config placeholders
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
XUNFEI_APPID = os.getenv("XUNFEI_APPID", "")
XUNFEI_API_SECRET = os.getenv("XUNFEI_API_SECRET", "")
XUNFEI_API_KEY = os.getenv("XUNFEI_API_KEY", "")

# Limits
MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
ALLOWED_VIDEO_FORMATS = [".mp4", ".mov", ".avi", ".mkv", ".flv"]

# Logging
LOG_LEVEL = "INFO"
LOG_FILE = LOG_DIR / "app.log"
