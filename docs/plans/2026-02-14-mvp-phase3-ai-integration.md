# MVP Phase 3: AI功能集成 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 集成通义千问和讯飞星火API，实现AI视频分析、智能剪辑建议、自动字幕生成和音乐匹配功能。

**Architecture:** 后端集成AI SDK，实现异步任务处理。前端实现AI分析UI、进度显示和结果展示。

**Tech Stack:** 通义千问SDK (dashscope), 讯飞星火SDK, Celery (任务队列), WebSocket (进度推送), librosa (音频分析)

**Duration:** 3周（Week 7-9）

**Prerequisites:**
- Phase 1-2已完成
- 通义千问API Key已配置
- 讯飞星火API Key已配置

---

## AI SDK集成

### Task 1: 通义千问视频理解集成

**Files:**
- Create: `backend/services/ai/qwen_service.py`
- Create: `backend/services/ai/__init__.py`
- Create: `backend/requirements.txt` (更新)

**Step 1: 安装通义千问SDK**

更新 `backend/requirements.txt`:

```
dashscope==1.14.0
```

```bash
cd backend
pip install dashscope
```

**Step 2: 创建通义千问服务**

在 `backend/services/ai/__init__.py`:

```python
# AI services package
```

在 `backend/services/ai/qwen_service.py`:

```python
import dashscope
from dashscope import MultiModalConversation
from pathlib import Path
from typing import List, Dict, Any
import base64
import logging

from config import QWEN_API_KEY, QWEN_MODEL

logger = logging.getLogger(__name__)

class QwenService:
    """通义千问视频理解服务"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or QWEN_API_KEY
        dashscope.api_key = self.api_key

    def analyze_video_frames(
        self,
        frame_paths: List[str],
        target_duration: int = None
    ) -> Dict[str, Any]:
        """
        分析视频关键帧

        Args:
            frame_paths: 关键帧图片路径列表
            target_duration: 目标剪辑时长（秒）

        Returns:
            分析结果字典
        """
        # 构建消息
        messages = self._build_analysis_prompt(frame_paths, target_duration)

        try:
            response = MultiModalConversation.call(
                model=QWEN_MODEL,
                messages=messages
            )

            if response.status_code == 200:
                result = response.output.choices[0].message.content
                logger.info(f"视频分析成功: {len(frame_paths)}帧")
                return self._parse_analysis_result(result)
            else:
                logger.error(f"通义千问API调用失败: {response.message}")
                raise RuntimeError(f"API调用失败: {response.message}")

        except Exception as e:
            logger.error(f"视频分析异常: {str(e)}")
            raise

    def _build_analysis_prompt(
        self,
        frame_paths: List[str],
        target_duration: int = None
    ) -> List[Dict]:
        """构建分析提示词"""
        # 将图片转为base64
        image_contents = []
        for path in frame_paths[:10]:  # 最多10张图片
            with open(path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
                image_contents.append({
                    "image": f"data:image/jpeg;base64,{image_data}"
                })

        # 构建提示词
        prompt = f"""你是一个专业的视频内容分析师。我给你一段视频的关键帧图像序列，请分析以下内容：

1. **场景描述**：这段视频主要展示了什么场景？（如"海边日落"、"人物特写"、"城市街景"等）

2. **情绪氛围**：整体情绪和氛围是什么？用标签表示（如happy, relaxed, excited, heartwarming, sad等）

3. **精彩度评分**：这段内容的可看性如何？评分0-100，考虑：
   - 画面美感
   - 动作丰富度
   - 情绪饱满度
   - 内容吸引力

4. **剪辑建议**：是否建议保留这段内容？给出理由。

{"目标：剪辑成" + str(target_duration // 60) + "分钟左右的生活类短视频。" if target_duration else ""}

请以JSON格式返回：
{{
  "scene_description": "场景描述",
  "emotions": ["标签1", "标签2"],
  "excitement_score": 85,
  "suggest_keep": true,
  "reason": "建议保留或删除的理由"
}}"""

        messages = [
            {
                "role": "user",
                "content": image_contents + [{"text": prompt}]
            }
        ]

        return messages

    def _parse_analysis_result(self, result: str) -> Dict[str, Any]:
        """解析AI返回结果"""
        import json
        import re

        # 尝试提取JSON
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        # 如果无法解析，返回默认值
        logger.warning(f"无法解析AI返回结果，使用默认值: {result}")
        return {
            "scene_description": "未知场景",
            "emotions": ["neutral"],
            "excitement_score": 50,
            "suggest_keep": True,
            "reason": "分析结果解析失败"
        }

    def generate_narrative_subtitle(
        self,
        scene_description: str,
        emotion: str,
        trigger: str
    ) -> str:
        """
        生成场景描述字幕

        Args:
            scene_description: 场景描述
            emotion: 情绪标签
            trigger: 触发时机 (scene_change/emotion_peak)

        Returns:
            字幕文本
        """
        prompt = f"""你是一个视频字幕撰写专家。

场景：{scene_description}
情绪：{emotion}
时机：{"场景转换" if trigger == "scene_change" else "情绪高点"}

请生成一句简短、有趣的旁白性字幕（10-20字），类似抖音风格。

示例：
- "此时的我还不知道接下来会发生什么..."
- "名场面来了"
- "这一刻，时间仿佛静止了"
- "没想到吧"

只返回字幕文本，不要其他内容。"""

        messages = [{"role": "user", "content": prompt}]

        try:
            response = MultiModalConversation.call(
                model=QWEN_MODEL,
                messages=messages
            )

            if response.status_code == 200:
                text = response.output.choices[0].message.content.strip()
                # 去除引号
                text = text.strip('"\'「」')
                return text
            else:
                return "精彩时刻"

        except Exception as e:
            logger.error(f"生成字幕失败: {str(e)}")
            return "精彩时刻"

    def generate_keyword_tag(
        self,
        scene_description: str,
        emotion: str
    ) -> str:
        """
        生成关键词标注

        Args:
            scene_description: 场景描述
            emotion: 情绪标签

        Returns:
            关键词（如"震撼"、"笑死"）
        """
        emotion_keywords = {
            "funny": ["笑死", "哈哈", "绝了"],
            "shocking": ["震撼", "绝了", "牛"],
            "heartwarming": ["❤️", "温馨", "暖"],
            "exciting": ["燃", "🔥", "绝"],
            "beautiful": ["美", "绝美", "✨"]
        }

        keywords = emotion_keywords.get(emotion, ["精彩"])
        return keywords[0]
```

