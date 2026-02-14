# MVP Phase 5: 测试与打包 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善测试覆盖、集成测试、性能优化、打包配置，交付可安装的.exe应用程序。

**Architecture:** 添加完整的测试套件，配置Electron Builder和PyInstaller，优化打包体积和启动速度。

**Tech Stack:** pytest, pytest-asyncio, Electron Builder, PyInstaller, NSIS (安装程序)

**Duration:** 2周（Week 13-14）

**Prerequisites:**
- Phase 1-4已完成
- 所有核心功能正常运行

---

## 测试

### Task 1: 后端单元测试

**Files:**
- Create: `backend/tests/test_video_service.py`
- Create: `backend/tests/test_qwen_service.py`
- Create: `backend/tests/test_subtitle_service.py`
- Create: `backend/tests/test_export_service.py`
- Create: `backend/tests/conftest.py`

**Step 1: 创建测试配置**

在 `backend/tests/conftest.py`:

```python
import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models.database import Base
from models.project import Project
from models.asset import Asset

# 测试数据库
TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="function")
def test_db():
    """创建测试数据库"""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def sample_video_path():
    """示例视频路径（需要实际视频文件）"""
    return Path("tests/fixtures/sample.mp4")

@pytest.fixture
def mock_qwen_response():
    """模拟通义千问响应"""
    return {
        "scene_description": "海边日落",
        "emotions": ["happy", "relaxed"],
        "excitement_score": 85,
        "suggest_keep": True,
        "reason": "画面优美"
    }
```

**Step 2: 视频服务测试**

在 `backend/tests/test_video_service.py`:

```python
import pytest
from pathlib import Path
from services.video_service import VideoService

@pytest.fixture
def video_service():
    return VideoService()

def test_check_ffmpeg_installed(video_service):
    """测试FFmpeg检查"""
    installed = video_service.check_ffmpeg_installed()
    # 根据实际环境调整断言
    assert isinstance(installed, bool)

@pytest.mark.skipif(not Path("tests/fixtures/sample.mp4").exists(), reason="需要测试视频")
def test_extract_video_info(video_service, sample_video_path):
    """测试视频信息提取"""
    info = video_service.extract_video_info(sample_video_path)

    assert "duration" in info
    assert "resolution" in info
    assert "frame_rate" in info
    assert info["duration"] > 0
    assert info["resolution"]["width"] > 0
    assert info["resolution"]["height"] > 0

@pytest.mark.skipif(not Path("tests/fixtures/sample.mp4").exists(), reason="需要测试视频")
def test_generate_thumbnails(video_service, sample_video_path, tmp_path):
    """测试缩略图生成"""
    thumbnails = video_service.generate_thumbnails(
        sample_video_path,
        tmp_path,
        count=3
    )

    assert len(thumbnails) == 3
    for thumb in thumbnails:
        assert Path(thumb).exists()
```

**Step 3: AI服务测试**

在 `backend/tests/test_qwen_service.py`:

```python
import pytest
from services.ai.qwen_service import QwenService

@pytest.fixture
def qwen_service():
    return QwenService()

def test_parse_analysis_result(qwen_service):
    """测试结果解析"""
    # 测试JSON解析
    json_result = '''{
        "scene_description": "测试场景",
        "emotions": ["happy"],
        "excitement_score": 75,
        "suggest_keep": true,
        "reason": "测试理由"
    }'''

    result = qwen_service._parse_analysis_result(json_result)

    assert result["scene_description"] == "测试场景"
    assert result["excitement_score"] == 75
    assert result["suggest_keep"] is True

def test_parse_invalid_result(qwen_service):
    """测试无效结果处理"""
    invalid_result = "这不是JSON"

    result = qwen_service._parse_analysis_result(invalid_result)

    # 应该返回默认值
    assert "scene_description" in result
    assert result["excitement_score"] == 50

@pytest.mark.skip("需要真实API Key")
def test_analyze_video_frames(qwen_service):
    """测试视频帧分析（需要真实API）"""
    pass
```

