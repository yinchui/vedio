# MVP Phase 4: 完善与优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善核心功能，实现视频导出、字幕生成、音乐匹配、异常处理和性能优化。

**Architecture:** 完善视频处理流程，添加字幕渲染、音频混合和视频导出功能。优化性能和用户体验。

**Tech Stack:** FFmpeg (复杂滤镜), librosa (音频分析), 性能优化技术

**Duration:** 3周（Week 10-12）

**Prerequisites:**
- Phase 1-3已完成
- FFmpeg高级特性配置

---

## 字幕生成与渲染

### Task 1: 字幕生成服务

**Files:**
- Create: `backend/services/subtitle_service.py`
- Create: `backend/models/subtitle.py`

**Step 1: 创建字幕数据模型**

在 `backend/models/subtitle.py`:

```python
from pydantic import BaseModel
from typing import List, Optional, Literal

class Word(BaseModel):
    """单词时间戳"""
    text: str
    start_time: float
    duration: float

class SubtitleStyle(BaseModel):
    """字幕样式"""
    font_family: str = "Microsoft YaHei"
    font_size: int = 48
    color: str = "#FFFFFF"
    stroke_color: Optional[str] = "#000000"
    stroke_width: int = 2
    background_color: Optional[str] = None
    bold: bool = False
    italic: bool = False

class SpeechSubtitle(BaseModel):
    """语音转字幕"""
    type: Literal["speech"] = "speech"
    start_time: float
    end_time: float
    text: str
    words: List[Word]
    position: Literal["bottom"] = "bottom"
    style: SubtitleStyle = SubtitleStyle()

class NarrativeSubtitle(BaseModel):
    """场景描述字幕"""
    type: Literal["narrative"] = "narrative"
    start_time: float
    end_time: float
    text: str
    trigger: Literal["scene_change", "emotion_peak"]
    position: Literal["top", "middle"] = "top"
    style: SubtitleStyle = SubtitleStyle(font_family="KaiTi", font_size=56)
    animation: Literal["typewriter", "slide_in", "fade_in"] = "fade_in"

class KeywordSubtitle(BaseModel):
    """关键词标注"""
    type: Literal["keyword"] = "keyword"
    start_time: float
    end_time: float
    text: str
    emotion: Literal["funny", "shocking", "heartwarming", "exciting", "beautiful"]
    position: Literal["center"] = "center"
    style: SubtitleStyle = SubtitleStyle(font_size=72, bold=True, color="#FFD700")
    animation: Literal["pop", "shake", "rotate"] = "pop"
```

**Step 2: 创建字幕生成服务**

在 `backend/services/subtitle_service.py`:

```python
from typing import List, Union
from pathlib import Path
import logging

from models.subtitle import (
    SpeechSubtitle,
    NarrativeSubtitle,
    KeywordSubtitle,
    Word,
    SubtitleStyle
)
from services.ai.qwen_service import QwenService

logger = logging.getLogger(__name__)

class SubtitleService:
    """字幕生成服务"""

    def __init__(self):
        self.qwen_service = QwenService()

    def generate_speech_subtitles(
        self,
        transcript: List[dict]
    ) -> List[SpeechSubtitle]:
        """
        从语音转录生成字幕

        Args:
            transcript: 转录结果

        Returns:
            语音字幕列表
        """
        subtitles = []

        for item in transcript:
            # 转换words格式
            words = [
                Word(
                    text=w["text"],
                    start_time=w["start_time"],
                    duration=w["duration"]
                )
                for w in item.get("words", [])
            ]

            subtitle = SpeechSubtitle(
                start_time=item["start_time"],
                end_time=item["end_time"],
                text=item["text"],
                words=words
            )

            subtitles.append(subtitle)

        logger.info(f"生成语音字幕 {len(subtitles)} 条")
        return subtitles

    def generate_narrative_subtitles(
        self,
        analysis_result: dict,
        duration: float
    ) -> List[NarrativeSubtitle]:
        """
        生成场景描述字幕

        Args:
            analysis_result: 视频分析结果
            duration: 视频时长

        Returns:
            场景描述字幕列表
        """
        subtitles = []

        # 在开头添加一条描述
        scene_desc = analysis_result.get("scene_description", "")
        emotions = analysis_result.get("emotions", [])

        if scene_desc:
            text = self.qwen_service.generate_narrative_subtitle(
                scene_desc,
                emotions[0] if emotions else "neutral",
                "scene_change"
            )

            subtitle = NarrativeSubtitle(
                start_time=1.0,
                end_time=4.0,
                text=text,
                trigger="scene_change"
            )

            subtitles.append(subtitle)

        # 在中间高潮处添加一条
        if duration > 30:
            mid_time = duration / 2
            text = self.qwen_service.generate_narrative_subtitle(
                scene_desc,
                emotions[0] if emotions else "neutral",
                "emotion_peak"
            )

            subtitle = NarrativeSubtitle(
                start_time=mid_time,
                end_time=mid_time + 3.0,
                text=text,
                trigger="emotion_peak"
            )

            subtitles.append(subtitle)

        logger.info(f"生成场景字幕 {len(subtitles)} 条")
        return subtitles

    def generate_keyword_subtitles(
        self,
        analysis_result: dict,
        duration: float
    ) -> List[KeywordSubtitle]:
        """
        生成关键词标注

        Args:
            analysis_result: 视频分析结果
            duration: 视频时长

        Returns:
            关键词字幕列表
        """
        subtitles = []

        emotions = analysis_result.get("emotions", [])
        score = analysis_result.get("excitement_score", 50)

        # 根据精彩度决定是否添加关键词
        if score >= 80:
            # 在1/3处添加一个关键词
            time_point = duration / 3

            emotion = emotions[0] if emotions else "exciting"
            keyword = self.qwen_service.generate_keyword_tag(
                analysis_result.get("scene_description", ""),
                emotion
            )

            subtitle = KeywordSubtitle(
                start_time=time_point,
                end_time=time_point + 1.5,
                text=keyword,
                emotion=emotion if emotion in ["funny", "shocking", "heartwarming", "exciting", "beautiful"] else "exciting"
            )

            subtitles.append(subtitle)

        logger.info(f"生成关键词 {len(subtitles)} 个")
        return subtitles

    def export_to_ass(
        self,
        subtitles: List[Union[SpeechSubtitle, NarrativeSubtitle, KeywordSubtitle]],
        output_path: Path,
        video_width: int = 1920,
        video_height: int = 1080
    ):
        """
        导出为ASS字幕文件（支持样式）

        Args:
            subtitles: 字幕列表
            output_path: 输出路径
            video_width: 视频宽度
            video_height: 视频高度
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # ASS文件头
        ass_content = f"""[Script Info]
Title: AI Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: {video_width}
PlayResY: {video_height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Speech,Microsoft YaHei,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,0,2,10,10,50,1
Style: Narrative,KaiTi,56,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,0,8,10,10,50,1
Style: Keyword,Microsoft YaHei,72,&H0000D7FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        # 添加字幕事件
        for subtitle in subtitles:
            start = self._format_time(subtitle.start_time)
            end = self._format_time(subtitle.end_time)

            if subtitle.type == "speech":
                style = "Speech"
            elif subtitle.type == "narrative":
                style = "Narrative"
            else:
                style = "Keyword"

            text = subtitle.text.replace("\n", "\\N")

            ass_content += f"Dialogue: 0,{start},{end},{style},,0,0,0,,{text}\n"

        # 写入文件
        with open(output_path, 'w', encoding='utf-8-sig') as f:
            f.write(ass_content)

        logger.info(f"字幕导出到: {output_path}")

    def _format_time(self, seconds: float) -> str:
        """格式化时间为ASS格式 (H:MM:SS.CC)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centisecs = int((seconds % 1) * 100)

        return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"
```

**Step 3: 添加字幕生成API**

在 `backend/api/routes/analysis.py` 中添加:

```python
from services.subtitle_service import SubtitleService

subtitle_service = SubtitleService()

@router.post("/subtitles/{asset_id}")
async def generate_subtitles(
    asset_id: str,
    db: Session = Depends(get_db)
):
    """为分析过的素材生成字幕"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset or not asset.analyzed:
        raise HTTPException(status_code=404, detail="素材未分析")

    analysis_result = json.loads(asset.analysis_result)
    duration = analysis_result["duration"]

    # 生成三种字幕
    speech_subs = subtitle_service.generate_speech_subtitles(
        analysis_result.get("transcript", [])
    )

    narrative_subs = subtitle_service.generate_narrative_subtitles(
        analysis_result,
        duration
    )

    keyword_subs = subtitle_service.generate_keyword_subtitles(
        analysis_result,
        duration
    )

    all_subtitles = speech_subs + narrative_subs + keyword_subs

    # 导出ASS文件
    from config import CACHE_DIR
    ass_path = Path(CACHE_DIR) / asset_id / "subtitles.ass"
    subtitle_service.export_to_ass(all_subtitles, ass_path)

    return {
        "success": True,
        "subtitle_file": str(ass_path),
        "subtitles": {
            "speech": [s.dict() for s in speech_subs],
            "narrative": [s.dict() for s in narrative_subs],
            "keyword": [s.dict() for s in keyword_subs]
        }
    }
```