**Step 3: 创建测试**

在 `backend/tests/test_qwen_service.py`:

```python
import pytest
from services.ai.qwen_service import QwenService

@pytest.fixture
def qwen_service():
    return QwenService()

def test_qwen_service_initialization(qwen_service):
    """测试服务初始化"""
    assert qwen_service.api_key is not None

@pytest.mark.skip("需要真实的API Key和图片")
def test_analyze_video_frames(qwen_service):
    """测试视频帧分析"""
    frame_paths = ["path/to/frame1.jpg"]
    result = qwen_service.analyze_video_frames(frame_paths)

    assert "scene_description" in result
    assert "excitement_score" in result
```

**Step 4: 提交通义千问集成**

```bash
git add backend/services/ai/ backend/requirements.txt backend/tests/
git commit -m "feat(backend): integrate Qwen AI for video analysis

- Install dashscope SDK
- Create QwenService for video frame analysis
- Implement narrative subtitle generation
- Add keyword tag generation
- Parse AI responses to structured data

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: 讯飞星火语音识别集成

**Files:**
- Create: `backend/services/ai/xunfei_service.py`
- Update: `backend/requirements.txt`

**Step 1: 安装讯飞SDK**

更新 `backend/requirements.txt`:

```
websocket-client==1.6.0
```

```bash
pip install websocket-client
```

**Step 2: 创建讯飞星火服务**

在 `backend/services/ai/xunfei_service.py`:

```python
import hashlib
import hmac
import base64
import json
from datetime import datetime
from time import mktime
from wsgiref.handlers import format_date_time
from urllib.parse import urlencode, urlparse
import websocket
from pathlib import Path
from typing import List, Dict
import logging

from config import XUNFEI_APPID, XUNFEI_API_KEY, XUNFEI_API_SECRET

logger = logging.getLogger(__name__)

