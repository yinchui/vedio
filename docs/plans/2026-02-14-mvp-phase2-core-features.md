# MVP Phase 2: 核心功能开发 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现视频预览、时间轴编辑器、缩略图生成、数据库持久化和项目管理功能。

**Architecture:** 继续前后端分离架构。后端增加数据库持久化、缩略图生成服务。前端实现视频预览播放器和基础时间轴编辑器。

**Tech Stack:** SQLAlchemy, SQLite, Video.js, Canvas API, React DnD

**Duration:** 4周（Week 3-6）

**Prerequisites:**
- Phase 1已完成
- FFmpeg已配置

---

## 数据库与持久化

### Task 1: SQLAlchemy数据库模型

**Files:**
- Create: `backend/models/database.py`
- Create: `backend/models/project.py`
- Create: `backend/models/asset.py`
- Create: `backend/models/timeline.py`

**Step 1: 创建数据库连接**

在 `backend/models/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite需要
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)
```

**Step 2: 创建Project模型**

在 `backend/models/project.py`:

```python
from sqlalchemy import Column, String, Integer, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base

class ProjectStatus(str, enum.Enum):
    EDITING = "editing"
    EXPORTED = "exported"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    create_time = Column(DateTime, default=datetime.now)
    update_time = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    target_duration = Column(Integer)  # 目标时长（秒）
    aspect_ratio = Column(String)  # 画幅比例 "9:16"
    status = Column(Enum(ProjectStatus), default=ProjectStatus.EDITING)

    # 关系
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    timeline_clips = relationship("TimelineClip", back_populates="project", cascade="all, delete-orphan")
```

**Step 3: 创建Asset模型**

在 `backend/models/asset.py`:

```python
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    duration = Column(Float)
    resolution = Column(String)  # JSON: "1920x1080"
    frame_rate = Column(Float)
    file_size = Column(Float)
    thumbnails = Column(Text)  # JSON数组
    has_audio = Column(Boolean, default=False)
    analyzed = Column(Boolean, default=False)
    analysis_result = Column(Text)  # JSON格式
    create_time = Column(DateTime, default=datetime.now)

    # 关系
    project = relationship("Project", back_populates="assets")
```

**Step 4: 创建TimelineClip模型**

在 `backend/models/timeline.py`:

```python
from sqlalchemy import Column, String, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum

from .database import Base

class TrackType(str, enum.Enum):
    VIDEO = "video"
    AUDIO = "audio"
    SUBTITLE = "subtitle"
    MUSIC = "music"

class TimelineClip(Base):
    __tablename__ = "timeline_clips"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    asset_id = Column(String, ForeignKey("assets.id"), nullable=True)
    track_type = Column(Enum(TrackType))
    timeline_start = Column(Float)  # 在时间线中的起始位置
    timeline_duration = Column(Float)
    source_start = Column(Float, nullable=True)  # 素材中的起始位置
    source_end = Column(Float, nullable=True)
    properties = Column(Text)  # JSON格式的属性

    # 关系
    project = relationship("Project", back_populates="timeline_clips")
```

**Step 5: 初始化数据库**

修改 `backend/api/main.py`:

```python
from models.database import init_db

@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库"""
    init_db()
    print("Database initialized")
```

**Step 6: 测试数据库创建**

```bash
cd backend
python api/main.py
```

预期: 在 `backend/data/` 目录下生成 `projects.db` 文件

**Step 7: 提交数据库模型**

```bash
git add backend/models/
git commit -m "feat(backend): add SQLAlchemy database models

- Create database connection and session management
- Add Project, Asset, TimelineClip models
- Initialize database on app startup
- Support SQLite with proper relationships

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: 重构素材导入使用数据库

**Files:**
- Modify: `backend/api/routes/media.py`
- Create: `backend/services/project_service.py`

**Step 1: 创建项目服务**

在 `backend/services/project_service.py`:

```python
import uuid
from sqlalchemy.orm import Session
from models.project import Project, ProjectStatus
from models.asset import Asset
from models.timeline import TimelineClip
import json