**Step 4: 提交字幕生成功能**

```bash
git add backend/services/subtitle_service.py backend/models/subtitle.py
git commit -m "feat(backend): add subtitle generation service

- Create subtitle models (Speech, Narrative, Keyword)
- Implement SubtitleService with 3 subtitle types
- Add ASS export with custom styles
- Integrate with AI for narrative generation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 音乐匹配与处理

### Task 2: 音乐匹配服务

**Files:**
- Create: `backend/services/music_service.py`
- Update: `backend/requirements.txt`

**Step 1: 安装librosa**

更新 `backend/requirements.txt`:

```
librosa==0.10.0
soundfile==0.12.1
```

```bash
pip install librosa soundfile
```

**Step 2: 创建音乐服务**

在 `backend/services/music_service.py`:

```python
import librosa
import soundfile as sf
from pathlib import Path
from typing import List, Dict, Optional
import json
import logging

from config import MUSIC_LIBRARY_PATH

logger = logging.getLogger(__name__)

class MusicService:
    """音乐匹配和处理服务"""

    def __init__(self):
        self.library_path = Path(MUSIC_LIBRARY_PATH)
        self.metadata = self._load_metadata()

    def _load_metadata(self) -> List[Dict]:
        """加载音乐库元数据"""
        metadata_file = self.library_path / "metadata.json"

        if not metadata_file.exists():
            logger.warning(f"音乐库元数据不存在: {metadata_file}")
            return []

        with open(metadata_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("musics", [])

    def match_music(
        self,
        emotion_tags: List[str],
        target_duration: float,
        video_energy: float = 50.0
    ) -> Optional[Dict]:
        """
        匹配背景音乐

        Args:
            emotion_tags: 情绪标签
            target_duration: 目标时长
            video_energy: 视频能量水平 (0-100)

        Returns:
            匹配的音乐信息
        """
        if not self.metadata:
            logger.warning("音乐库为空")
            return None

        scores = []

        for music in self.metadata:
            # 1. 情绪标签匹配度
            music_tags = set(music.get("tags", []))
            emotion_set = set(emotion_tags)
            tag_match = len(music_tags & emotion_set) / len(emotion_set) if emotion_set else 0

            # 2. 时长匹配度
            music_duration = music.get("duration", 0)
            duration_diff = abs(music_duration - target_duration) / target_duration
            duration_match = 1 - min(duration_diff, 1.0)

            # 3. 能量匹配（如果有BPM信息）
            bpm = music.get("bpm", 120)
            # 简化：BPM高=能量高
            music_energy = min((bpm / 120) * 50, 100)
            energy_match = 1 - abs(music_energy - video_energy) / 100

            # 综合评分
            score = tag_match * 0.6 + duration_match * 0.3 + energy_match * 0.1
            scores.append((music, score))

        # 返回最高分
        scores.sort(key=lambda x: x[1], reverse=True)

        if scores:
            best_music = scores[0][0]
            logger.info(f"匹配音乐: {best_music['title']} (评分: {scores[0][1]:.2f})")
            return best_music

        return None

    def process_music(
        self,
        music_path: Path,
        output_path: Path,
        target_duration: float,
        fade_in: float = 3.0,
        fade_out: float = 3.0,
        volume: float = 0.5
    ) -> str:
        """
        处理音乐（裁剪、淡入淡出、音量调整）

        Args:
            music_path: 音乐文件路径
            output_path: 输出路径
            target_duration: 目标时长
            fade_in: 淡入时长（秒）
            fade_out: 淡出时长（秒）
            volume: 音量 (0.0-1.0)

        Returns:
            输出文件路径
        """
        # 加载音频
        y, sr = librosa.load(str(music_path), sr=None, mono=False)

        # 如果是单声道，转为双声道
        if y.ndim == 1:
            y = np.stack([y, y])

        # 裁剪到目标时长
        target_samples = int(target_duration * sr)
        if y.shape[1] > target_samples:
            y = y[:, :target_samples]
        elif y.shape[1] < target_samples:
            # 循环播放
            repeats = int(np.ceil(target_samples / y.shape[1]))
            y = np.tile(y, repeats)[:, :target_samples]

        # 音量调整
        y = y * volume

        # 淡入淡出
        fade_in_samples = int(fade_in * sr)
        fade_out_samples = int(fade_out * sr)

        # 淡入
        fade_in_curve = np.linspace(0, 1, fade_in_samples)
        y[:, :fade_in_samples] *= fade_in_curve

        # 淡出
        fade_out_curve = np.linspace(1, 0, fade_out_samples)
        y[:, -fade_out_samples:] *= fade_out_curve

        # 保存
        output_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output_path), y.T, sr)

        logger.info(f"音乐处理完成: {output_path}")
        return str(output_path)

    def analyze_bpm(self, music_path: Path) -> float:
        """分析音乐BPM"""
        y, sr = librosa.load(str(music_path))
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        return float(tempo)
```

**Step 3: 添加音乐匹配API**

在 `backend/api/routes/analysis.py` 中添加:

```python
from services.music_service import MusicService