class XunfeiService:
    """讯飞星火语音识别服务"""

    def __init__(self):
        self.appid = XUNFEI_APPID
        self.api_key = XUNFEI_API_KEY
        self.api_secret = XUNFEI_API_SECRET
        self.host = "rtasr.xfyun.cn"
        self.request_line = "GET /v1/ws HTTP/1.1"

    def transcribe_audio(self, audio_path: Path) -> List[Dict[str, any]]:
        """
        语音转文字

        Args:
            audio_path: 音频文件路径

        Returns:
            包含时间戳的文字列表
            [
                {"start_time": 0.5, "end_time": 2.3, "text": "你好"},
                ...
            ]
        """
        if not audio_path.exists():
            raise FileNotFoundError(f"音频文件不存在: {audio_path}")

        # 简化版实现：使用HTTP API（实际项目中应使用WebSocket实时识别）
        # 这里返回模拟数据
        logger.warning("讯飞星火集成为模拟实现，请配置真实API")

        return self._simulate_transcription(audio_path)

    def _simulate_transcription(self, audio_path: Path) -> List[Dict[str, any]]:
        """模拟语音识别（开发用）"""
        # 返回模拟的转录结果
        return [
            {
                "start_time": 0.0,
                "end_time": 2.5,
                "text": "今天天气真不错",
                "words": [
                    {"text": "今天", "start_time": 0.0, "duration": 0.5},
                    {"text": "天气", "start_time": 0.5, "duration": 0.5},
                    {"text": "真", "start_time": 1.0, "duration": 0.3},
                    {"text": "不错", "start_time": 1.3, "duration": 0.7}
                ]
            },
            {
                "start_time": 3.0,
                "end_time": 5.5,
                "text": "适合出去走走",
                "words": [
                    {"text": "适合", "start_time": 3.0, "duration": 0.5},
                    {"text": "出去", "start_time": 3.5, "duration": 0.5},
                    {"text": "走走", "start_time": 4.0, "duration": 0.8}
                ]
            }
        ]

    # TODO: 实现真实的WebSocket连接和实时识别
    # def _create_auth_url(self) -> str:
    #     """创建鉴权URL"""
    #     pass

    # def _on_message(self, ws, message):
    #     """WebSocket消息回调"""
    #     pass
```

**Step 3: 提交讯飞星火集成**

```bash
git add backend/services/ai/xunfei_service.py backend/requirements.txt
git commit -m "feat(backend): integrate Xunfei ASR service

- Create XunfeiService for speech recognition
- Add audio transcription method with timestamps
- Implement simulated transcription for development
- TODO: Real WebSocket implementation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 视频分析服务

### Task 3: 完整的视频分析流程

**Files:**
- Create: `backend/services/video_analysis_service.py`
- Modify: `backend/services/video_service.py`

**Step 1: 扩展视频服务 - 关键帧提取**

在 `backend/services/video_service.py` 中添加:

```python
def extract_key_frames(
    self,
    video_path: Path,
    output_dir: Path,
    interval: int = 10,
    max_frames: int = 30
) -> List[str]:
    """
    提取关键帧（用于AI分析）

    Args:
        video_path: 视频文件路径
        output_dir: 输出目录
        interval: 采样间隔（秒）
        max_frames: 最大帧数

    Returns:
        关键帧路径列表
    """
    from config import FFMPEG_PATH

    if not video_path.exists():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")

    output_dir.mkdir(parents=True, exist_ok=True)

    # 获取视频时长
    info = self.extract_video_info(video_path)
    duration = info["duration"]

    # 计算实际帧数
    actual_interval = max(interval, duration / max_frames)
    frame_count = min(int(duration / actual_interval), max_frames)

    frames = []

    for i in range(frame_count):
        timestamp = i * actual_interval
        output_file = output_dir / f"frame_{i:03d}.jpg"

        cmd = [
            FFMPEG_PATH,
            "-ss", str(timestamp),
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",
            "-y",
            str(output_file)
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            frames.append(str(output_file))
        except subprocess.CalledProcessError as e:
            logger.error(f"提取关键帧失败: {e.stderr}")

    return frames

def extract_audio(self, video_path: Path, output_path: Path) -> str:
    """
    提取音频

    Args:
        video_path: 视频文件路径
        output_path: 输出音频路径

    Returns:
        音频文件路径
    """
    from config import FFMPEG_PATH

    if not video_path.exists():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-vn",  # 不处理视频
        "-acodec", "pcm_s16le",  # 音频编码
        "-ar", "16000",  # 采样率
        "-ac", "1",  # 单声道
        "-y",
        str(output_path)
    ]

    try:
        subprocess.run(cmd, capture_output=True, check=True)
        logger.info(f"音频提取成功: {output_path}")
        return str(output_path)
    except subprocess.CalledProcessError as e:
        logger.error(f"音频提取失败: {e.stderr}")
        raise RuntimeError(f"音频提取失败: {e.stderr}")
```