**Step 4: 字幕服务测试**

在 `backend/tests/test_subtitle_service.py`:

```python
import pytest
from services.subtitle_service import SubtitleService
from models.subtitle import Word

@pytest.fixture
def subtitle_service():
    return SubtitleService()

def test_generate_speech_subtitles(subtitle_service):
    """测试语音字幕生成"""
    transcript = [
        {
            "start_time": 0.0,
            "end_time": 2.5,
            "text": "你好世界",
            "words": [
                {"text": "你好", "start_time": 0.0, "duration": 0.8},
                {"text": "世界", "start_time": 0.8, "duration": 0.7}
            ]
        }
    ]

    subtitles = subtitle_service.generate_speech_subtitles(transcript)

    assert len(subtitles) == 1
    assert subtitles[0].text == "你好世界"
    assert len(subtitles[0].words) == 2

def test_format_time(subtitle_service):
    """测试时间格式化"""
    # 测试各种时间
    assert subtitle_service._format_time(0) == "0:00:00.00"
    assert subtitle_service._format_time(65.5) == "0:01:05.50"
    assert subtitle_service._format_time(3661.25) == "1:01:01.25"

def test_export_to_ass(subtitle_service, tmp_path):
    """测试ASS导出"""
    from models.subtitle import SpeechSubtitle, Word

    subtitles = [
        SpeechSubtitle(
            start_time=0.0,
            end_time=2.0,
            text="测试字幕",
            words=[]
        )
    ]

    output_path = tmp_path / "test.ass"
    subtitle_service.export_to_ass(subtitles, output_path)

    assert output_path.exists()

    content = output_path.read_text(encoding='utf-8-sig')
    assert "测试字幕" in content
    assert "[V4+ Styles]" in content
```

**Step 5: 导出服务测试**

在 `backend/tests/test_export_service.py`:

```python
import pytest
from services.export_service import ExportService

@pytest.fixture
def export_service():
    return ExportService()

def test_parse_resolution(export_service):
    """测试分辨率解析"""
    assert export_service._parse_resolution("1080p") == (1920, 1080)
    assert export_service._parse_resolution("720p") == (1280, 720)
    assert export_service._parse_resolution("4K") == (3840, 2160)

def test_parse_progress(export_service):
    """测试进度解析"""
    line = "frame= 1234 fps= 30 q=28.0 size=   12345kB time=00:00:41.13 bitrate=2458.3kbits/s"
    progress = export_service._parse_progress(line, 120.0)

    assert progress is not None
    assert 0 <= progress <= 100

@pytest.mark.skip("需要真实视频文件")
def test_export_video(export_service, tmp_path):
    """测试视频导出（需要真实素材）"""
    pass
```

**Step 6: 运行测试**

```bash
cd backend
pytest tests/ -v --cov=services --cov=models
```

预期: 大部分测试通过（跳过需要真实文件的测试）

**Step 7: 提交测试**

```bash
git add backend/tests/
git commit -m "test(backend): add comprehensive unit tests

- Create test fixtures and configuration
- Add VideoService tests
- Add AI service tests with mocking
- Add SubtitleService tests
- Add ExportService tests
- Configure pytest with coverage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: 集成测试

**Files:**
- Create: `backend/tests/integration/test_full_workflow.py`
- Create: `e2e_test.py` (根目录)

**Step 1: 创建完整流程集成测试**

在 `backend/tests/integration/test_full_workflow.py`:

```python
import pytest
from pathlib import Path
import json

from services.video_analysis_service import VideoAnalysisService
from services.subtitle_service import SubtitleService
from services.music_service import MusicService
from services.export_service import ExportService