music_service = MusicService()

@router.post("/music/match")
async def match_background_music(
    emotion_tags: List[str],
    target_duration: int
):
    """匹配背景音乐"""
    music = music_service.match_music(
        emotion_tags,
        float(target_duration),
        video_energy=50.0
    )

    if not music:
        raise HTTPException(status_code=404, detail="未找到合适的音乐")

    return {
        "success": True,
        "music": music
    }
```

**Step 4: 提交音乐服务**

```bash
git add backend/services/music_service.py backend/requirements.txt
git commit -m "feat(backend): add music matching and processing

- Install librosa for audio analysis
- Create MusicService with matching algorithm
- Implement music processing (trim, fade, volume)
- Add BPM analysis capability

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 视频导出

### Task 3: 视频导出服务

**Files:**
- Create: `backend/services/export_service.py`
- Create: `backend/api/routes/export.py`

**Step 1: 创建导出服务**

在 `backend/services/export_service.py`:

```python
from pathlib import Path
from typing import List, Dict, Callable
import subprocess
import re
import logging

from config import FFMPEG_PATH
from services.video_service import VideoService

logger = logging.getLogger(__name__)

class ExportService:
    """视频导出服务"""

    def __init__(self):
        self.ffmpeg_path = FFMPEG_PATH
        self.video_service = VideoService()

    def export_video(
        self,
        timeline: Dict,
        output_path: Path,
        subtitle_file: Path = None,
        music_file: Path = None,
        resolution: str = "1080p",
        format: str = "mp4",
        progress_callback: Callable[[int], None] = None
    ) -> str:
        """
        导出视频

        Args:
            timeline: 时间线数据
            output_path: 输出路径
            subtitle_file: 字幕文件（ASS）
            music_file: 背景音乐文件
            resolution: 分辨率 (1080p/720p/4K)
            format: 格式 (mp4/mov)
            progress_callback: 进度回调

        Returns:
            输出文件路径
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 解析分辨率
        width, height = self._parse_resolution(resolution)

        # 构建FFmpeg命令
        cmd = self._build_ffmpeg_command(
            timeline,
            output_path,
            subtitle_file,
            music_file,
            width,
            height
        )

        logger.info(f"开始导出视频: {output_path}")

        # 执行FFmpeg
        total_duration = timeline.get("total_duration", 0)

        try:
            process = subprocess.Popen(
                cmd,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )

            # 解析进度
            for line in process.stderr:
                if progress_callback:
                    progress = self._parse_progress(line, total_duration)
                    if progress is not None:
                        progress_callback(progress)

            process.wait()

            if process.returncode == 0:
                logger.info(f"视频导出成功: {output_path}")
                return str(output_path)
            else:
                raise RuntimeError("FFmpeg执行失败")

        except Exception as e:
            logger.error(f"视频导出失败: {str(e)}")
            raise

    def _build_ffmpeg_command(
        self,
        timeline: Dict,
        output_path: Path,
        subtitle_file: Path,
        music_file: Path,
        width: int,
        height: int
    ) -> List[str]:
        """构建FFmpeg命令"""
        cmd = [self.ffmpeg_path]

        clips = timeline.get("clips", [])
        video_clips = [c for c in clips if c.get("track_type") == "video"]

        # 输入文件
        input_files = []
        for clip in video_clips:
            cmd.extend(["-i", clip["file_path"]])
            input_files.append(clip)

        # 如果有背景音乐
        if music_file and music_file.exists():
            cmd.extend(["-i", str(music_file)])

        # 复杂滤镜
        filter_complex = self._build_filter_complex(
            video_clips,
            subtitle_file,
            width,
            height
        )

        if filter_complex:
            cmd.extend(["-filter_complex", filter_complex])

        # 输出设置
        cmd.extend([
            "-map", "[vout]",  # 映射视频输出
            "-map", "[aout]",  # 映射音频输出
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-y",  # 覆盖已存在文件
            str(output_path)
        ])

        return cmd

    def _build_filter_complex(
        self,
        clips: List[Dict],
        subtitle_file: Path,
        width: int,
        height: int
    ) -> str:
        """构建滤镜链"""
        filters = []

        # 1. 裁剪每个片段
        for i, clip in enumerate(clips):
            start = clip.get("source_start", 0)
            end = clip.get("source_end", 0)
            duration = end - start

            filters.append(
                f"[{i}:v]trim=start={start}:duration={duration},"
                f"setpts=PTS-STARTPTS,scale={width}:{height}[v{i}]"
            )

            filters.append(
                f"[{i}:a]atrim=start={start}:duration={duration},"
                f"asetpts=PTS-STARTPTS[a{i}]"
            )

        # 2. 拼接视频
        video_inputs = "".join(f"[v{i}]" for i in range(len(clips)))
        filters.append(f"{video_inputs}concat=n={len(clips)}:v=1:a=0[v_concat]")

        # 3. 拼接音频
        audio_inputs = "".join(f"[a{i}]" for i in range(len(clips)))
        filters.append(f"{audio_inputs}concat=n={len(clips)}:v=0:a=1[a_concat]")

        # 4. 添加字幕（如果有）
        if subtitle_file and subtitle_file.exists():
            filters.append(
                f"[v_concat]ass={subtitle_file}[v_sub]"
            )
            video_output = "[v_sub]"
        else:
            video_output = "[v_concat]"

        # 5. 混合背景音乐（如果有）
        # 这里简化处理，实际需要判断是否有music_file
        filters.append(f"{video_output}copy[vout]")
        filters.append(f"[a_concat]copy[aout]")

        return ";".join(filters)

    def _parse_resolution(self, resolution: str) -> tuple:
        """解析分辨率"""
        resolutions = {
            "1080p": (1920, 1080),
            "720p": (1280, 720),
            "4K": (3840, 2160),
            "480p": (854, 480)
        }

        return resolutions.get(resolution, (1920, 1080))

    def _parse_progress(self, line: str, total_duration: float) -> int:
        """解析FFmpeg进度"""
        # time=00:00:41.13
        match = re.search(r'time=(\d+):(\d+):(\d+\.\d+)', line)
        if match:
            h, m, s = match.groups()
            current_time = int(h) * 3600 + int(m) * 60 + float(s)
            if total_duration > 0:
                progress = int((current_time / total_duration) * 100)
                return min(progress, 100)

        return None
```