**Step 2: 创建视频分析服务**

在 `backend/services/video_analysis_service.py`:

```python
from pathlib import Path
from typing import Dict, List, Any
import uuid
import json
import logging

from services.video_service import VideoService
from services.ai.qwen_service import QwenService
from services.ai.xunfei_service import XunfeiService
from config import CACHE_DIR

logger = logging.getLogger(__name__)

class VideoAnalysisService:
    """视频分析服务 - 整合AI分析流程"""

    def __init__(self):
        self.video_service = VideoService()
        self.qwen_service = QwenService()
        self.xunfei_service = XunfeiService()

    def analyze_video(
        self,
        video_path: str,
        target_duration: int = None,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        完整的视频分析流程

        Args:
            video_path: 视频文件路径
            target_duration: 目标剪辑时长（秒）
            progress_callback: 进度回调函数 callback(stage, progress)

        Returns:
            分析结果
        """
        video_path = Path(video_path)
        analysis_id = str(uuid.uuid4())
        work_dir = Path(CACHE_DIR) / analysis_id

        try:
            # Step 1: 提取关键帧 (0-30%)
            if progress_callback:
                progress_callback("提取关键帧", 0)

            frames = self.video_service.extract_key_frames(
                video_path,
                work_dir / "frames",
                interval=10,
                max_frames=30
            )

            if progress_callback:
                progress_callback("提取关键帧", 30)

            # Step 2: AI视频理解 (30-60%)
            if progress_callback:
                progress_callback("AI内容理解", 30)

            ai_result = self.qwen_service.analyze_video_frames(
                frames,
                target_duration
            )

            if progress_callback:
                progress_callback("AI内容理解", 60)

            # Step 3: 提取音频并识别 (60-90%)
            transcript = []
            video_info = self.video_service.extract_video_info(video_path)

            if video_info.get("has_audio"):
                if progress_callback:
                    progress_callback("语音识别", 60)

                audio_path = self.video_service.extract_audio(
                    video_path,
                    work_dir / "audio.wav"
                )

                transcript = self.xunfei_service.transcribe_audio(
                    Path(audio_path)
                )

            if progress_callback:
                progress_callback("语音识别", 90)

            # Step 4: 生成剪辑建议 (90-100%)
            if progress_callback:
                progress_callback("生成剪辑建议", 90)

            # 构建分析结果
            result = {
                "video_path": str(video_path),
                "duration": video_info["duration"],
                "scene_description": ai_result.get("scene_description", ""),
                "emotions": ai_result.get("emotions", []),
                "excitement_score": ai_result.get("excitement_score", 50),
                "suggest_keep": ai_result.get("suggest_keep", True),
                "reason": ai_result.get("reason", ""),
                "transcript": transcript,
                "frames": frames
            }

            if progress_callback:
                progress_callback("分析完成", 100)

            logger.info(f"视频分析完成: {video_path.name}")
            return result

        except Exception as e:
            logger.error(f"视频分析失败: {str(e)}")
            raise

    def generate_edit_suggestions(
        self,
        analysis_results: List[Dict],
        target_duration: int
    ) -> List[Dict]:
        """
        根据分析结果生成剪辑建议

        Args:
            analysis_results: 多个视频的分析结果
            target_duration: 目标时长（秒）

        Returns:
            剪辑建议列表
        """
        suggestions = []

        # 收集所有建议保留的片段
        for result in analysis_results:
            if result["suggest_keep"]:
                suggestions.append({
                    "video_path": result["video_path"],
                    "start_time": 0,  # 简化：使用整段
                    "end_time": result["duration"],
                    "score": result["excitement_score"],
                    "reason": result["reason"]
                })

        # 按评分排序
        suggestions.sort(key=lambda x: x["score"], reverse=True)

        # 选择片段直到达到目标时长
        selected = []
        total_duration = 0

        for suggestion in suggestions:
            duration = suggestion["end_time"] - suggestion["start_time"]
            if total_duration + duration <= target_duration:
                selected.append(suggestion)
                total_duration += duration
            elif total_duration < target_duration * 0.8:
                # 裁剪最后一个片段
                remaining = target_duration - total_duration
                suggestion["end_time"] = suggestion["start_time"] + remaining
                selected.append(suggestion)
                break

        return selected
```

