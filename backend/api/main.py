from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.routes import media
from services.video_service import VideoService

app = FastAPI(
    title="AI Video Editor API",
    description="AI智能剪辑助手后端服务",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

video_service = VideoService()
app.include_router(media.router)


class VideoInfoRequest(BaseModel):
    video_path: str


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AI Video Editor API", "version": "0.1.0"}


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "Backend is running"}


@app.post("/api/video/info")
async def get_video_info(request: VideoInfoRequest) -> dict:
    path = Path(request.video_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="视频文件不存在")

    try:
        info = video_service.extract_video_info(path)
        return {"success": True, "data": info}
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/ffmpeg/check")
async def check_ffmpeg() -> dict[str, str | bool]:
    installed = video_service.check_ffmpeg_installed()
    return {
        "installed": installed,
        "message": (
            "FFmpeg已安装"
            if installed
            else "FFmpeg未安装，请下载并放置到 backend/bin/ffmpeg/，或将 ffprobe 加入系统 PATH"
        ),
    }


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)