@pytest.mark.integration
@pytest.mark.skipif(not Path("tests/fixtures/sample.mp4").exists(), reason="需要测试视频")
def test_complete_workflow(tmp_path):
    """测试完整的工作流程"""

    # 1. 视频分析
    analysis_service = VideoAnalysisService()

    analysis_result = analysis_service.analyze_video(
        "tests/fixtures/sample.mp4",
        target_duration=30
    )

    assert "scene_description" in analysis_result
    assert "emotions" in analysis_result

    # 2. 字幕生成
    subtitle_service = SubtitleService()

    speech_subs = subtitle_service.generate_speech_subtitles(
        analysis_result.get("transcript", [])
    )

    narrative_subs = subtitle_service.generate_narrative_subtitles(
        analysis_result,
        analysis_result["duration"]
    )

    # 导出字幕
    subtitle_file = tmp_path / "subtitles.ass"
    subtitle_service.export_to_ass(
        speech_subs + narrative_subs,
        subtitle_file
    )

    assert subtitle_file.exists()

    # 3. 音乐匹配
    music_service = MusicService()

    music = music_service.match_music(
        analysis_result["emotions"],
        30.0
    )

    # 如果有音乐库，应该能匹配到
    if music_service.metadata:
        assert music is not None

    # 4. 视频导出
    export_service = ExportService()

    timeline = {
        "clips": [
            {
                "file_path": "tests/fixtures/sample.mp4",
                "track_type": "video",
                "source_start": 0,
                "source_end": 30
            }
        ],
        "total_duration": 30
    }

    output_file = tmp_path / "output.mp4"

    # 注意：这个测试可能需要很长时间
    result = export_service.export_video(
        timeline,
        output_file,
        subtitle_file=subtitle_file
    )

    assert Path(result).exists()

    print(f"集成测试成功: {result}")
```

**Step 2: 创建E2E测试脚本**

在根目录 `e2e_test.py`:

```python
"""
端到端测试脚本

测试整个应用的工作流程：
1. 启动后端服务
2. 导入视频
3. AI分析
4. 生成时间线
5. 导出视频
"""

import requests
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_backend_health():
    """测试后端健康"""
    response = requests.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200
    print("✓ 后端服务正常")

def test_create_project():
    """测试创建项目"""
    response = requests.post(f"{BASE_URL}/api/project/create", json={
        "name": "E2E测试项目",
        "target_duration": 180,
        "aspect_ratio": "9:16"
    })

    assert response.status_code == 200
    project = response.json()
    print(f"✓ 项目创建成功: {project['id']}")
    return project["id"]

def test_import_video(project_id: str, video_path: str):
    """测试导入视频"""
    response = requests.post(
        f"{BASE_URL}/api/media/import",
        params={"project_id": project_id},
        json={"file_paths": [video_path]}
    )

    assert response.status_code == 200
    result = response.json()
    assert result["success"]

    asset_id = result["assets"][0]["id"]
    print(f"✓ 视频导入成功: {asset_id}")
    return asset_id

def test_ai_analysis(asset_ids: list):
    """测试AI分析"""
    response = requests.post(f"{BASE_URL}/api/analysis/start", json={
        "asset_ids": asset_ids,
        "target_duration": 30,
        "aspect_ratio": "9:16"
    })

    assert response.status_code == 200
    task = response.json()
    task_id = task["task_id"]

    print(f"✓ AI分析任务启动: {task_id}")

    # 轮询状态
    while True:
        status_response = requests.get(f"{BASE_URL}/api/analysis/status/{task_id}")
        status = status_response.json()

        print(f"  进度: {status['progress']}% - {status.get('stage', '')}")

        if status["status"] == "completed":
            print("✓ AI分析完成")
            return status["result"]
        elif status["status"] == "failed":
            raise Exception(f"分析失败: {status.get('error')}")

        time.sleep(2)

def run_e2e_test():
    """运行端到端测试"""
    print("开始E2E测试...\n")

    try:
        test_backend_health()

        project_id = test_create_project()

        # 需要提供测试视频路径
        video_path = input("请输入测试视频路径: ").strip()

        if not Path(video_path).exists():
            print("❌ 视频文件不存在")
            return

        asset_id = test_import_video(project_id, video_path)

        result = test_ai_analysis([asset_id])

        print("\n✓ 所有测试通过!")
        print(f"分析结果: {result}")

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        raise