**Step 3: 创建API端点**

创建 `backend/api/routes/analysis.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import uuid

from models.database import get_db
from models.asset import Asset
from services.video_analysis_service import VideoAnalysisService
import json

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
analysis_service = VideoAnalysisService()

# 存储任务状态（生产环境应使用Redis）
analysis_tasks = {}

class StartAnalysisRequest(BaseModel):
    asset_ids: List[str]
    target_duration: int  # 秒
    aspect_ratio: str

class AnalysisStatus(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    progress: int  # 0-100
    stage: str = ""
    result: dict = None
    error: str = None

def run_analysis_task(task_id: str, asset_ids: List[str], target_duration: int, db: Session):
    """后台任务：执行视频分析"""
    try:
        analysis_tasks[task_id]["status"] = "running"

        results = []

        for i, asset_id in enumerate(asset_ids):
            asset = db.query(Asset).filter(Asset.id == asset_id).first()
            if not asset:
                continue

            # 进度回调
            def progress_callback(stage: str, progress: int):
                overall_progress = int((i / len(asset_ids) + progress / 100 / len(asset_ids)) * 100)
                analysis_tasks[task_id]["progress"] = overall_progress
                analysis_tasks[task_id]["stage"] = f"分析素材 {i+1}/{len(asset_ids)}: {stage}"

            # 分析视频
            result = analysis_service.analyze_video(
                asset.file_path,
                target_duration,
                progress_callback
            )

            results.append(result)

            # 保存分析结果到数据库
            asset.analyzed = True
            asset.analysis_result = json.dumps(result)
            db.commit()

        # 生成剪辑建议
        suggestions = analysis_service.generate_edit_suggestions(results, target_duration)

        analysis_tasks[task_id]["status"] = "completed"
        analysis_tasks[task_id]["progress"] = 100
        analysis_tasks[task_id]["result"] = {
            "analysis_results": results,
            "edit_suggestions": suggestions
        }

    except Exception as e:
        analysis_tasks[task_id]["status"] = "failed"
        analysis_tasks[task_id]["error"] = str(e)

@router.post("/start", response_model=AnalysisStatus)
async def start_analysis(
    request: StartAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """启动AI分析任务"""
    # 验证素材存在
    for asset_id in request.asset_ids:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"素材 {asset_id} 不存在")

    # 创建任务
    task_id = str(uuid.uuid4())
    analysis_tasks[task_id] = {
        "status": "pending",
        "progress": 0,
        "stage": "准备中",
        "result": None,
        "error": None
    }

    # 启动后台任务
    background_tasks.add_task(
        run_analysis_task,
        task_id,
        request.asset_ids,
        request.target_duration,
        db
    )

    return AnalysisStatus(
        task_id=task_id,
        status="pending",
        progress=0
    )

@router.get("/status/{task_id}", response_model=AnalysisStatus)
async def get_analysis_status(task_id: str):
    """查询分析任务状态"""
    if task_id not in analysis_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")

    task = analysis_tasks[task_id]

    return AnalysisStatus(
        task_id=task_id,
        status=task["status"],
        progress=task["progress"],
        stage=task.get("stage", ""),
        result=task.get("result"),
        error=task.get("error")
    )
```

在 `backend/api/main.py` 中注册:

```python
from api.routes import analysis

app.include_router(analysis.router)
```

**Step 4: 提交视频分析服务**

