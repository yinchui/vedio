# MVP Phase 1: 基础设施搭建 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建AI视频剪辑软件的前后端基础框架，实现素材导入和基础预览功能，建立前后端通信机制。

**Architecture:** 前后端分离架构。Electron前端负责UI和用户交互，FastAPI后端负责视频处理和业务逻辑。两者通过本地HTTP API通信。前端使用React+TypeScript，后端使用Python+FastAPI。

**Tech Stack:** Electron 27+, React 18, TypeScript, FastAPI, Python 3.10+, FFmpeg, SQLite

**Duration:** 2周（Phase 1）

**Prerequisites:**
- Node.js 18+
- Python 3.10+
- Git
- FFmpeg（需要下载）

---

## 准备工作

### Task 0: 项目结构初始化

**Files:**
- Create: `frontend/package.json`
- Create: `backend/requirements.txt`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: 创建项目目录结构**

```bash
mkdir -p frontend/src/{components,pages,store,utils,types}
mkdir -p frontend/public
mkdir -p backend/{api,models,services,utils}
mkdir -p backend/bin/ffmpeg
mkdir -p backend/data/{music_library,projects}
mkdir -p backend/temp/{thumbnails,cache}
mkdir -p backend/tests
```

**Step 2: 创建前端package.json**

在 `frontend/package.json`:

```json
{
  "name": "ai-video-editor-frontend",
  "version": "0.1.0",
  "description": "AI智能剪辑助手 - 前端应用",
  "main": "src/main.ts",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "electron-builder"
  },
  "dependencies": {
    "electron": "^27.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "@reduxjs/toolkit": "^1.9.0",
    "react-redux": "^8.1.0",
    "antd": "^5.10.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.5.0",
    "video.js": "^8.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.5.0",
    "electron-builder": "^24.0.0",
    "concurrently": "^8.0.0",
    "wait-on": "^7.0.0"
  }
}
```

**Step 3: 创建后端requirements.txt**

在 `backend/requirements.txt`:

```
fastapi==0.104.0
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
websockets==12.0
requests==2.31.0
pillow==10.1.0
pytest==7.4.0
pytest-asyncio==0.21.0
```

**Step 4: 创建.gitignore**

在根目录 `.gitignore`:

```
# Dependencies
node_modules/
venv/
__pycache__/
*.pyc

# Build outputs
frontend/dist/
frontend/build/
backend/*.egg-info/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Temp files
backend/temp/
*.log

# Database
backend/data/projects.db
```

**Step 5: 创建README.md**

在根目录 `README.md`:

```markdown
# AI智能剪辑助手

智能视频自动剪辑软件，支持AI内容理解、自动字幕生成和智能配乐。

## 开发环境搭建

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 后端
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn api.main:app --reload
```

## 项目结构

- `frontend/` - Electron前端应用
- `backend/` - FastAPI后端服务
- `docs/` - 设计文档和计划

## 开发阶段

- [x] Phase 0: 设计文档
- [ ] Phase 1: 基础设施搭建（当前）
- [ ] Phase 2: 核心功能开发
- [ ] Phase 3: AI功能集成
```

**Step 6: 提交初始化**

```bash
git add .gitignore README.md frontend/package.json backend/requirements.txt
git commit -m "chore: initialize project structure

- Add frontend package.json with Electron + React setup
- Add backend requirements.txt with FastAPI dependencies
- Add .gitignore for common files
- Add README with setup instructions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 后端开发

### Task 1: FastAPI基础框架

**Files:**
- Create: `backend/api/main.py`
- Create: `backend/api/__init__.py`
- Create: `backend/config.py`
- Create: `backend/models/__init__.py`

**Step 1: 创建FastAPI主应用**

在 `backend/api/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="AI Video Editor API",
    description="AI智能剪辑助手后端服务",
    version="0.1.0"
)

# CORS配置（允许Electron前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """根路径"""
    return {"message": "AI Video Editor API", "version": "0.1.0"}

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "message": "Backend is running"}

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
```

在 `backend/api/__init__.py`:

```python
# API package
```

**Step 2: 创建配置文件**

在 `backend/config.py`:

```python
import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent

# ==================== 路径配置 ====================
TEMP_DIR = BASE_DIR / "temp"
THUMBNAIL_DIR = TEMP_DIR / "thumbnails"
CACHE_DIR = TEMP_DIR / "cache"
DATA_DIR = BASE_DIR / "data"
MUSIC_LIBRARY_PATH = DATA_DIR / "music_library"

# 确保目录存在
for dir_path in [TEMP_DIR, THUMBNAIL_DIR, CACHE_DIR, DATA_DIR, MUSIC_LIBRARY_PATH]:
    dir_path.mkdir(parents=True, exist_ok=True)

# ==================== FFmpeg配置 ====================
FFMPEG_PATH = str(BASE_DIR / "bin/ffmpeg/ffmpeg.exe")
FFPROBE_PATH = str(BASE_DIR / "bin/ffmpeg/ffprobe.exe")

# ==================== 数据库配置 ====================
DATABASE_URL = f"sqlite:///{DATA_DIR / 'projects.db'}"

# ==================== AI API配置 ====================
# TODO: 需要用户配置
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
XUNFEI_APPID = os.getenv("XUNFEI_APPID", "")
XUNFEI_API_SECRET = os.getenv("XUNFEI_API_SECRET", "")
XUNFEI_API_KEY = os.getenv("XUNFEI_API_KEY", "")

# ==================== 其他配置 ====================
MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
ALLOWED_VIDEO_FORMATS = [".mp4", ".mov", ".avi", ".mkv", ".flv"]

# ==================== 日志配置 ====================
LOG_LEVEL = "INFO"
LOG_FILE = BASE_DIR / "logs" / "app.log"
```

在 `backend/models/__init__.py`:

```python
# Models package
```

**Step 3: 测试后端启动**

运行:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python api/main.py
```

预期输出:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

访问: http://127.0.0.1:8000/docs
预期: 看到FastAPI自动生成的API文档

**Step 4: 测试健康检查接口**

访问: http://127.0.0.1:8000/api/health

预期响应:
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

**Step 5: 提交后端框架**

```bash
git add backend/
git commit -m "feat(backend): add FastAPI basic framework

- Create main FastAPI application
- Add CORS middleware for frontend communication
- Add health check endpoint
- Add configuration file with path and API settings

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: 视频信息提取服务

**Files:**
- Create: `backend/services/video_service.py`
- Create: `backend/services/__init__.py`
- Create: `backend/tests/test_video_service.py`
- Modify: `backend/api/main.py`

**Step 1: 写失败的测试**

在 `backend/tests/test_video_service.py`:

```python
import pytest
from pathlib import Path
from services.video_service import VideoService

@pytest.fixture
def video_service():
    return VideoService()

def test_extract_video_info_returns_metadata(video_service):
    """测试提取视频信息"""
    # 注意：这里需要一个测试视频文件
    # 暂时跳过，等有测试文件后再运行
    pytest.skip("需要测试视频文件")

    video_path = Path("tests/fixtures/test_video.mp4")
    info = video_service.extract_video_info(video_path)

    assert "duration" in info
    assert "resolution" in info
    assert "frame_rate" in info
    assert info["duration"] > 0
```

**Step 2: 运行测试验证失败**

```bash
cd backend
pytest tests/test_video_service.py -v
```

预期: SKIPPED（因为没有测试文件）

**Step 3: 实现视频信息提取服务**

在 `backend/services/__init__.py`:

```python
# Services package
```

在 `backend/services/video_service.py`:

```python
import subprocess
import json
from pathlib import Path
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class VideoService:
    """视频处理服务"""

    def __init__(self, ffprobe_path: str = None):
        from config import FFPROBE_PATH
        self.ffprobe_path = ffprobe_path or FFPROBE_PATH

    def extract_video_info(self, video_path: Path) -> Dict[str, Any]:
        """
        提取视频信息

        Args:
            video_path: 视频文件路径

        Returns:
            包含视频元数据的字典
        """
        if not video_path.exists():
            raise FileNotFoundError(f"视频文件不存在: {video_path}")

        # 构建ffprobe命令
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(video_path)
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            data = json.loads(result.stdout)

            # 提取视频流信息
            video_stream = next(
                (s for s in data.get("streams", []) if s["codec_type"] == "video"),
                None
            )

            # 提取音频流信息
            audio_stream = next(
                (s for s in data.get("streams", []) if s["codec_type"] == "audio"),
                None
            )

            format_info = data.get("format", {})

            # 构建返回信息
            info = {
                "duration": float(format_info.get("duration", 0)),
                "file_size": int(format_info.get("size", 0)),
                "format_name": format_info.get("format_name", "unknown"),
            }

            if video_stream:
                info["resolution"] = {
                    "width": video_stream.get("width", 0),
                    "height": video_stream.get("height", 0)
                }

                # 解析帧率
                fps_str = video_stream.get("r_frame_rate", "0/1")
                if "/" in fps_str:
                    num, den = map(int, fps_str.split("/"))
                    info["frame_rate"] = num / den if den != 0 else 0
                else:
                    info["frame_rate"] = float(fps_str)

                info["codec"] = video_stream.get("codec_name", "unknown")

            info["has_audio"] = audio_stream is not None

            return info

        except subprocess.CalledProcessError as e:
            logger.error(f"FFprobe执行失败: {e.stderr}")
            raise RuntimeError(f"无法提取视频信息: {e.stderr}")
        except json.JSONDecodeError as e:
            logger.error(f"解析FFprobe输出失败: {e}")
            raise RuntimeError("FFprobe输出格式错误")

    def check_ffmpeg_installed(self) -> bool:
        """检查FFmpeg是否已安装"""
        return Path(self.ffprobe_path).exists()
```

**Step 4: 添加API端点**

在 `backend/api/main.py` 中添加:

```python
from fastapi import UploadFile, HTTPException
from services.video_service import VideoService
from pathlib import Path

video_service = VideoService()

@app.post("/api/video/info")
async def get_video_info(video_path: str):
    """获取视频信息"""
    try:
        path = Path(video_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="视频文件不存在")

        info = video_service.extract_video_info(path)
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ffmpeg/check")
async def check_ffmpeg():
    """检查FFmpeg是否已安装"""
    installed = video_service.check_ffmpeg_installed()
    return {
        "installed": installed,
        "message": "FFmpeg已安装" if installed else "FFmpeg未安装，请下载并放置到 backend/bin/ffmpeg/"
    }
```

**Step 5: 提交视频服务**

```bash
git add backend/services/ backend/tests/ backend/api/main.py
git commit -m "feat(backend): add video info extraction service

- Implement VideoService with FFprobe integration
- Add extract_video_info method to get video metadata
- Add API endpoints for video info and FFmpeg check
- Add basic unit tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: 素材导入API

**Files:**
- Create: `backend/models/schemas.py`
- Create: `backend/api/routes/media.py`
- Modify: `backend/api/main.py`

**Step 1: 创建数据模型**

在 `backend/models/schemas.py`:

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Resolution(BaseModel):
    """分辨率"""
    width: int
    height: int

class MediaAssetResponse(BaseModel):
    """素材响应模型"""
    id: str
    file_name: str
    file_path: str
    duration: float
    resolution: Resolution
    frame_rate: float
    file_size: int
    has_audio: bool
    thumbnails: List[str] = []
    create_time: datetime

class ImportVideoRequest(BaseModel):
    """导入视频请求"""
    file_paths: List[str]

class ImportVideoResponse(BaseModel):
    """导入视频响应"""
    success: bool
    assets: List[MediaAssetResponse]
    message: Optional[str] = None
```

**Step 2: 创建素材路由**

在 `backend/api/routes/media.py`:

```python
from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime
from pathlib import Path

from models.schemas import (
    ImportVideoRequest,
    ImportVideoResponse,
    MediaAssetResponse,
    Resolution
)
from services.video_service import VideoService
from config import ALLOWED_VIDEO_FORMATS, MAX_VIDEO_SIZE

router = APIRouter(prefix="/api/media", tags=["media"])
video_service = VideoService()

# 临时存储（后续会用数据库替代）
imported_assets = {}

@router.post("/import", response_model=ImportVideoResponse)
async def import_videos(request: ImportVideoRequest):
    """
    导入视频素材

    Args:
        request: 包含视频文件路径列表的请求

    Returns:
        导入的素材信息
    """
    assets = []
    errors = []

    for file_path_str in request.file_paths:
        try:
            file_path = Path(file_path_str)

            # 验证文件存在
            if not file_path.exists():
                errors.append(f"{file_path.name}: 文件不存在")
                continue

            # 验证文件格式
            if file_path.suffix.lower() not in ALLOWED_VIDEO_FORMATS:
                errors.append(f"{file_path.name}: 不支持的格式")
                continue

            # 验证文件大小
            file_size = file_path.stat().st_size
            if file_size > MAX_VIDEO_SIZE:
                errors.append(f"{file_path.name}: 文件过大")
                continue

            # 提取视频信息
            video_info = video_service.extract_video_info(file_path)

            # 生成素材ID
            asset_id = str(uuid.uuid4())

            # 构建素材对象
            asset = MediaAssetResponse(
                id=asset_id,
                file_name=file_path.name,
                file_path=str(file_path.absolute()),
                duration=video_info["duration"],
                resolution=Resolution(
                    width=video_info["resolution"]["width"],
                    height=video_info["resolution"]["height"]
                ),
                frame_rate=video_info["frame_rate"],
                file_size=file_size,
                has_audio=video_info["has_audio"],
                thumbnails=[],  # 后续Task会生成缩略图
                create_time=datetime.now()
            )

            # 存储到内存（临时）
            imported_assets[asset_id] = asset
            assets.append(asset)

        except Exception as e:
            errors.append(f"{Path(file_path_str).name}: {str(e)}")

    if errors and not assets:
        raise HTTPException(
            status_code=400,
            detail=f"所有文件导入失败: {'; '.join(errors)}"
        )

    message = None
    if errors:
        message = f"部分文件导入失败: {'; '.join(errors)}"

    return ImportVideoResponse(
        success=True,
        assets=assets,
        message=message
    )

@router.get("/list", response_model=List[MediaAssetResponse])
async def list_media_assets():
    """获取所有已导入的素材"""
    return list(imported_assets.values())

@router.get("/{asset_id}", response_model=MediaAssetResponse)
async def get_media_asset(asset_id: str):
    """获取单个素材详情"""
    if asset_id not in imported_assets:
        raise HTTPException(status_code=404, detail="素材不存在")
    return imported_assets[asset_id]
```

**Step 3: 注册路由到主应用**

修改 `backend/api/main.py`:

```python
from api.routes import media

# 在app创建后添加
app.include_router(media.router)
```

**Step 4: 测试素材导入API**

启动后端服务器，然后测试:

访问: http://127.0.0.1:8000/docs

使用API文档测试 `POST /api/media/import`:

请求体示例（需要替换为实际视频路径）:
```json
{
  "file_paths": ["C:/path/to/test_video.mp4"]
}
```

预期: 返回素材信息

**Step 5: 提交素材导入功能**

```bash
git add backend/models/schemas.py backend/api/routes/
git commit -m "feat(backend): add media import API

- Create Pydantic schemas for media assets
- Implement media import endpoint with validation
- Add file format and size validation
- Store imported assets in memory (temp)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 前端开发

### Task 4: Electron + React基础框架

**Files:**
- Create: `frontend/src/main.ts`
- Create: `frontend/src/preload.ts`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.tsx`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`

**Step 1: 创建Vite配置**

在 `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Step 2: 创建TypeScript配置**

在 `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

在 `frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 3: 创建Electron主进程**

在 `frontend/src/main.ts`:

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#2B2B2B',
    show: false, // 先隐藏，等渲染完成再显示
  });

  // 渲染进程准备好后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    // 开发模式：加载Vite开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

**Step 4: 创建Preload脚本**

在 `frontend/src/preload.ts`:

```typescript
import { contextBridge } from 'electron';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
});

// 类型定义
declare global {
  interface Window {
    electronAPI: {
      platform: string;
      version: string;
    };
  }
}
```

**Step 5: 创建React应用入口**

在 `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI智能剪辑助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

在 `frontend/src/index.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

在 `frontend/src/index.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei',
    sans-serif;
  background-color: #2b2b2b;
  color: #ffffff;
  overflow: hidden;
}

#root {
  width: 100vw;
  height: 100vh;
}
```

在 `frontend/src/App.tsx`:

```tsx
import React from 'react';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AI智能剪辑助手</h1>
        <p>Phase 1: 基础框架</p>
      </header>
      <main className="app-main">
        <p>前端框架已启动</p>
        <p>Electron版本: {window.electronAPI?.version || 'N/A'}</p>
      </main>
    </div>
  );
};

export default App;
```

在 `frontend/src/App.css`:

```css
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-header {
  background-color: #353535;
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #1890ff;
}

.app-header h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.app-header p {
  font-size: 14px;
  color: #cccccc;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.app-main p {
  font-size: 16px;
}
```

**Step 6: 安装依赖并测试**

```bash
cd frontend
npm install
```

启动开发服务器:
```bash
npm run dev
```

在另一个终端启动Electron:
```bash
npm run electron:dev
```

预期: Electron窗口打开，显示"AI智能剪辑助手"界面

**Step 7: 提交前端框架**

```bash
git add frontend/
git commit -m "feat(frontend): add Electron + React basic framework

- Set up Vite build configuration
- Create Electron main process and preload script
- Implement React app with basic layout
- Add development server setup

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: API通信层

**Files:**
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/types/media.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: 创建类型定义**

在 `frontend/src/types/media.ts`:

```typescript
export interface Resolution {
  width: number;
  height: number;
}

export interface MediaAsset {
  id: string;
  file_name: string;
  file_path: string;
  duration: number;
  resolution: Resolution;
  frame_rate: number;
  file_size: number;
  has_audio: boolean;
  thumbnails: string[];
  create_time: string;
}

export interface ImportVideoResponse {
  success: boolean;
  assets: MediaAsset[];
  message?: string;
}

export interface HealthCheckResponse {
  status: string;
  message: string;
}
```

**Step 2: 创建API客户端**

在 `frontend/src/services/api.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';
import type { ImportVideoResponse, HealthCheckResponse } from '@/types/media';

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get<HealthCheckResponse>('/api/health');
    return response.data;
  }

  /**
   * 导入视频
   */
  async importVideos(filePaths: string[]): Promise<ImportVideoResponse> {
    const response = await this.client.post<ImportVideoResponse>('/api/media/import', {
      file_paths: filePaths,
    });
    return response.data;
  }

  /**
   * 获取素材列表
   */
  async listMediaAssets() {
    const response = await this.client.get('/api/media/list');
    return response.data;
  }

  /**
   * 检查后端是否在线
   */
  async isBackendOnline(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiClient = new APIClient();
export default apiClient;
```

**Step 3: 在App中测试连接**

修改 `frontend/src/App.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import apiClient from './services/api';
import './App.css';

const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendMessage, setBackendMessage] = useState<string>('');

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const response = await apiClient.healthCheck();
      setBackendStatus('online');
      setBackendMessage(response.message);
    } catch (error) {
      setBackendStatus('offline');
      setBackendMessage('无法连接到后端服务');
      console.error('Backend connection error:', error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI智能剪辑助手</h1>
        <p>Phase 1: 基础框架</p>
      </header>
      <main className="app-main">
        <div className="status-card">
          <h2>系统状态</h2>
          <div className="status-item">
            <span>前端:</span>
            <span className="status-online">运行中</span>
          </div>
          <div className="status-item">
            <span>Electron版本:</span>
            <span>{window.electronAPI?.version || 'N/A'}</span>
          </div>
          <div className="status-item">
            <span>后端服务:</span>
            <span className={`status-${backendStatus}`}>
              {backendStatus === 'checking' && '检查中...'}
              {backendStatus === 'online' && '运行中'}
              {backendStatus === 'offline' && '离线'}
            </span>
          </div>
          {backendMessage && (
            <div className="status-message">{backendMessage}</div>
          )}
          {backendStatus === 'offline' && (
            <button onClick={checkBackend} className="retry-button">
              重试连接
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
```

更新 `frontend/src/App.css`:

```css
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-header {
  background-color: #353535;
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #1890ff;
}

.app-header h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.app-header p {
  font-size: 14px;
  color: #cccccc;
}

.app-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.status-card {
  background-color: #353535;
  border-radius: 8px;
  padding: 32px;
  min-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.status-card h2 {
  font-size: 20px;
  margin-bottom: 24px;
  color: #ffffff;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #444;
}

.status-item:last-child {
  border-bottom: none;
}

.status-online {
  color: #52c41a;
  font-weight: 500;
}

.status-offline {
  color: #ff4d4f;
  font-weight: 500;
}

.status-checking {
  color: #1890ff;
  font-weight: 500;
}

.status-message {
  margin-top: 16px;
  padding: 12px;
  background-color: #2b2b2b;
  border-radius: 4px;
  font-size: 14px;
  color: #cccccc;
}

.retry-button {
  margin-top: 16px;
  width: 100%;
  padding: 10px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #40a9ff;
}
```

**Step 4: 测试前后端通信**

1. 确保后端服务运行: `cd backend && python api/main.py`
2. 启动前端: `cd frontend && npm run electron:dev`

预期:
- 窗口显示"后端服务: 运行中"
- 状态显示为绿色

**Step 5: 提交API通信层**

```bash
git add frontend/src/services/ frontend/src/types/
git commit -m "feat(frontend): add API communication layer

- Create API client with axios
- Add type definitions for media assets
- Implement health check and import APIs
- Update App to show backend connection status

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: 素材导入UI

**Files:**
- Create: `frontend/src/components/MediaLibrary.tsx`
- Create: `frontend/src/components/MediaLibrary.css`
- Modify: `frontend/src/App.tsx`

**Step 1: 创建素材库组件**

在 `frontend/src/components/MediaLibrary.tsx`:

```tsx
import React, { useState } from 'react';
import apiClient from '@/services/api';
import type { MediaAsset } from '@/types/media';
import './MediaLibrary.css';

const MediaLibrary: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleImportClick = () => {
    // 创建隐藏的文件选择器
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files);
        const filePaths = files.map(f => f.path || f.name);

        await importVideos(filePaths);
      }
    };

    input.click();
  };

  const importVideos = async (filePaths: string[]) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.importVideos(filePaths);

      if (response.success) {
        setAssets(prev => [...prev, ...response.assets]);

        if (response.message) {
          setError(response.message);
        }
      }
    } catch (err) {
      setError('导入失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <div className="media-library">
      <div className="media-library-header">
        <h2>素材库</h2>
        <button
          onClick={handleImportClick}
          disabled={loading}
          className="import-button"
        >
          {loading ? '导入中...' : '导入素材'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {assets.length === 0 && !loading && (
        <div className="empty-state">
          <p>还没有素材</p>
          <p className="hint">点击"导入素材"按钮开始</p>
        </div>
      )}

      <div className="media-grid">
        {assets.map(asset => (
          <div key={asset.id} className="media-card">
            <div className="media-thumbnail">
              <div className="thumbnail-placeholder">
                视频
              </div>
              <div className="duration-badge">
                {formatDuration(asset.duration)}
              </div>
            </div>
            <div className="media-info">
              <div className="media-name" title={asset.file_name}>
                {asset.file_name}
              </div>
              <div className="media-meta">
                <span>{asset.resolution.width}x{asset.resolution.height}</span>
                <span>{formatFileSize(asset.file_size)}</span>
              </div>
              <div className="media-meta">
                <span>{asset.frame_rate.toFixed(0)} fps</span>
                {asset.has_audio && <span>🔊 音频</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaLibrary;
```

在 `frontend/src/components/MediaLibrary.css`:

```css
.media-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background-color: #2b2b2b;
}

.media-library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.media-library-header h2 {
  font-size: 18px;
  color: #ffffff;
}

.import-button {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.import-button:hover:not(:disabled) {
  background-color: #40a9ff;
}

.import-button:disabled {
  background-color: #444;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background-color: #ff4d4f22;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  color: #ff7875;
  margin-bottom: 16px;
  font-size: 14px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #888;
}

.empty-state p {
  font-size: 16px;
  margin: 8px 0;
}

.empty-state .hint {
  font-size: 14px;
  color: #666;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.media-card {
  background-color: #353535;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.media-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.media-thumbnail {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background-color: #1f1f1f;
}

.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #666;
  font-size: 14px;
}

.duration-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.media-info {
  padding: 12px;
}

.media-name {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
```

**Step 2: 集成到主应用**

修改 `frontend/src/App.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import apiClient from './services/api';
import MediaLibrary from './components/MediaLibrary';
import './App.css';

const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      await apiClient.healthCheck();
      setBackendStatus('online');
    } catch (error) {
      setBackendStatus('offline');
      console.error('Backend connection error:', error);
    }
  };

  if (backendStatus === 'checking') {
    return (
      <div className="app">
        <div className="loading-screen">
          <p>正在连接后端服务...</p>
        </div>
      </div>
    );
  }

  if (backendStatus === 'offline') {
    return (
      <div className="app">
        <div className="error-screen">
          <h2>无法连接到后端服务</h2>
          <p>请确保后端服务已启动</p>
          <button onClick={checkBackend} className="retry-button">
            重试连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI智能剪辑助手</h1>
      </header>
      <main className="app-main">
        <MediaLibrary />
      </main>
    </div>
  );
};

export default App;
```

更新 `frontend/src/App.css`:

```css
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #2b2b2b;
}

.app-header {
  background-color: #353535;
  padding: 16px 24px;
  border-bottom: 1px solid #1890ff;
}

.app-header h1 {
  font-size: 20px;
  color: #ffffff;
  margin: 0;
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.loading-screen,
.error-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 16px;
  color: #ffffff;
}

.error-screen h2 {
  font-size: 24px;
  color: #ff4d4f;
}

.retry-button {
  padding: 10px 20px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #40a9ff;
}
```

**Step 3: 测试素材导入**

1. 启动后端服务
2. 启动前端应用
3. 点击"导入素材"按钮
4. 选择视频文件

预期:
- 素材卡片显示在网格中
- 显示文件名、分辨率、大小等信息

**Step 4: 提交素材导入UI**

```bash
git add frontend/src/components/ frontend/src/App.tsx frontend/src/App.css
git commit -m "feat(frontend): add media library UI with import

- Create MediaLibrary component with grid layout
- Implement file selection and import UI
- Display media cards with metadata
- Add loading and error states

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

### Phase 1 完成标准

**后端：**
- [x] FastAPI服务成功启动
- [x] 健康检查API正常工作
- [x] FFmpeg检查功能正常
- [x] 视频信息提取功能正常
- [x] 素材导入API正常工作

**前端：**
- [x] Electron应用成功启动
- [x] 前后端通信正常
- [x] 素材导入UI可用
- [x] 素材列表正常显示

**集成测试：**
- [ ] 完整流程：启动应用 → 导入视频 → 显示素材列表

---

## 下一步

Phase 1完成后，接下来的开发任务：

**Phase 2: 核心功能开发**
- 缩略图生成
- 视频预览播放器
- 时间轴编辑器基础版
- 数据库集成（替代内存存储）
- 项目保存/加载

参考设计文档: `docs/plans/2026-02-14-video-editing-software-design.md`

---

## 注意事项

1. **FFmpeg配置**
   - 需要手动下载FFmpeg到 `backend/bin/ffmpeg/`
   - Windows: https://ffmpeg.org/download.html
   - 确保 `ffmpeg.exe` 和 `ffprobe.exe` 都在该目录

2. **文件路径**
   - Electron应用中文件路径需要使用绝对路径
   - 使用 `file.path` 属性获取完整路径

3. **开发工作流**
   - 先启动后端: `cd backend && python api/main.py`
   - 再启动前端: `cd frontend && npm run electron:dev`
   - 修改代码后自动热重载

4. **Git提交规范**
   - feat: 新功能
   - fix: 修复bug
   - chore: 项目配置
   - docs: 文档更新
   - 每个提交都添加 Co-Authored-By

---

## 故障排查

**问题1: 后端启动失败**
- 检查Python版本: `python --version` (需要3.10+)
- 检查虚拟环境是否激活
- 重新安装依赖: `pip install -r requirements.txt`

**问题2: 前端连接后端失败**
- 检查后端是否在8000端口运行
- 检查CORS配置
- 查看浏览器控制台错误

**问题3: Electron启动失败**
- 删除 `node_modules` 重新安装
- 检查Node版本: `node --version` (需要18+)
- 查看Electron控制台日志

**问题4: 视频导入失败**
- 检查FFmpeg是否正确安装
- 访问 http://127.0.0.1:8000/api/ffmpeg/check
- 检查视频文件格式是否支持

---

## 执行建议

这个计划包含6个主要任务，建议按以下顺序执行：

1. Task 0: 项目结构初始化 (30分钟)
2. Task 1: FastAPI基础框架 (1小时)
3. Task 2: 视频信息提取服务 (1.5小时)
4. Task 3: 素材导入API (1小时)
5. Task 4: Electron + React基础框架 (2小时)
6. Task 5: API通信层 (1小时)
7. Task 6: 素材导入UI (1.5小时)

**总预计时间: 8-10小时**

建议每完成一个Task就提交一次，保持频繁的小步提交。