class ProjectService:
    """项目管理服务"""

    @staticmethod
    def create_project(db: Session, name: str, target_duration: int = None, aspect_ratio: str = None) -> Project:
        """创建新项目"""
        project = Project(
            id=str(uuid.uuid4()),
            name=name,
            target_duration=target_duration,
            aspect_ratio=aspect_ratio,
            status=ProjectStatus.EDITING
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def get_project(db: Session, project_id: str) -> Project:
        """获取项目"""
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def list_projects(db: Session):
        """列出所有项目"""
        return db.query(Project).order_by(Project.update_time.desc()).all()

    @staticmethod
    def create_asset(db: Session, project_id: str, asset_data: dict) -> Asset:
        """创建素材"""
        asset = Asset(
            id=str(uuid.uuid4()),
            project_id=project_id,
            file_name=asset_data["file_name"],
            file_path=asset_data["file_path"],
            duration=asset_data["duration"],
            resolution=json.dumps(asset_data["resolution"]),
            frame_rate=asset_data["frame_rate"],
            file_size=asset_data["file_size"],
            has_audio=asset_data["has_audio"],
            thumbnails=json.dumps([])
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def get_assets_by_project(db: Session, project_id: str):
        """获取项目的所有素材"""
        return db.query(Asset).filter(Asset.project_id == project_id).all()
```

**Step 2: 重构素材导入路由**

修改 `backend/api/routes/media.py`:

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from models.database import get_db
from services.project_service import ProjectService

# 删除内存存储
# imported_assets = {}

@router.post("/import", response_model=ImportVideoResponse)
async def import_videos(
    request: ImportVideoRequest,
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    导入视频素材到指定项目

    Args:
        request: 包含视频文件路径列表的请求
        project_id: 项目ID
        db: 数据库会话

    Returns:
        导入的素材信息
    """
    # 验证项目存在
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    assets = []
    errors = []

    for file_path_str in request.file_paths:
        try:
            file_path = Path(file_path_str)

            # ... 验证逻辑保持不变 ...

            # 提取视频信息
            video_info = video_service.extract_video_info(file_path)

            # 保存到数据库
            asset_data = {
                "file_name": file_path.name,
                "file_path": str(file_path.absolute()),
                "duration": video_info["duration"],
                "resolution": video_info["resolution"],
                "frame_rate": video_info["frame_rate"],
                "file_size": file_path.stat().st_size,
                "has_audio": video_info["has_audio"]
            }

            asset = ProjectService.create_asset(db, project_id, asset_data)

            # 构建响应
            asset_response = MediaAssetResponse(
                id=asset.id,
                file_name=asset.file_name,
                file_path=asset.file_path,
                duration=asset.duration,
                resolution=Resolution(**json.loads(asset.resolution)),
                frame_rate=asset.frame_rate,
                file_size=int(asset.file_size),
                has_audio=asset.has_audio,
                thumbnails=[],
                create_time=asset.create_time
            )

            assets.append(asset_response)

        except Exception as e:
            errors.append(f"{Path(file_path_str).name}: {str(e)}")

    # ... 错误处理保持不变 ...

    return ImportVideoResponse(
        success=True,
        assets=assets,
        message=message
    )

@router.get("/list")
async def list_media_assets(project_id: str, db: Session = Depends(get_db)):
    """获取项目的所有素材"""
    assets = ProjectService.get_assets_by_project(db, project_id)

    return [
        MediaAssetResponse(
            id=asset.id,
            file_name=asset.file_name,
            file_path=asset.file_path,
            duration=asset.duration,
            resolution=Resolution(**json.loads(asset.resolution)),
            frame_rate=asset.frame_rate,
            file_size=int(asset.file_size),
            has_audio=asset.has_audio,
            thumbnails=json.loads(asset.thumbnails),
            create_time=asset.create_time
        )
        for asset in assets
    ]
```

**Step 3: 添加项目管理路由**

创建 `backend/api/routes/project.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from models.database import get_db
from services.project_service import ProjectService

router = APIRouter(prefix="/api/project", tags=["project"])

class CreateProjectRequest(BaseModel):
    name: str
    target_duration: int = None
    aspect_ratio: str = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    create_time: str
    update_time: str
    target_duration: int = None
    aspect_ratio: str = None
    status: str

@router.post("/create", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest, db: Session = Depends(get_db)):
    """创建新项目"""
    project = ProjectService.create_project(
        db,
        name=request.name,
        target_duration=request.target_duration,
        aspect_ratio=request.aspect_ratio
    )

    return ProjectResponse(
        id=project.id,
        name=project.name,
        create_time=project.create_time.isoformat(),
        update_time=project.update_time.isoformat(),
        target_duration=project.target_duration,
        aspect_ratio=project.aspect_ratio,
        status=project.status
    )

@router.get("/list", response_model=List[ProjectResponse])
async def list_projects(db: Session = Depends(get_db)):
    """列出所有项目"""
    projects = ProjectService.list_projects(db)

    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            create_time=p.create_time.isoformat(),
            update_time=p.update_time.isoformat(),
            target_duration=p.target_duration,
            aspect_ratio=p.aspect_ratio,
            status=p.status
        )
        for p in projects
    ]

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: Session = Depends(get_db)):
    """获取项目详情"""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        create_time=project.create_time.isoformat(),
        update_time=project.update_time.isoformat(),
        target_duration=project.target_duration,
        aspect_ratio=project.aspect_ratio,
        status=project.status
    )
```

在 `backend/api/main.py` 中注册:

```python
from api.routes import project

app.include_router(project.router)
```

**Step 4: 提交数据库集成**

```bash
git add backend/
git commit -m "feat(backend): integrate database for media and projects

- Create ProjectService for project management
- Refactor media import to use database
- Add project CRUD endpoints
- Replace in-memory storage with SQLite

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 缩略图生成

### Task 3: 缩略图生成服务

**Files:**
- Modify: `backend/services/video_service.py`
- Create: `backend/tests/test_thumbnail.py`

**Step 1: 添加缩略图生成方法**

在 `backend/services/video_service.py` 中添加:

```python
from pathlib import Path
from typing import List
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class VideoService:
    # ... 现有代码 ...

    def generate_thumbnails(
        self,
        video_path: Path,
        output_dir: Path,
        count: int = 6,
        width: int = 160,
        height: int = 90
    ) -> List[str]:
        """
        生成视频缩略图

        Args:
            video_path: 视频文件路径
            output_dir: 输出目录
            count: 缩略图数量
            width: 缩略图宽度
            height: 缩略图高度

        Returns:
            缩略图文件路径列表
        """
        from config import FFMPEG_PATH

        if not video_path.exists():
            raise FileNotFoundError(f"视频文件不存在: {video_path}")

        # 确保输出目录存在
        output_dir.mkdir(parents=True, exist_ok=True)

        # 获取视频时长
        info = self.extract_video_info(video_path)
        duration = info["duration"]

        # 计算时间间隔
        interval = duration / (count + 1)

        thumbnails = []

        for i in range(count):
            timestamp = interval * (i + 1)
            output_file = output_dir / f"{video_path.stem}_{i:02d}.jpg"

            # FFmpeg命令：提取指定时间点的帧
            cmd = [
                FFMPEG_PATH,
                "-ss", str(timestamp),
                "-i", str(video_path),
                "-vframes", "1",
                "-s", f"{width}x{height}",
                "-q:v", "2",  # 质量
                "-y",  # 覆盖已存在的文件
                str(output_file)
            ]

            try:
                subprocess.run(
                    cmd,
                    capture_output=True,
                    check=True
                )

                thumbnails.append(str(output_file))
                logger.info(f"生成缩略图: {output_file}")

            except subprocess.CalledProcessError as e:
                logger.error(f"生成缩略图失败: {e.stderr}")

        return thumbnails
```

**Step 2: 添加缩略图生成API**

在 `backend/api/routes/media.py` 中添加:

```python
from config import THUMBNAIL_DIR

@router.post("/{asset_id}/thumbnails")
async def generate_asset_thumbnails(
    asset_id: str,
    db: Session = Depends(get_db)
):
    """为素材生成缩略图"""
    # 查询素材
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")

    try:
        # 生成缩略图
        thumbnails = video_service.generate_thumbnails(
            Path(asset.file_path),
            Path(THUMBNAIL_DIR) / asset_id,
            count=6
        )

        # 更新数据库
        asset.thumbnails = json.dumps(thumbnails)
        db.commit()

        return {
            "success": True,
            "thumbnails": thumbnails
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Step 3: 测试缩略图生成**

访问 API 文档测试生成缩略图

**Step 4: 提交缩略图功能**

```bash
git add backend/
git commit -m "feat(backend): add thumbnail generation service

- Implement generate_thumbnails method with FFmpeg
- Add API endpoint for thumbnail generation
- Store thumbnail paths in database
- Support configurable count and size

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 前端视频预览

### Task 4: Video.js播放器集成

**Files:**
- Create: `frontend/src/components/VideoPlayer.tsx`
- Create: `frontend/src/components/VideoPlayer.css`

**Step 1: 安装Video.js**

```bash
cd frontend
npm install video.js @types/video.js
```

**Step 2: 创建视频播放器组件**

在 `frontend/src/components/VideoPlayer.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './VideoPlayer.css';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  onTimeUpdate,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // 初始化Video.js
    const player = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      preload: 'auto',
      sources: [{
        src: src,
        type: 'video/mp4'
      }]
    });

    playerRef.current = player;

    // 监听时间更新
    if (onTimeUpdate) {
      player.on('timeupdate', () => {
        onTimeUpdate(player.currentTime());
      });
    }

    // 监听时长变化
    if (onDurationChange) {
      player.on('loadedmetadata', () => {
        onDurationChange(player.duration());
      });
    }

    // 清理
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [src]);

  return (
    <div className="video-player-container">
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
```

在 `frontend/src/components/VideoPlayer.css`:

```css
.video-player-container {
  width: 100%;
  height: 100%;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-js {
  width: 100%;
  height: 100%;
}

.video-js .vjs-big-play-button {
  border-radius: 50%;
  width: 80px;
  height: 80px;
  line-height: 80px;
  border: none;
  background-color: rgba(24, 144, 255, 0.9);
}

.video-js .vjs-big-play-button:hover {
  background-color: rgba(64, 169, 255, 0.9);
}
```

**Step 3: 集成到主应用**

修改 `frontend/src/App.tsx` 添加预览窗口区域，或创建新的预览页面

**Step 4: 提交视频播放器**

```bash
git add frontend/
git commit -m "feat(frontend): add Video.js player component

- Install and configure Video.js
- Create VideoPlayer component with controls
- Add time update and duration callbacks
- Style player with custom theme

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 时间轴编辑器

### Task 5: 时间轴基础组件

**Files:**
- Create: `frontend/src/components/Timeline/Timeline.tsx`
- Create: `frontend/src/components/Timeline/TimeScale.tsx`
- Create: `frontend/src/components/Timeline/Track.tsx`
- Create: `frontend/src/components/Timeline/Clip.tsx`
- Create: `frontend/src/components/Timeline/Timeline.css`

**Step 1: 创建时间轴数据类型**

在 `frontend/src/types/timeline.ts`:

```typescript
export interface TimelineClip {
  id: string;
  trackType: 'video' | 'audio' | 'subtitle' | 'music';
  assetId?: string;
  timelineStart: number;  // 秒
  timelineDuration: number;  // 秒
  sourceStart?: number;
  sourceEnd?: number;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'subtitle' | 'music';
  clips: TimelineClip[];
  height: number;
}
```

**Step 2: 创建时间刻度尺组件**

在 `frontend/src/components/Timeline/TimeScale.tsx`:

```tsx
import React from 'react';

interface TimeScaleProps {
  duration: number;  // 总时长（秒）
  pixelsPerSecond: number;  // 每秒像素数
  width: number;
}

const TimeScale: React.FC<TimeScaleProps> = ({
  duration,
  pixelsPerSecond,
  width
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算刻度间隔（显示主刻度）
  const interval = duration > 300 ? 30 : duration > 60 ? 10 : 5;
  const markers = [];

  for (let i = 0; i <= duration; i += interval) {
    const x = i * pixelsPerSecond;
    if (x <= width) {
      markers.push(
        <g key={i}>
          <line
            x1={x}
            y1={20}
            x2={x}
            y2={30}
            stroke="#888"
            strokeWidth={1}
          />
          <text
            x={x}
            y={15}
            fontSize={11}
            fill="#ccc"
            textAnchor="middle"
          >
            {formatTime(i)}
          </text>
        </g>
      );
    }
  }

  return (
    <svg width={width} height={30} style={{ backgroundColor: '#2b2b2b' }}>
      {/* 底部线 */}
      <line x1={0} y1={30} x2={width} y2={30} stroke="#444" strokeWidth={1} />
      {markers}
    </svg>
  );
};

export default TimeScale;
```

**Step 3: 创建片段组件**

在 `frontend/src/components/Timeline/Clip.tsx`:

```tsx
import React from 'react';
import type { TimelineClip } from '@/types/timeline';

interface ClipProps {
  clip: TimelineClip;
  pixelsPerSecond: number;
  trackHeight: number;
  selected?: boolean;
  onClick?: () => void;
}

const Clip: React.FC<ClipProps> = ({
  clip,
  pixelsPerSecond,
  trackHeight,
  selected,
  onClick
}) => {
  const x = clip.timelineStart * pixelsPerSecond;
  const width = clip.timelineDuration * pixelsPerSecond;

  const getColor = (type: string) => {
    switch (type) {
      case 'video': return '#1890ff';
      case 'audio': return '#52c41a';
      case 'subtitle': return '#faad14';
      case 'music': return '#f5222d';
      default: return '#888';
    }
  };

  return (
    <div
      className={`timeline-clip ${selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: x,
        width: width,
        height: trackHeight - 8,
        top: 4,
        backgroundColor: getColor(clip.trackType),
        borderRadius: 4,
        cursor: 'pointer',
        border: selected ? '2px solid #fff' : 'none'
      }}
      onClick={onClick}
    >
      <div style={{ padding: '4px 8px', fontSize: 12, color: '#fff' }}>
        Clip {clip.id.substring(0, 6)}
      </div>
    </div>
  );
};