```bash
git add backend/services/video_analysis_service.py backend/api/routes/analysis.py
git commit -m "feat(backend): add complete video analysis service

- Create VideoAnalysisService integrating AI services
- Implement full analysis pipeline (frames + audio)
- Add edit suggestion generation algorithm
- Create analysis API with background tasks
- Track analysis progress and status

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 前端AI功能

### Task 4: AI分析UI

**Files:**
- Create: `frontend/src/components/AIAnalysis/AnalysisDialog.tsx`
- Create: `frontend/src/components/AIAnalysis/ProgressBar.tsx`
- Create: `frontend/src/components/AIAnalysis/ResultPanel.tsx`
- Create: `frontend/src/services/analysisApi.ts`

**Step 1: 创建分析API客户端**

在 `frontend/src/services/analysisApi.ts`:

```typescript
import apiClient from './api';

export interface StartAnalysisRequest {
  asset_ids: string[];
  target_duration: number;
  aspect_ratio: string;
}

export interface AnalysisStatus {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  stage?: string;
  result?: any;
  error?: string;
}

export const analysisApi = {
  /**
   * 启动分析任务
   */
  async startAnalysis(request: StartAnalysisRequest): Promise<AnalysisStatus> {
    const response = await apiClient.client.post('/api/analysis/start', request);
    return response.data;
  },

  /**
   * 查询任务状态
   */
  async getStatus(taskId: string): Promise<AnalysisStatus> {
    const response = await apiClient.client.get(`/api/analysis/status/${taskId}`);
    return response.data;
  },

  /**
   * 轮询任务状态直到完成
   */
  async pollStatus(
    taskId: string,
    onProgress: (status: AnalysisStatus) => void,
    interval: number = 2000
  ): Promise<AnalysisStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getStatus(taskId);
          onProgress(status);

          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new Error(status.error || '分析失败'));
          } else {
            setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
};
```

**Step 2: 创建进度条组件**

在 `frontend/src/components/AIAnalysis/ProgressBar.tsx`:

```tsx
import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;
  stage?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, stage }) => {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-info">
        <span className="progress-stage">{stage || '处理中...'}</span>
        <span className="progress-percent">{progress}%</span>
      </div>
    </div>
  );
};

export default ProgressBar;
```

在 `frontend/src/components/AIAnalysis/ProgressBar.css`:

```css
.progress-container {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #444;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.progress-stage {
  color: #ccc;
}

.progress-percent {
  color: #1890ff;
  font-weight: 500;
}
```

**Step 3: 创建分析对话框**

在 `frontend/src/components/AIAnalysis/AnalysisDialog.tsx`:

```tsx
import React, { useState } from 'react';
import { analysisApi } from '@/services/analysisApi';
import ProgressBar from './ProgressBar';
import './AnalysisDialog.css';

interface AnalysisDialogProps {
  assetIds: string[];
  onClose: () => void;
  onComplete: (result: any) => void;
}