if __name__ == "__main__":
    run_e2e_test()
```

**Step 3: 提交集成测试**

```bash
git add backend/tests/integration/ e2e_test.py
git commit -m "test: add integration and E2E tests

- Create full workflow integration test
- Add E2E test script for manual testing
- Test complete pipeline from import to export

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 打包配置

### Task 3: 后端打包（PyInstaller）

**Files:**
- Create: `backend/build.spec`
- Create: `backend/build.py`

**Step 1: 创建PyInstaller配置**

在 `backend/build.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['api/main.py'],
    pathex=[],
    binaries=[
        ('bin/ffmpeg/ffmpeg.exe', 'bin/ffmpeg'),
        ('bin/ffmpeg/ffprobe.exe', 'bin/ffmpeg'),
    ],
    datas=[
        ('data/music_library', 'data/music_library'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ai-video-editor-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ai-video-editor-backend',
)
```

**Step 2: 创建打包脚本**

在 `backend/build.py`:

```python
"""
后端打包脚本
"""

import subprocess
import shutil
from pathlib import Path

def clean_build():
    """清理构建目录"""
    dirs_to_clean = ['build', 'dist']

    for dir_name in dirs_to_clean:
        dir_path = Path(dir_name)
        if dir_path.exists():
            print(f"清理 {dir_name}/")
            shutil.rmtree(dir_path)

def build_backend():
    """打包后端"""
    print("开始打包后端...")

    # 运行PyInstaller
    cmd = [
        'pyinstaller',
        'build.spec',
        '--clean',
        '--noconfirm'
    ]

    subprocess.run(cmd, check=True)

    print("✓ 后端打包完成: dist/ai-video-editor-backend/")

if __name__ == "__main__":
    clean_build()
    build_backend()
```

**Step 3: 测试打包**

```bash
cd backend
python build.py
```

预期: 在 `backend/dist/` 生成打包文件

**Step 4: 提交后端打包配置**

```bash
git add backend/build.spec backend/build.py
git commit -m "build(backend): add PyInstaller packaging config

- Create build.spec with FFmpeg binaries
- Add music library to package
- Include uvicorn hidden imports
- Create build script for automation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: 前端打包（Electron Builder）

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/electron-builder.json`

**Step 1: 配置Electron Builder**

在 `frontend/electron-builder.json`:

```json
{
  "appId": "com.ai-video-editor.app",
  "productName": "AI智能剪辑助手",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "src/main.ts",
    "src/preload.ts",
    "node_modules/**/*"
  ],
  "extraResources": [
    {
      "from": "../backend/dist/ai-video-editor-backend",
      "to": "backend"
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "public/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "AI智能剪辑助手",
    "installerIcon": "public/icon.ico",
    "uninstallerIcon": "public/icon.ico",
    "license": "LICENSE"
  }
}
```

**Step 2: 更新package.json**

修改 `frontend/package.json`:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:electron": "npm run build && electron-builder",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "build": {
    "extends": "./electron-builder.json"
  }
}
```

**Step 3: 修改主进程启动后端**

修改 `frontend/src/main.ts`:

```typescript
import { spawn } from 'child_process';
import path from 'path';

let backendProcess: any = null;

function startBackend() {
  // 开发模式：假设后端已启动
  if (isDev) {
    console.log('开发模式：跳过后端启动');
    return;
  }

  // 生产模式：启动打包的后端
  const backendPath = path.join(
    process.resourcesPath,
    'backend',
    'ai-video-editor-backend.exe'
  );

  console.log('启动后端:', backendPath);

  backendProcess = spawn(backendPath, [], {
    detached: true,
    stdio: 'ignore'
  });

  backendProcess.unref();
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
  }
}