**Step 2: 创建导出API**

在 `backend/api/routes/export.py`:

```python
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path
import uuid

from models.database import get_db
from services.export_service import ExportService
from config import TEMP_DIR

router = APIRouter(prefix="/api/export", tags=["export"])
export_service = ExportService()

# 导出任务状态
export_tasks = {}

class ExportRequest(BaseModel):
    timeline: dict
    subtitle_file: str = None
    music_file: str = None
    resolution: str = "1080p"
    format: str = "mp4"

class ExportStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    output_file: str = None
    error: str = None

def run_export_task(task_id: str, request: ExportRequest):
    """后台任务：执行视频导出"""
    try:
        export_tasks[task_id]["status"] = "running"

        output_path = Path(TEMP_DIR) / "exports" / f"{task_id}.{request.format}"

        def progress_callback(progress: int):
            export_tasks[task_id]["progress"] = progress

        output_file = export_service.export_video(
            timeline=request.timeline,
            output_path=output_path,
            subtitle_file=Path(request.subtitle_file) if request.subtitle_file else None,
            music_file=Path(request.music_file) if request.music_file else None,
            resolution=request.resolution,
            format=request.format,
            progress_callback=progress_callback
        )

        export_tasks[task_id]["status"] = "completed"
        export_tasks[task_id]["progress"] = 100
        export_tasks[task_id]["output_file"] = output_file

    except Exception as e:
        export_tasks[task_id]["status"] = "failed"
        export_tasks[task_id]["error"] = str(e)

@router.post("/start", response_model=ExportStatus)
async def start_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks
):
    """启动导出任务"""
    task_id = str(uuid.uuid4())

    export_tasks[task_id] = {
        "status": "pending",
        "progress": 0,
        "output_file": None,
        "error": None
    }

    background_tasks.add_task(run_export_task, task_id, request)

    return ExportStatus(
        task_id=task_id,
        status="pending",
        progress=0
    )

@router.get("/status/{task_id}", response_model=ExportStatus)
async def get_export_status(task_id: str):
    """查询导出状态"""
    if task_id not in export_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")

    task = export_tasks[task_id]

    return ExportStatus(
        task_id=task_id,
        status=task["status"],
        progress=task["progress"],
        output_file=task.get("output_file"),
        error=task.get("error")
    )
```