const AnalysisDialog: React.FC<AnalysisDialogProps> = ({
  assetIds,
  onClose,
  onComplete
}) => {
  const [step, setStep] = useState<'config' | 'analyzing' | 'result'>('config');
  const [targetDuration, setTargetDuration] = useState(180); // 3分钟
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const handleStart = async () => {
    setStep('analyzing');
    setError('');

    try {
      const response = await analysisApi.startAnalysis({
        asset_ids: assetIds,
        target_duration: targetDuration,
        aspect_ratio: aspectRatio
      });

      // 轮询状态
      const finalStatus = await analysisApi.pollStatus(
        response.task_id,
        (status) => {
          setProgress(status.progress);
          setStage(status.stage || '');
        }
      );

      setStep('result');
      onComplete(finalStatus.result);

    } catch (err) {
      setError((err as Error).message);
      setStep('config');
    }
  };

  return (
    <div className="analysis-dialog-overlay">
      <div className="analysis-dialog">
        <div className="dialog-header">
          <h2>AI自动分析</h2>
          {step === 'config' && (
            <button onClick={onClose} className="close-button">✕</button>
          )}
        </div>

        <div className="dialog-content">
          {step === 'config' && (
            <>
              <div className="form-group">
                <label>目标时长</label>
                <input
                  type="range"
                  min={60}
                  max={600}
                  step={30}
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>1分钟</span>
                  <span className="range-value">
                    {Math.floor(targetDuration / 60)}分{targetDuration % 60}秒
                  </span>
                  <span>10分钟</span>
                </div>
              </div>

              <div className="form-group">
                <label>画幅比例</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="9:16"
                      checked={aspectRatio === '9:16'}
                      onChange={(e) => setAspectRatio(e.target.value)}
                    />
                    9:16 竖屏（推荐）
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="16:9"
                      checked={aspectRatio === '16:9'}
                      onChange={(e) => setAspectRatio(e.target.value)}
                    />
                    16:9 横屏
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="1:1"
                      checked={aspectRatio === '1:1'}
                      onChange={(e) => setAspectRatio(e.target.value)}
                    />
                    1:1 方形
                  </label>
                </div>
              </div>

              {error && (
                <div className="error-message">{error}</div>
              )}

              <div className="dialog-actions">
                <button onClick={onClose} className="btn-secondary">
                  取消
                </button>
                <button onClick={handleStart} className="btn-primary">
                  开始分析
                </button>
              </div>
            </>
          )}

          {step === 'analyzing' && (
            <div className="analyzing-state">
              <div className="spinner" />
              <h3>AI分析中...</h3>
              <p>正在理解视频内容，请稍候</p>
              <ProgressBar progress={progress} stage={stage} />
              <p className="hint">预计需要 3-5 分钟</p>
            </div>
          )}

          {step === 'result' && (
            <div className="result-state">
              <div className="success-icon">✓</div>
              <h3>分析完成！</h3>
              <p>已生成剪辑建议</p>
              <button onClick={onClose} className="btn-primary">
                查看结果
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDialog;
```

在 `frontend/src/components/AIAnalysis/AnalysisDialog.css`:

```css
.analysis-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.analysis-dialog {
  background-color: #353535;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #444;
}

.dialog-header h2 {
  font-size: 20px;
  color: #fff;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  color: #fff;
}

.dialog-content {
  padding: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #ccc;
  margin-bottom: 8px;
}

.form-group input[type="range"] {
  width: 100%;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

.range-value {
  color: #1890ff;
  font-weight: 500;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #40a9ff;
}

.btn-secondary {
  background-color: #444;
  color: #fff;
}

.btn-secondary:hover {
  background-color: #555;
}

.analyzing-state,
.result-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #444;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.analyzing-state h3,
.result-state h3 {
  font-size: 20px;
  color: #fff;
  margin: 0 0 8px;
}

.analyzing-state p,
.result-state p {
  color: #ccc;
  margin: 0 0 24px;
}

.hint {
  font-size: 12px;
  color: #888;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #52c41a;
  color: white;
  font-size: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 24px;
}

.error-message {
  padding: 12px;
  background-color: #ff4d4f22;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  color: #ff7875;
  font-size: 14px;
  margin-top: 16px;
}
```

**Step 4: 提交AI分析UI**

```bash
git add frontend/src/components/AIAnalysis/ frontend/src/services/analysisApi.ts
git commit -m "feat(frontend): add AI analysis UI components

- Create AnalysisDialog with config and progress
- Implement progress bar with stages
- Add polling mechanism for task status
- Style with modern dialog design

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

**Phase 3完成标准：**

- [x] 通义千问SDK集成
- [x] 讯飞星火SDK集成（模拟实现）
- [x] 视频分析服务完整流程
- [x] AI分析API和后台任务
- [x] AI分析UI对话框
- [x] 进度显示和轮询

**预计总时间: 24-30小时（3周）**

---

## 配置提醒

**开发前必须配置：**

1. **通义千问API Key**
   - 在 `backend/config.py` 或环境变量中设置 `QWEN_API_KEY`
   - 获取地址: https://dashscope.aliyun.com/

2. **讯飞星火API**
   - 在 `backend/config.py` 中设置 `XUNFEI_APPID`, `XUNFEI_API_KEY`, `XUNFEI_API_SECRET`
   - 获取地址: https://www.xfyun.cn/
   - 注意：当前实现为模拟版，需要完整实现WebSocket连接

---

## 下一步

Phase 3完成后进入Phase 4: 完善与优化