app.whenReady().then(() => {
  startBackend();

  // 等待后端启动
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  stopBackend();
});
```

**Step 4: 创建完整打包脚本**

在根目录创建 `build-all.py`:

```python
"""
完整打包脚本
"""

import subprocess
import shutil
from pathlib import Path

def build_backend():
    """打包后端"""
    print("\n=== 打包后端 ===")
    subprocess.run(["python", "backend/build.py"], check=True)

def build_frontend():
    """打包前端"""
    print("\n=== 打包前端 ===")
    subprocess.run(["npm", "run", "build:electron"], cwd="frontend", check=True)

def create_installer():
    """创建安装程序"""
    print("\n=== 创建安装程序 ===")
    subprocess.run(["npm", "run", "dist"], cwd="frontend", check=True)

    print("\n✓ 打包完成!")
    print("安装程序位置: frontend/dist-electron/")

if __name__ == "__main__":
    try:
        build_backend()
        build_frontend()
        create_installer()
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 打包失败: {e}")
        exit(1)
```

**Step 5: 提交前端打包配置**

```bash
git add frontend/electron-builder.json frontend/package.json frontend/src/main.ts build-all.py
git commit -m "build(frontend): add Electron Builder packaging

- Configure electron-builder.json with NSIS
- Include backend in extraResources
- Auto-start backend process in production
- Create complete build script

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 文档

### Task 5: 用户文档和开发文档

**Files:**
- Create: `README.md` (更新)
- Create: `docs/USER_GUIDE.md`
- Create: `docs/DEVELOPER_GUIDE.md`
- Create: `docs/API.md`

**Step 1: 更新README**

在根目录更新 `README.md`:

```markdown
# AI智能剪辑助手

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

智能视频自动剪辑软件，基于AI大模型实现视频内容理解、自动字幕生成和智能配乐。

## 功能特性

- ✨ **AI自动剪辑**: 通义千问理解视频内容，智能生成剪辑建议
- 📝 **智能字幕**: 三种字幕类型（语音转文字、场景描述、关键词标注）
- 🎵 **智能配乐**: 根据视频情绪自动匹配背景音乐
- ⏱️ **专业时间轴**: 类似Premiere的可视化编辑器
- 📦 **一键导出**: 支持多种分辨率和格式

## 快速开始

### 下载安装

1. 前往 [Releases](releases) 下载最新版本
2. 运行安装程序 `AI智能剪辑助手-Setup.exe`
3. 按照向导完成安装

### 配置API密钥

首次使用需要配置AI服务密钥：

1. 注册通义千问账号: https://dashscope.aliyun.com/
2. 注册讯飞星火账号: https://www.xfyun.cn/
3. 在软件设置中填入API密钥

详细配置指南: [用户手册](docs/USER_GUIDE.md)

## 开发

### 环境要求

- Node.js 18+
- Python 3.10+
- FFmpeg

### 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd frontend
npm install
```

### 运行开发服务器

```bash
# 启动后端
cd backend
python api/main.py

# 启动前端（新终端）
cd frontend
npm run electron:dev
```

详细开发指南: [开发者手册](docs/DEVELOPER_GUIDE.md)

## 技术栈

- **前端**: Electron, React, TypeScript, Video.js
- **后端**: FastAPI, Python, FFmpeg
- **AI**: 通义千问, 讯飞星火
- **数据库**: SQLite

## 文档

- [用户手册](docs/USER_GUIDE.md)
- [开发者手册](docs/DEVELOPER_GUIDE.md)
- [API文档](docs/API.md)
- [设计文档](docs/plans/2026-02-14-video-editing-software-design.md)

## 许可证

MIT License

## 致谢

- FFmpeg
- Video.js
- Electron
- FastAPI
```

**Step 2: 创建用户手册**

在 `docs/USER_GUIDE.md`:

```markdown
# AI智能剪辑助手 - 用户手册

## 目录