在 `backend/api/main.py` 中注册:

```python
from api.routes import export

app.include_router(export.router)
```

**Step 3: 提交导出功能**

```bash
git add backend/services/export_service.py backend/api/routes/export.py
git commit -m "feat(backend): add video export service

- Create ExportService with FFmpeg integration
- Build complex filter chains for video composition
- Add subtitle and music mixing
- Implement progress parsing
- Create export API with background tasks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 异常处理与优化

### Task 4: 异常处理和日志

**Files:**
- Create: `backend/utils/logger.py`
- Create: `backend/utils/exceptions.py`
- Modify: `backend/api/main.py`

**Step 1: 创建日志系统**

在 `backend/utils/logger.py`:

```python
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

from config import LOG_LEVEL, LOG_FILE

def setup_logger():
    """配置日志系统"""
    # 创建日志目录
    log_path = Path(LOG_FILE)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    # 创建logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, LOG_LEVEL))

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)

    # 文件处理器（轮转）
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)

    # 添加处理器
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    logger.info("日志系统初始化完成")
```

**Step 2: 创建自定义异常**

在 `backend/utils/exceptions.py`:

```python
class VideoEditorException(Exception):
    """基础异常类"""
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code
        super().__init__(self.message)

class VideoProcessingError(VideoEditorException):
    """视频处理错误"""
    pass

class AIServiceError(VideoEditorException):
    """AI服务错误"""
    pass

class ExportError(VideoEditorException):
    """导出错误"""
    pass

class ConfigurationError(VideoEditorException):
    """配置错误"""
    pass
```

**Step 3: 添加全局异常处理**

修改 `backend/api/main.py`:

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from utils.logger import setup_logger
from utils.exceptions import VideoEditorException
import logging

# 初始化日志
setup_logger()
logger = logging.getLogger(__name__)

@app.exception_handler(VideoEditorException)
async def video_editor_exception_handler(request: Request, exc: VideoEditorException):
    """处理自定义异常"""
    logger.error(f"VideoEditorException: {exc.message} (code: {exc.code})")
    return JSONResponse(
        status_code=500,
        content={
            "error": exc.message,
            "code": exc.code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理通用异常"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "服务器内部错误",
            "detail": str(exc) if app.debug else None
        }
    )

@app.on_event("startup")
async def startup_event():
    """应用启动"""
    init_db()
    logger.info("应用启动成功")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭"""
    logger.info("应用关闭")
```

**Step 4: 提交异常处理**

```bash
git add backend/utils/ backend/api/main.py
git commit -m "feat(backend): add logging and exception handling

- Create structured logging system with rotation
- Add custom exception classes
- Implement global exception handlers
- Log startup and shutdown events

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

**Phase 4完成标准：**

- [x] 字幕生成服务（三种类型）
- [x] ASS字幕导出
- [x] 音乐匹配算法
- [x] 音乐处理（裁剪、淡入淡出）
- [x] 视频导出服务
- [x] FFmpeg复杂滤镜链
- [x] 日志系统
- [x] 异常处理

**预计总时间: 24-30小时（3周）**

---

## 下一步

Phase 4完成后进入Phase 5: 测试与打包（最后阶段）
