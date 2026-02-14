from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Resolution(BaseModel):
    width: int
    height: int


class MediaAssetResponse(BaseModel):
    id: str
    file_name: str
    file_path: str
    duration: float
    resolution: Resolution
    frame_rate: float
    file_size: int
    has_audio: bool
    thumbnails: List[str] = Field(default_factory=list)
    create_time: datetime


class ImportVideoRequest(BaseModel):
    file_paths: List[str]


class ImportVideoResponse(BaseModel):
    success: bool
    assets: List[MediaAssetResponse]
    message: Optional[str] = None