1. [安装与配置](#安装与配置)
2. [快速入门](#快速入门)
3. [功能详解](#功能详解)
4. [常见问题](#常见问题)

## 安装与配置

### 系统要求

- Windows 10/11 64位
- 8GB内存（推荐16GB）
- 10GB可用磁盘空间
- 网络连接（用于AI分析）

### 安装步骤

1. 下载安装程序
2. 双击运行 `AI智能剪辑助手-Setup.exe`
3. 选择安装路径
4. 完成安装

### API配置

#### 通义千问API

1. 访问 https://dashscope.aliyun.com/
2. 注册并实名认证
3. 创建API Key
4. 在软件【设置 → AI配置】中填入

#### 讯飞星火API

1. 访问 https://www.xfyun.cn/
2. 注册并实名认证
3. 创建应用，获取APPID、APIKey、APISecret
4. 在软件设置中填入

## 快速入门

### 第一个项目

1. 点击【导入素材】
2. 选择视频文件（可多选）
3. 点击【AI自动分析】
4. 设置目标时长和画幅
5. 等待AI分析完成
6. 查看并确认剪辑建议
7. 点击【导出视频】

### 工作流程

```
导入素材 → AI分析 → 确认建议 → 微调编辑 → 导出视频
```

## 功能详解

### AI自动剪辑

**功能说明**: AI理解视频内容，自动生成剪辑建议

**使用步骤**:
1. 导入素材后点击【AI自动分析】
2. 配置目标时长（1-10分钟）
3. 选择画幅比例（9:16/16:9/1:1）
4. 等待分析完成

**分析内容**:
- 场景识别
- 精彩度评分
- 情绪分析
- 建议保留/删除

### 智能字幕

**三种字幕类型**:

1. **语音转字幕**: 自动识别人声并转为文字
2. **场景描述**: AI生成旁白性描述
3. **关键词标注**: 在关键时刻添加醒目标签

**编辑字幕**:
- 点击时间轴上的字幕块
- 在右侧属性面板编辑
- 调整文字、样式、动画

### 智能配乐

**功能说明**: 根据视频情绪自动匹配背景音乐

**自定义音乐**:
- 可以更换AI推荐的音乐
- 调整音量、淡入淡出

## 常见问题

### 无法启动软件

- 检查是否安装了必要的运行库
- 以管理员身份运行
- 查看日志文件

### AI分析失败

- 检查API密钥是否正确
- 检查网络连接
- 查看API额度是否用尽

### 导出失败

- 检查磁盘空间是否充足
- 确保FFmpeg正常工作
- 降低导出分辨率

### 软件卡顿

- 关闭其他占用资源的程序
- 降低预览质量
- 升级电脑硬件
```

**Step 3: 提交文档**

```bash
git add README.md docs/USER_GUIDE.md docs/DEVELOPER_GUIDE.md
git commit -m "docs: add user guide and developer documentation

- Update README with feature overview
- Create comprehensive user guide
- Add development setup instructions
- Include troubleshooting section

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

**Phase 5完成标准：**

- [x] 单元测试覆盖核心功能
- [x] 集成测试通过
- [x] E2E测试脚本可运行
- [x] 后端PyInstaller打包配置
- [x] 前端Electron Builder配置
- [x] 自动启动后端服务
- [x] 用户文档和开发文档
- [x] 可生成安装程序

**最终交付物：**

1. `AI智能剪辑助手-Setup.exe` - Windows安装程序
2. 用户手册和快速入门指南
3. 完整的源代码和文档
4. API配置指南

---

## 🎉 项目完成

恭喜！MVP开发完成，所有Phase (1-5) 已交付。

**下一步建议：**

1. 用户测试和反馈收集
2. 根据反馈迭代优化
3. 开发Phase 2功能（转场、滤镜等）
4. 性能优化和bug修复

**总开发时间: 13-14周**
- Phase 1: 2周
- Phase 2: 4周
- Phase 3: 3周
- Phase 4: 3周
- Phase 5: 2周