export default Clip;
```

**Step 4: 创建轨道组件**

在 `frontend/src/components/Timeline/Track.tsx`:

```tsx
import React from 'react';
import Clip from './Clip';
import type { Track as TrackType } from '@/types/timeline';

interface TrackProps {
  track: TrackType;
  pixelsPerSecond: number;
  selectedClipId?: string;
  onClipClick?: (clipId: string) => void;
}

const Track: React.FC<TrackProps> = ({
  track,
  pixelsPerSecond,
  selectedClipId,
  onClipClick
}) => {
  const getTrackLabel = (type: string) => {
    switch (type) {
      case 'video': return '视频轨道';
      case 'audio': return '音频轨道';
      case 'subtitle': return '字幕轨道';
      case 'music': return '配乐轨道';
      default: return '轨道';
    }
  };

  return (
    <div className="timeline-track" style={{ height: track.height }}>
      <div className="track-label">
        {getTrackLabel(track.type)}
      </div>
      <div className="track-content" style={{ position: 'relative', flex: 1 }}>
        {track.clips.map(clip => (
          <Clip
            key={clip.id}
            clip={clip}
            pixelsPerSecond={pixelsPerSecond}
            trackHeight={track.height}
            selected={clip.id === selectedClipId}
            onClick={() => onClipClick?.(clip.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Track;
```

**Step 5: 创建主时间轴组件**

在 `frontend/src/components/Timeline/Timeline.tsx`:

```tsx
import React, { useState } from 'react';
import TimeScale from './TimeScale';
import Track from './Track';
import type { Track as TrackType } from '@/types/timeline';
import './Timeline.css';

interface TimelineProps {
  tracks: TrackType[];
  duration: number;
}

const Timeline: React.FC<TimelineProps> = ({ tracks, duration }) => {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [selectedClipId, setSelectedClipId] = useState<string>();

  const timelineWidth = Math.max(duration * pixelsPerSecond, 1000);

  const handleZoom = (delta: number) => {
    setPixelsPerSecond(prev => Math.max(10, Math.min(200, prev + delta)));
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3>时间轴</h3>
        <div className="timeline-controls">
          <button onClick={() => handleZoom(-10)}>-</button>
          <span>{pixelsPerSecond}px/s</span>
          <button onClick={() => handleZoom(10)}>+</button>
        </div>
      </div>

      <div className="timeline-content">
        <div className="timeline-scroll">
          <TimeScale
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
            width={timelineWidth}
          />

          <div className="timeline-tracks">
            {tracks.map(track => (
              <Track
                key={track.id}
                track={track}
                pixelsPerSecond={pixelsPerSecond}
                selectedClipId={selectedClipId}
                onClipClick={setSelectedClipId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
```

在 `frontend/src/components/Timeline/Timeline.css`:

```css
.timeline-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #2b2b2b;
  border-top: 1px solid #444;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #353535;
  border-bottom: 1px solid #444;
}

.timeline-header h3 {
  font-size: 16px;
  color: #fff;
  margin: 0;
}

.timeline-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.timeline-controls button {
  width: 32px;
  height: 32px;
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
}

.timeline-controls button:hover {
  background-color: #555;
}

.timeline-controls span {
  color: #ccc;
  font-size: 12px;
  min-width: 60px;
  text-align: center;
}

.timeline-content {
  flex: 1;
  overflow: hidden;
}

.timeline-scroll {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: auto;
}

.timeline-tracks {
  background-color: #2b2b2b;
}

.timeline-track {
  display: flex;
  border-bottom: 1px solid #444;
}

.track-label {
  width: 120px;
  padding: 8px 12px;
  background-color: #353535;
  color: #ccc;
  font-size: 13px;
  display: flex;
  align-items: center;
  border-right: 1px solid #444;
  flex-shrink: 0;
}

.track-content {
  flex: 1;
  background-color: #1f1f1f;
  min-height: 60px;
}

.timeline-clip {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s;
}

.timeline-clip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.timeline-clip.selected {
  box-shadow: 0 0 0 2px #fff, 0 4px 12px rgba(24, 144, 255, 0.6);
}
```

**Step 6: 提交时间轴组件**

```bash
git add frontend/src/components/Timeline/ frontend/src/types/timeline.ts
git commit -m "feat(frontend): add timeline editor components

- Create TimeScale with time markers
- Implement Track and Clip components
- Add zoom controls for timeline
- Support clip selection
- Style with professional theme

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

**Phase 2完成标准：**

- [x] 数据库模型创建并初始化
- [x] 素材导入使用数据库存储
- [x] 项目管理功能（创建、列表、详情）
- [x] 缩略图生成功能
- [x] 视频播放器集成
- [x] 时间轴基础组件实现

**预计总时间: 32-40小时（4周）**

---

## 下一步

Phase 2完成后进入Phase 3: AI功能集成
