import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from config import ALLOWED_VIDEO_FORMATS, MAX_VIDEO_SIZE
from models.schemas import ImportVideoRequest, ImportVideoResponse, MediaAssetResponse, Resolution
from services.video_service import VideoService

router = APIRouter(prefix="/api/media", tags=["media"])
video_service = VideoService()

# Phase 1 uses in-memory storage. Phase 2 will replace this with database persistence.
imported_assets: Dict[str, MediaAssetResponse] = {}


@router.post("/import", response_model=ImportVideoResponse)
async def import_videos(request: ImportVideoRequest) -> ImportVideoResponse:
    if not request.file_paths:
        raise HTTPException(status_code=400, detail="file_paths 不能为空")

    assets: List[MediaAssetResponse] = []
    errors: List[str] = []

    for file_path_str in request.file_paths:
        file_path = Path(file_path_str)
        file_name = file_path.name or file_path_str

        try:
            if not file_path.exists():
                errors.append(f"{file_name}: 文件不存在")
                continue

            if file_path.suffix.lower() not in ALLOWED_VIDEO_FORMATS:
                errors.append(f"{file_name}: 不支持的格式 {file_path.suffix}")
                continue

            file_size = file_path.stat().st_size
            if file_size > MAX_VIDEO_SIZE:
                errors.append(f"{file_name}: 文件过大")
                continue

            video_info = video_service.extract_video_info(file_path)
            asset_id = str(uuid.uuid4())

            resolution = video_info.get("resolution", {"width": 0, "height": 0})
            asset = MediaAssetResponse(
                id=asset_id,
                file_name=file_name,
                file_path=str(file_path.resolve()),
                duration=float(video_info.get("duration", 0)),
                resolution=Resolution(
                    width=int(resolution.get("width", 0)),
                    height=int(resolution.get("height", 0)),
                ),
                frame_rate=float(video_info.get("frame_rate", 0)),
                file_size=file_size,
                has_audio=bool(video_info.get("has_audio", False)),
                thumbnails=[],
                create_time=datetime.now(),
            )

            imported_assets[asset_id] = asset
            assets.append(asset)
        except Exception as exc:  # noqa: BLE001 - convert to batch error message for client
            errors.append(f"{file_name}: {exc}")

    if errors and not assets:
        raise HTTPException(status_code=400, detail=f"所有文件导入失败: {'; '.join(errors)}")

    message = f"部分文件导入失败: {'; '.join(errors)}" if errors else None
    return ImportVideoResponse(success=True, assets=assets, message=message)


@router.get("/list", response_model=List[MediaAssetResponse])
async def list_media_assets() -> List[MediaAssetResponse]:
    return sorted(imported_assets.values(), key=lambda x: x.create_time, reverse=True)


@router.get("/{asset_id}", response_model=MediaAssetResponse)
async def get_media_asset(asset_id: str) -> MediaAssetResponse:
    asset = imported_assets.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")
    return asset
