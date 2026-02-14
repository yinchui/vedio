# 智能视频剪辑软件 - 详细设计文档

**项目名称：** AI智能剪辑助手
**创建日期：** 2026-02-14
**版本：** v1.0 MVP设计
**文档状态：** 已批准

---

## 目录

1. [项目概述](#项目概述)
2. [系统架构](#系统架构)
3. [核心功能设计](#核心功能设计)
4. [UI界面设计](#ui界面设计)
5. [数据流与通信](#数据流与通信)
6. [Agent Teams分工](#agent-teams分工)
7. [API与配置清单](#api与配置清单)
8. [后续功能规划](#后续功能规划)
9. [技术风险与挑战](#技术风险与挑战)

---

## 项目概述

### 1.1 项目目标

开发一款完整的、可直接部署的桌面端视频自动剪辑软件，核心目标是：
- **自动化率：** AI自动完成80%以上的剪辑工作
- **专业性：** 提供专业级时间轴编辑器，类似剪映/PR
- **完整性：** 支持多段长视频处理，非简单demo
- **可发布：** 生成的视频可直接发布到平台（抖音、小红书等）

### 1.2 核心功能

**三大核心功能：**

1. **自动剪辑**
   - AI深度理解视频内容（场景、情绪、动作）
   - 自动识别精彩片段和冗余片段
   - 生成剪辑建议（保留/删除），用户确认
   - 自动生成最终时间线

2. **自动字幕**
   - **语音转字幕：** 识别人声，生成带时间戳的字幕
   - **场景描述字幕：** AI生成旁白性质的描述文字
   - **关键词标注：** 在关键时刻添加醒目标签（如"震撼"、"笑死"）

3. **自动配音**
   - 智能背景音乐：AI分析视频情绪，自动匹配音乐
   - 从无版权音乐库选择或使用内置音乐
   - 自动调整音量、淡入淡出

### 1.3 用户画像

**主要用户：**
- 生活类视频创作者
- 内容发布到短视频平台（抖音、小红书）
- 处理的视频多为长视频（10分钟+），剪成3-5分钟短视频
- 希望快速出片，但保留微调空间

### 1.4 使用场景

**典型工作流：**
1. 用户拍摄多段生活视频（如旅行、美食、日常）
2. 导入到软件，设置目标时长（3-5分钟）和画幅（9:16竖屏）
3. AI自动分析视频内容，生成剪辑建议
4. 用户查看建议，确认保留哪些片段
5. AI生成完整时间轴（视频+字幕+配乐）
6. 用户在时间轴上微调（调整顺序、编辑字幕等）
7. 预览满意后导出，直接发布到平台

**预期时间：** 5分钟成品视频，从导入到导出约20-30分钟

---

## 系统架构

### 2.1 技术架构选型

**架构模式：** 前后端分离

```
┌─────────────────────────────────────┐
│        Electron 前端应用             │
│  (UI界面 + 时间轴编辑器 + 预览)       │
└─────────────┬───────────────────────┘
              │ HTTP API + WebSocket
              │ (localhost通信)
┌─────────────┴───────────────────────┐
│       FastAPI 后端服务               │
│  (视频处理 + AI调用 + 任务队列)       │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┬─────────────┐
    │         │         │             │
┌───┴───┐ ┌──┴──┐  ┌───┴────┐  ┌─────┴─────┐
│FFmpeg │ │ AI  │  │数据库   │  │ 任务队列   │
│       │ │API  │  │SQLite  │  │ Celery    │
└───────┘ └─────┘  └────────┘  └───────────┘
```

**为什么选择前后端分离？**
1. ✅ 最适合Agent Teams并行开发
2. ✅ Python处理视频和AI生态最成熟
3. ✅ 性能好：视频处理不阻塞UI
4. ✅ 职责清晰：前端专注交互，后端专注逻辑

### 2.2 技术栈明细

#### 前端（Electron应用）

| 技术 | 用途 |
|------|------|
| Electron 27+ | 桌面应用框架 |
| React 18 + TypeScript | UI框架和类型安全 |
| Redux Toolkit | 状态管理（管理复杂的剪辑状态） |
| Ant Design | UI组件库 |
| TailwindCSS | 样式框架 |
| Video.js | 视频播放器 |
| Canvas API | 时间轴高性能渲染 |
| Axios | HTTP客户端 |
| Socket.io-client | WebSocket实时通信 |
| Electron Builder | 打包成.exe |

#### 后端（Python服务）

| 技术 | 用途 |
|------|------|
| FastAPI | Web框架（高性能、异步） |
| SQLAlchemy | ORM（数据库操作） |
| SQLite | 数据库 |
| Celery + Redis | 任务队列（处理长任务） |
| FFmpeg | 视频处理引擎 |
| moviepy | FFmpeg的Python封装 |
| 通义千问SDK (dashscope) | 视频内容理解 |
| 讯飞星火SDK | 语音识别 |
| librosa | 音频分析（音乐匹配） |
| opencv-python | 图像处理 |
| PyInstaller | 打包成.exe |

### 2.3 系统启动流程

```
用户双击软件图标
        ↓
Electron主进程启动
        ↓
检测Python后端是否运行？
    ├─ 否 → 自动启动Python服务（后台进程）
    └─ 是 → 直接连接
        ↓
健康检查：ping /health
        ↓
显示主界面
```

**部署形态：**
- 单个.exe安装包
- 安装后包含Electron前端 + Python后端两个组件
- 用户无感知，一键启动

---

## 核心功能设计

### 3.1 素材管理模块

#### 功能描述

- 支持导入多段视频素材（拖拽或文件选择）
- 自动提取视频元信息（时长、分辨率、帧率、编码）
- 生成缩略图（每5-10秒一帧）
- 网格/列表视图展示素材

#### 数据结构

```typescript
interface MediaAsset {
  id: string;                    // 唯一标识
  fileName: string;              // 文件名
  filePath: string;              // 绝对路径
  duration: number;              // 时长（秒）
  resolution: {                  // 分辨率
    width: number;
    height: number;
  };
  frameRate: number;             // 帧率
  fileSize: number;              // 文件大小（字节）
  thumbnails: string[];          // 缩略图路径数组
  audioTrack: boolean;           // 是否有音频
  createTime: Date;              // 导入时间
}
```

#### 后端API

- `POST /api/import/video` - 导入视频
  - 请求：`{filePaths: string[]}`
  - 响应：`{assets: MediaAsset[]}`

### 3.2 AI视频理解模块

#### 核心流程

```
视频文件
    ↓
【步骤1：视频采样】
    ├─ 关键帧提取：每5-10秒提取一帧
    ├─ 场景转换检测：额外提取转场帧
    └─ 音频提取：如有人声，提取完整音轨
    ↓
【步骤2：多模态分析】
    ├─ 通义千问视频理解：
    │   输入：关键帧图像序列
    │   输出：场景描述、情绪分析、精彩度评分
    │
    └─ 讯飞星火语音识别：
        输入：音频文件
        输出：带时间戳的文字转录
    ↓
【步骤3：生成剪辑建议】
    ├─ 精彩度评分（0-100分）
    ├─ 场景分段
    ├─ 高光时刻标记
    └─ 冗余片段标记
    ↓
返回分析结果JSON
```

#### 通义千问Prompt设计

```
你是一个专业的视频内容分析师。我会给你一段视频的关键帧图像序列，
请分析以下内容：

1. 场景描述：每个场景在做什么？（如"海边日落"、"人物特写"）
2. 情绪氛围：整体情绪是什么？（欢快、舒缓、激动、温馨等）
3. 精彩度评分：这段内容的可看性如何？（0-100分，考虑画面美感、动作丰富度、情绪饱满度）
4. 建议保留：是否建议保留这段内容？理由是什么？

用户目标：剪辑成3-5分钟的生活类短视频，发布到抖音/小红书。

请以JSON格式返回：
{
  "sceneDescription": "...",
  "emotion": ["happy", "relaxed"],
  "excitementScore": 85,
  "suggestKeep": true,
  "reason": "画面优美，情绪积极"
}
```

#### 数据结构

```typescript
interface VideoAnalysis {
  assetId: string;
  segments: Segment[];           // 场景片段
  highlights: Highlight[];       // 高光时刻
  transcript: Transcript[];      // 语音转文字
  emotions: string[];            // 情绪标签
}

interface Segment {
  startTime: number;             // 起始时间（秒）
  endTime: number;               // 结束时间（秒）
  sceneDescription: string;      // "海边日落场景"
  excitementScore: number;       // 精彩度 0-100
  suggestKeep: boolean;          // AI建议是否保留
  reason: string;                // "画面优美，情绪积极"
}

interface Highlight {
  time: number;                  // 高光时刻时间点
  description: string;           // "日落最美瞬间"
  type: 'visual' | 'audio' | 'emotion';
}

interface Transcript {
  startTime: number;
  endTime: number;
  text: string;
  words: Word[];                 // 逐字时间戳
}

interface Word {
  text: string;
  startTime: number;
  duration: number;
}
```

#### 后端API

- `POST /api/analyze/start` - 启动AI分析
  - 请求：`{assetIds: string[], targetDuration: number, aspectRatio: string}`
  - 响应：`{taskId: string}`

- `GET /api/analyze/result/{taskId}` - 获取分析结果
  - 响应：`{status: string, progress: number, result: VideoAnalysis}`

### 3.3 智能剪辑引擎

#### 剪辑策略算法

**输入：**
- 多段视频的AI分析结果
- 用户目标时长（如3-5分钟 = 180-300秒）

**处理逻辑：**

```python
def generate_edit_timeline(analyses, target_duration):
    # 1. 收集所有建议保留的片段
    keep_segments = []
    for analysis in analyses:
        keep_segments.extend([s for s in analysis.segments if s.suggestKeep])

    # 2. 按精彩度排序
    keep_segments.sort(key=lambda s: s.excitementScore, reverse=True)

    # 3. 贪心选择，直到达到目标时长
    selected = []
    total_duration = 0
    for segment in keep_segments:
        seg_duration = segment.endTime - segment.startTime
        if total_duration + seg_duration <= target_duration:
            selected.append(segment)
            total_duration += seg_duration
        elif total_duration < target_duration * 0.8:
            # 如果还没达到目标时长的80%，可以裁剪片段
            remaining = target_duration - total_duration
            segment.endTime = segment.startTime + remaining
            selected.append(segment)
            break

    # 4. 按时间顺序重新排列（保持叙事连贯）
    selected.sort(key=lambda s: (s.assetId, s.startTime))

    # 5. 检查场景转换是否自然，调整顺序
    # （高级逻辑：避免场景跳跃太大）

    return selected
```

#### 数据结构

```typescript
interface EditTimeline {
  clips: TimelineClip[];
  totalDuration: number;
  outputResolution: {width: number, height: number};
}

interface TimelineClip {
  id: string;
  sourceAssetId: string;         // 来自哪个素材
  sourceStart: number;           // 素材中的起始时间
  sourceEnd: number;             // 素材中的结束时间
  timelineStart: number;         // 在最终视频中的位置
  timelineDuration: number;
  aiSuggestion: string;          // "建议保留：画面精彩"
  userConfirmed: boolean;        // 用户是否确认
}
```

#### 后端API

- `POST /api/timeline/generate` - 生成剪辑时间线
  - 请求：`{analysisResults: VideoAnalysis[], targetDuration: number}`
  - 响应：`{timeline: EditTimeline}`

### 3.4 智能字幕生成模块

#### 三种字幕类型

**类型A：语音转字幕**

- 触发条件：视频有人声
- 数据来源：讯飞星火ASR
- 渲染样式：
  - 位置：底部居中
  - 样式：白色文字+黑色描边
  - 动效：逐字弹出或整句淡入

```typescript
interface SpeechSubtitle {
  type: 'speech';
  startTime: number;
  endTime: number;
  text: string;
  words: Word[];                 // 逐字时间戳
  position: 'bottom';
  style: SubtitleStyle;
}
```

**类型B：场景描述字幕**

- 数据来源：通义千问生成
- 示例："此时的我还不知道即将发生什么..."、"名场面来了"
- 插入时机：场景转换、情绪高点
- 渲染样式：
  - 位置：顶部居中或画面上1/3
  - 样式：手写体、渐变色
  - 动效：打字机效果、侧边滑入

```typescript
interface NarrativeSubtitle {
  type: 'narrative';
  startTime: number;
  endTime: number;
  text: string;
  trigger: 'scene_change' | 'emotion_peak';
  position: 'top' | 'middle';
  style: SubtitleStyle;
  animation: 'typewriter' | 'slide_in' | 'fade_in';
}
```

**类型C：关键词/情绪标注**

- 数据来源：AI识别关键时刻
- 示例："震撼"、"笑死"、"绝了"、"❤️"
- 渲染样式：
  - 位置：画面中心或跟随动作
  - 样式：大字体、醒目颜色、特效边框
  - 动效：弹出+缩放、抖动

```typescript
interface KeywordSubtitle {
  type: 'keyword';
  startTime: number;
  endTime: number;
  text: string;
  emotion: 'funny' | 'shocking' | 'heartwarming';
  position: {x: number, y: number} | 'center';
  style: SubtitleStyle;
  animation: 'pop' | 'shake' | 'rotate';
}
```

#### 字幕样式定义

```typescript
interface SubtitleStyle {
  fontFamily: string;            // 字体
  fontSize: number;              // 字号
  color: string;                 // 颜色
  strokeColor?: string;          // 描边颜色
  strokeWidth?: number;          // 描边宽度
  backgroundColor?: string;      // 背景色
  bold?: boolean;
  italic?: boolean;
}
```

#### 后端API

- `POST /api/subtitle/generate` - 生成字幕
  - 请求：`{analysisResult: VideoAnalysis}`
  - 响应：`{subtitles: Array<SpeechSubtitle | NarrativeSubtitle | KeywordSubtitle>}`

### 3.5 智能配乐模块

#### 工作流程

```
视频分析结果
    ↓
【步骤1：情绪分析】
通义千问提取情绪标签：
    ["happy", "relaxed", "outdoor"]
    ↓
【步骤2：音乐检索】
调用音乐库API，按标签搜索：
    - 输入：情绪标签 + 时长需求
    - 输出：候选音乐列表（10-20首）
    ↓
【步骤3：音乐匹配】
librosa分析候选音乐：
    - BPM（节奏）
    - 能量曲线
与视频节奏匹配，选择最佳
    ↓
【步骤4：音乐处理】
    - 裁剪到目标时长
    - 淡入淡出（前3秒、后3秒）
    - 音量调整（不遮盖人声）
    ↓
返回音乐文件路径
```

#### 音乐匹配算法

```python
def match_music(video_emotion_tags, video_duration, candidate_musics):
    scores = []
    for music in candidate_musics:
        # 1. 情绪标签匹配度
        emotion_match = len(set(music.tags) & set(video_emotion_tags)) / len(video_emotion_tags)

        # 2. 时长匹配度（接近视频时长的音乐优先）
        duration_diff = abs(music.duration - video_duration) / video_duration
        duration_match = 1 - duration_diff

        # 3. 能量水平匹配（视频节奏快则选高能量音乐）
        # video_energy = calculate_scene_change_frequency(video)
        # energy_match = 1 - abs(music.energyLevel - video_energy) / 100

        # 综合评分
        score = emotion_match * 0.6 + duration_match * 0.4
        scores.append((music, score))

    # 返回最高分音乐
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[0][0]
```

#### 数据结构

```typescript
interface BackgroundMusic {
  musicId: string;
  title: string;
  url: string;                   // 音乐文件URL或本地路径
  duration: number;
  bpm: number;                   // 每分钟节拍数
  tags: string[];                // 情绪标签
  energyLevel: number;           // 能量水平 0-100

  // 应用到时间线
  startTime: number;             // 在视频中的起始位置
  volume: number;                // 音量 0-1
  fadeIn: number;                // 淡入时长（秒）
  fadeOut: number;               // 淡出时长（秒）
}
```

#### 音乐来源

**优先级1：在线音乐库API**
- 爱给网 API
- 淘声网 API

**优先级2：内置音乐库（备选方案）**
- 从YouTube Audio Library、Pixabay下载20-30首
- 按情绪分类：欢快、舒缓、激动、温馨、悲伤
- 打包到软件安装包

#### 后端API

- `POST /api/music/search` - 搜索音乐
  - 请求：`{emotionTags: string[], duration: number}`
  - 响应：`{musics: BackgroundMusic[]}`

### 3.6 视频导出模块

#### 导出流程

```
用户点击"导出"
    ↓
【步骤1：配置导出参数】
    - 分辨率：1080p / 720p / 4K
    - 格式：MP4 / MOV
    - 码率：自动 / 自定义
    - 帧率：保持原始 / 30fps / 60fps
    ↓
【步骤2：生成FFmpeg命令】
根据时间线数据生成复杂FFmpeg命令：
    1. 裁剪各个视频片段
    2. 拼接片段
    3. 渲染字幕（drawtext滤镜）
    4. 混合音频（原音+背景音乐）
    5. 调整分辨率和码率
    ↓
【步骤3：执行FFmpeg】
    - 启动FFmpeg进程
    - 实时读取进度（解析stderr输出）
    - 通过WebSocket推送进度到前端
    ↓
【步骤4：导出完成】
    - 返回视频文件路径
    - 前端显示成功提示
```

#### FFmpeg命令示例

```bash
ffmpeg \
  # 输入片段1
  -i input1.mp4 \
  # 输入片段2
  -i input2.mp4 \
  # 输入背景音乐
  -i bgmusic.mp3 \

  # 复杂滤镜
  -filter_complex "
    # 裁剪片段1
    [0:v]trim=start=10:end=35,setpts=PTS-STARTPTS[v1];
    [0:a]atrim=start=10:end=35,asetpts=PTS-STARTPTS[a1];

    # 裁剪片段2
    [1:v]trim=start=20:end=50,setpts=PTS-STARTPTS[v2];
    [1:a]atrim=start=20:end=50,asetpts=PTS-STARTPTS[a2];

    # 拼接视频
    [v1][v2]concat=n=2:v=1:a=0[vout];

    # 拼接音频
    [a1][a2]concat=n=2:v=0:a=1[aout];

    # 混合背景音乐
    [aout][2:a]amix=inputs=2:duration=first:dropout_transition=2[finalout];

    # 添加字幕
    [vout]drawtext=text='你好世界':fontfile=msyh.ttc:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-100:enable='between(t,5,8)'[vfinal]
  " \

  # 输出
  -map "[vfinal]" -map "[finalout]" \
  -c:v libx264 -preset fast -crf 22 \
  -c:a aac -b:a 192k \
  output.mp4
```

#### 进度解析

FFmpeg输出示例：
```
frame= 1234 fps= 30 q=28.0 size=   12345kB time=00:00:41.13 bitrate=2458.3kbits/s speed=1.5x
```

解析逻辑：
```python
import re

def parse_ffmpeg_progress(line, total_duration):
    # 提取time字段
    match = re.search(r'time=(\d+):(\d+):(\d+\.\d+)', line)
    if match:
        h, m, s = match.groups()
        current_time = int(h) * 3600 + int(m) * 60 + float(s)
        progress = (current_time / total_duration) * 100
        return progress
    return None
```

#### 后端API

- `POST /api/export/start` - 开始导出
  - 请求：`{timeline: EditTimeline, exportConfig: ExportConfig}`
  - 响应：`{taskId: string}`

- WebSocket推送进度：`{taskId, progress, stage}`

---

## UI界面设计

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  顶部菜单栏：文件 编辑 视图 工具 帮助                            │
├─────────────────────────────────────────────────────────────┤
│  工具栏：[导入] [AI分析] [导出] [撤销] [重做] [设置]           │
├──────────────────┬──────────────────────────┬───────────────┤
│                  │                          │               │
│   素材库区域      │    视频预览窗口           │   属性面板     │
│   (左侧 20%)     │    (中间 50%)            │   (右侧 30%)  │
│                  │                          │               │
│  ┌────────────┐  │   ┌──────────────────┐   │  ┌─────────┐ │
│  │ 视频1.mp4  │  │   │                  │   │  │视频属性 │ │
│  │ [缩略图]   │  │   │   预览播放器      │   │  │字幕编辑 │ │
│  └────────────┘  │   │                  │   │  │音频设置 │ │
│  ┌────────────┐  │   └──────────────────┘   │  │特效参数 │ │
│  │ 视频2.mp4  │  │   ◄◄ ▶ ►► | 00:30       │  └─────────┘ │
│  └────────────┘  │                          │               │
│                  │                          │               │
│  [AI分析结果]    │                          │               │
│  ✅ 片段1 精彩   │                          │               │
│  ❌ 片段2 删除   │                          │               │
│                  │                          │               │
├──────────────────┴──────────────────────────┴───────────────┤
│                     时间轴区域（底部 30%）                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 视频轨 ▼ ■■■■■■  ■■■■  ■■■■■■■■                     │  │
│  │ 音频轨 ▼ ～～～～～～～～～～～～～～                     │  │
│  │ 字幕轨 ▼ [文字1]  [文字2]    [文字3]                  │  │
│  │ 配乐轨 ▼ ♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪                         │  │
│  └───────────────────────────────────────────────────────┘  │
│     0:00      0:30      1:00      1:30      2:00      2:30   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心界面组件

#### 4.2.1 顶部工具栏

**按钮功能：**

1. **导入素材**
   - 点击打开文件选择对话框
   - 支持多选（Ctrl+点击）
   - 支持拖拽到窗口

2. **AI自动分析**
   - 点击弹出配置对话框：
     ```
     ┌─────────────────────────┐
     │  AI自动分析配置          │
     ├─────────────────────────┤
     │  目标时长：[====●====] │
     │  1分钟    3-5分钟  10分钟│
     │                         │
     │  画幅比例：              │
     │  ○ 9:16 竖屏（推荐）     │
     │  ○ 16:9 横屏            │
     │  ○ 1:1 方形             │
     │                         │
     │  剪辑风格（可选）：       │
     │  ○ 紧凑型（快节奏）      │
     │  ○ 舒缓型（慢节奏）      │
     │                         │
     │  [取消]  [开始分析]      │
     └─────────────────────────┘
     ```
   - 点击"开始分析"后显示进度条

3. **导出视频**
   - 设置导出参数（分辨率、格式、码率）
   - 选择保存位置
   - 开始导出

4. **撤销/重做**
   - 支持Ctrl+Z / Ctrl+Y快捷键

5. **项目设置**
   - 项目名称
   - 保存路径
   - 自动保存间隔

#### 4.2.2 素材库区域（左侧）

**Tab 1: 素材列表**

- 网格视图显示缩略图
- 每个素材卡片显示：
  - 缩略图
  - 文件名
  - 时长标签（如"02:34"）
- 双击素材 → 添加到时间轴
- 右键菜单：
  - 重新分析
  - 删除
  - 查看详情

**Tab 2: AI分析结果**

显示AI建议的片段列表：

```
✅ 片段1 (00:10-00:35)
   「海边日落，画面优美」
   精彩度：92 分
   [建议保留] ✓

❌ 片段2 (00:35-01:20)
   「静止画面，无明显内容」
   精彩度：28 分
   [建议删除] ✗

✅ 片段3 (01:20-02:10)
   「人物特写，情绪饱满」
   精彩度：85 分
   [建议保留] ✓
```

- 点击片段 → 预览窗口跳转播放
- 勾选框：确认AI建议 / 手动调整

#### 4.2.3 视频预览窗口（中间）

**功能：**
- 实时预览当前编辑状态的视频
- 集成Video.js播放器

**控制条：**
```
◄◄  ▶/❚❚  ►►  |  00:00:30 / 00:03:45  |  [音量] 🔊  [全屏]
```

- 播放/暂停：空格键
- 快退5秒：左箭头
- 快进5秒：右箭头
- 逐帧播放：< 和 > 键
- 全屏预览：F键

**分屏对比（可选功能）：**
```
┌───────────┬───────────┐
│  原始素材  │  剪辑后   │
└───────────┴───────────┘
```

#### 4.2.4 属性面板（右侧）

**动态显示选中元素的属性**

**选中视频片段时：**
```
┌─────────────────┐
│ 视频片段属性     │
├─────────────────┤
│ 时长：00:00:25  │
│ 入点：00:10     │
│ 出点：00:35     │
│                 │
│ 音量：[==●==] 80%│
│                 │
│ 变速：          │
│ ○ 正常 1.0x     │
│ ○ 慢动作 0.5x   │
│ ○ 快动作 2.0x   │
│                 │
│ [应用修改]      │
└─────────────────┘
```

**选中字幕时：**
```
┌─────────────────┐
│ 字幕编辑        │
├─────────────────┤
│ 文本：          │
│ ┌─────────────┐ │
│ │今天天气真好  │ │
│ └─────────────┘ │
│                 │
│ 类型：          │
│ ● 语音字幕      │
│ ○ 场景描述      │
│ ○ 关键词标注    │
│                 │
│ 字体：微软雅黑   │
│ 字号：[====●] 48│
│ 颜色：[⬜白色]  │
│ 描边：[⬛黑色]  │
│                 │
│ 动画效果：      │
│ [淡入淡出 ▼]    │
│                 │
│ [应用修改]      │
└─────────────────┘
```

**选中配乐时：**
```
┌─────────────────┐
│ 背景音乐        │
├─────────────────┤
│ 曲名：Summer    │
│ 时长：00:03:20  │
│                 │
│ 音量：[==●==] 50%│
│                 │
│ 淡入：3 秒      │
│ 淡出：3 秒      │
│                 │
│ [更换音乐]      │
│ [应用修改]      │
└─────────────────┘
```

#### 4.2.5 时间轴编辑器（底部）

**多轨道设计：**

```
时间刻度尺
├─ 0:00 ─── 0:30 ─── 1:00 ─── 1:30 ─── 2:00 ─── 2:30 ───┤
│                         ▼ 播放指针                       │
├─────────────────────────────────────────────────────────┤
│ 视频轨道 ▼                                               │
│ ┌──────┐  ┌────┐  ┌──────────┐                         │
│ │片段1  │  │片段2│  │  片段3   │                         │
│ └──────┘  └────┘  └──────────┘                         │
├─────────────────────────────────────────────────────────┤
│ 音频轨道 ▼                                               │
│ ～～～～～～～～～～～～～～～～～～～～～～                │
│         (音频波形可视化)                                  │
├─────────────────────────────────────────────────────────┤
│ 字幕轨道 ▼                                               │
│   [你好世界]    [第二句]         [第三句]                │
├─────────────────────────────────────────────────────────┤
│ 配乐轨道 ▼                                               │
│ ♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪♪                           │
└─────────────────────────────────────────────────────────┘
```

**核心功能：**

1. **时间刻度尺**
   - 显示时间标记（0:00, 0:30, 1:00...）
   - 缩放：滚轮或+/-按钮
   - 点击跳转到任意时间点

2. **播放指针**
   - 红色竖线，随播放移动
   - 拖拽跳转到任意位置

3. **视频轨道**
   - 片段显示：矩形块，内含缩略图条带
   - 拖拽调整位置和顺序
   - 拖拽边缘调整裁剪点
   - 右键菜单：分割、删除、复制

4. **音频轨道**
   - 波形可视化
   - 音量包络线（可拖拽调节）

5. **字幕轨道**
   - 字幕块显示部分文字
   - 拖拽调整时间和时长
   - 点击编辑内容

6. **配乐轨道**
   - 音乐波形显示
   - 淡入淡出可视化

**交互细节：**
- 吸附对齐：拖拽时自动对齐其他片段边缘
- 磁性吸附距离：5像素
- 分割工具：按S键，点击位置分割片段
- 多选：Ctrl+点击，批量操作

### 4.3 关键交互流程

#### 流程1：AI自动剪辑完整流程

```
1. 用户打开软件
   ↓
2. 导入3段视频素材（每段5-8分钟）
   - 拖拽到素材库区域
   - 或点击"导入"按钮
   ↓
3. 素材库显示3个视频卡片
   - 自动生成缩略图
   - 显示时长信息
   ↓
4. 用户点击"AI自动分析"
   ↓
5. 弹出配置对话框
   - 目标时长：3-5分钟（滑块调整）
   - 画幅：9:16竖屏（单选）
   - 剪辑风格：舒缓型（可选）
   ↓
6. 点击"开始分析"
   ↓
7. 显示进度条 + WebSocket实时推送
   ┌────────────────────────┐
   │ 正在分析视频内容...     │
   │ [========●    ] 65%    │
   │ 预计剩余时间：1分30秒   │
   │                        │
   │ 当前阶段：              │
   │ ✓ 关键帧提取完成        │
   │ ✓ AI内容理解完成        │
   │ ● 语音识别中...        │
   │ ○ 生成剪辑建议          │
   │ ○ 匹配背景音乐          │
   └────────────────────────┘
   ↓
8. 分析完成（约3-5分钟）
   ↓
9. 左侧"AI分析结果"Tab显示建议片段列表
   ✅ 片段1：海边日落（精彩度92）
   ❌ 片段2：静止画面（精彩度28）
   ✅ 片段3：人物特写（精彩度85）
   ...共15个片段
   ↓
10. 用户逐个查看片段
    - 点击片段1 → 预览窗口播放
    - 确认保留 ✓
    - 点击片段2 → 预览播放
    - 确认删除 ✗
    - ...
   ↓
11. 所有片段确认完毕，点击"生成时间线"
   ↓
12. 时间轴自动填充
    - 视频轨道：保留的片段按顺序排列
    - 字幕轨道：AI生成的三种字幕
    - 配乐轨道：匹配的背景音乐
   ↓
13. 预览窗口自动播放完整效果
   ↓
14. 用户微调（可选）
    - 拖拽片段调整顺序
    - 编辑字幕文字
    - 调整音乐音量
   ↓
15. 满意后点击"导出"
   ↓
16. 弹出导出对话框
    - 分辨率：1080p
    - 格式：MP4
    - 保存位置：选择文件夹
   ↓
17. 点击"开始导出"
   ↓
18. 显示导出进度
    ┌────────────────────────┐
    │ 正在导出视频...         │
    │ [===========● ] 85%    │
    │ 预计剩余时间：2分钟     │
    └────────────────────────┘
   ↓
19. 导出完成
    ┌────────────────────────┐
    │ ✓ 导出成功！            │
    │ 文件保存在：            │
    │ D:\Videos\output.mp4   │
    │                        │
    │ [打开文件夹] [关闭]     │
    └────────────────────────┘
```

**预计总时间：**
- AI分析：3-5分钟
- 用户确认：5-10分钟
- 微调：5分钟
- 导出：5-10分钟
- **总计：20-30分钟**

---

## 数据流与通信

### 5.1 前后端通信架构

**双通道设计：**

```
前端 Electron                    后端 FastAPI
    │                                │
    ├────── HTTP REST API ──────────>│  常规请求
    │<───────────────────────────────┤
    │                                │
    ├────── WebSocket ──────────────>│  进度推送
    │<───────────────────────────────┤
```

#### 通道1：HTTP REST API

**用途：** 常规请求-响应操作

**主要接口：**

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/import/video` | POST | 导入视频素材 |
| `/api/analyze/start` | POST | 启动AI分析 |
| `/api/analyze/result/{taskId}` | GET | 获取分析结果 |
| `/api/timeline/generate` | POST | 生成剪辑时间线 |
| `/api/subtitle/generate` | POST | 生成字幕 |
| `/api/music/search` | POST | 搜索背景音乐 |
| `/api/export/start` | POST | 开始导出视频 |
| `/api/project/save` | POST | 保存项目 |
| `/api/project/load/{projectId}` | GET | 加载项目 |
| `/api/health` | GET | 健康检查 |

#### 通道2：WebSocket

**用途：** 实时进度推送

**消息格式：**
```typescript
interface ProgressMessage {
  taskId: string;
  type: 'progress' | 'complete' | 'error';
  progress: number;        // 0-100
  stage: string;           // "视频分析中"、"字幕生成中"
  message: string;         // 详细信息
  data?: any;              // 完成时返回结果数据
}
```

**示例：**
```json
{
  "taskId": "task_12345",
  "type": "progress",
  "progress": 45,
  "stage": "AI内容理解",
  "message": "正在分析第2段视频..."
}
```

### 5.2 核心数据流

#### 完整AI剪辑流程数据流

```
用户操作              前端状态                后端处理                  AI服务
   │                      │                        │                        │
导入素材                   │                        │                        │
   ├─────────────> 更新素材列表                     │                        │
   │                      │                        │                        │
   │                      │ POST /import/video     │                        │
   │                      ├───────────────────────>│                        │
   │                      │                     生成缩略图                    │
   │                      │  返回素材信息            │                        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
点击AI分析                 │                        │                        │
   ├─────────────> 显示配置对话框                   │                        │
   │                      │                        │                        │
确认配置                   │                        │                        │
   ├─────────────> POST /analyze/start            │                        │
   │                      ├───────────────────────>│                        │
   │                      │                     创建Celery任务              │
   │                      │  返回任务ID             │                        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
   │                      │                        │  1. 提取关键帧          │
   │                      │                        ├──────────────────────> │
   │                      │  WS: 进度15%            │  通义千问API           │
   │                      │<───────────────────────┤  (视频理解)            │
   │                 显示进度条                      │                        │
   │                      │                        │  2. 提取音频            │
   │                      │                        ├──────────────────────> │
   │                      │  WS: 进度45%            │  讯飞星火API           │
   │                      │<───────────────────────┤  (语音识别)            │
   │                      │                        │                        │
   │                      │                        │  3. 生成剪辑建议        │
   │                      │                        │  (本地算法)            │
   │                      │  WS: 进度75%            │                        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
   │                      │                        │  4. 匹配背景音乐        │
   │                      │                        │  (音乐库API)           │
   │                      │  WS: 进度90%            │                        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
   │                      │  WS: 完成100%           │                        │
   │                      │  返回分析结果            │                        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
   │                 渲染分析结果                     │                        │
   │                 显示建议片段                     │                        │
   │                      │                        │                        │
确认片段                   │                        │                        │
   ├─────────────> 更新时间轴状态                   │                        │
   │                      │                        │                        │
   │                      │ POST /timeline/generate│                        │
   │                      ├───────────────────────>│                        │
   │                      │  返回时间轴JSON         │  生成时间线数据        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
   │                 渲染时间轴                       │                        │
   │                      │                        │                        │
点击导出                   │                        │                        │
   ├─────────────> POST /export/start             │                        │
   │                      ├───────────────────────>│                        │
   │                      │                        │  FFmpeg合成视频        │
   │                      │  WS: 导出进度           │                        │
   │                      │<───────────────────────┤                        │
   │                 显示导出进度                     │                        │
   │                      │                        │                        │
   │                      │  WS: 导出完成           │                        │
   │                      │  返回视频路径            │                        │
   │                      │<───────────────────────┤                        │
   │                      │                        │                        │
   │                 显示成功提示                     │                        │
```

### 5.3 数据持久化

**SQLite数据库表结构：**

#### 表1：Projects（项目表）

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  create_time DATETIME,
  update_time DATETIME,
  target_duration INTEGER,     -- 目标时长（秒）
  aspect_ratio TEXT,           -- 画幅比例 "9:16"
  status TEXT                  -- 'editing', 'exported'
);
```

#### 表2：Assets（素材表）

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  file_name TEXT,
  file_path TEXT,
  duration REAL,
  resolution TEXT,             -- "1920x1080"
  frame_rate REAL,
  thumbnails TEXT,             -- JSON数组
  analyzed BOOLEAN,            -- 是否已分析
  analysis_result TEXT,        -- JSON格式的分析结果
  create_time DATETIME,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
```

#### 表3：Timeline（时间轴表）

```sql
CREATE TABLE timeline_clips (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  asset_id TEXT,
  track_type TEXT,             -- 'video', 'audio', 'subtitle', 'music'
  timeline_start REAL,
  timeline_duration REAL,
  source_start REAL,
  source_end REAL,
  properties TEXT,             -- JSON格式的属性（音量、样式等）
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);
```

#### 项目保存/加载流程

**保存项目：**
```
用户点击"保存" (Ctrl+S)
    ↓
前端收集当前状态：
    - 项目元信息
    - 素材列表
    - 时间轴数据（所有轨道的所有片段）
    ↓
POST /api/project/save
    ↓
后端写入数据库（事务）
    - 更新projects表
    - 更新assets表
    - 清空并重新插入timeline_clips表
    ↓
返回成功
```

**加载项目：**
```
用户选择项目
    ↓
GET /api/project/load/{projectId}
    ↓
后端从数据库读取：
    - projects表
    - assets表（关联查询）
    - timeline_clips表（关联查询）
    ↓
返回完整项目JSON
    ↓
前端恢复状态：
    - 素材库显示素材
    - 时间轴渲染所有片段
    - 预览窗口准备就绪
```

---

## Agent Teams分工

### 6.1 团队结构

```
项目经理/架构师 (Project Lead)
        │
        ├─────────────┬─────────────┬─────────────┬─────────────┐
        │             │             │             │             │
   前端UI开发     时间轴开发    后端核心开发   AI集成开发   视频处理开发
   (Frontend)   (Timeline)    (Backend)    (AI Agent)  (Video Engine)
```

### 6.2 成员职责详解

#### 成员1：前端UI开发 (Frontend Developer)

**职责范围：**
- Electron应用框架搭建
- 整体UI布局实现
- 素材库、预览窗口、属性面板开发
- 用户交互逻辑
- 状态管理（Redux）
- 与后端API对接

**具体任务清单（20项）：**

1. 搭建Electron + React + TypeScript项目脚手架
2. 配置Webpack/Vite构建工具
3. 集成Redux Toolkit状态管理
4. 实现主窗口布局（顶部/左侧/中间/右侧/底部）
5. 开发顶部菜单栏（文件、编辑、视图、工具、帮助）
6. 开发工具栏（导入、AI分析、导出等按钮）
7. 实现素材导入功能（文件选择对话框）
8. 实现拖拽上传功能
9. 开发素材库网格视图
10. 集成Video.js实现视频预览播放器
11. 开发播放控制条（播放/暂停、进度条、音量）
12. 实现属性面板动态切换（视频/字幕/音频属性）
13. 开发AI分析配置对话框
14. 实现进度条组件
15. 配置WebSocket客户端，接收进度推送
16. 开发导出配置对话框
17. 实现项目保存/加载UI
18. 封装后端API调用模块（Axios）
19. 实现撤销/重做功能（操作历史栈）
20. 使用Electron Builder配置打包

**技术栈：**
- Electron, React, TypeScript
- Redux Toolkit
- Ant Design, TailwindCSS
- Video.js, Axios, Socket.io-client

**交付物：**
- Electron前端应用代码
- UI组件库
- 状态管理模块
- API调用封装

**依赖关系：**
- 依赖后端核心开发提供API
- 依赖时间轴开发提供时间轴组件
- 为所有成员提供UI集成接口

---

#### 成员2：时间轴开发 (Timeline Developer)

**职责范围：**
- 专注开发专业级时间轴编辑器
- 多轨道渲染（视频、音频、字幕、配乐）
- 拖拽交互（片段位置、顺序、时长调整）
- 时间刻度计算与缩放
- 吸附对齐逻辑

**具体任务清单（15项）：**

1. 设计时间轴数据结构
2. 开发时间刻度尺组件（Canvas渲染）
3. 实现时间轴缩放功能（滚轮缩放）
4. 开发播放指针组件（同步视频播放）
5. 实现多轨道容器组件
6. 开发视频轨道（显示片段缩略图条带）
7. 开发音频轨道（波形可视化）
8. 开发字幕轨道（字幕块显示）
9. 开发配乐轨道（音乐波形）
10. 实现片段拖拽功能（react-dnd）
11. 实现片段边缘拖拽（调整入点/出点）
12. 开发吸附对齐算法（磁性吸附）
13. 实现片段右键菜单（分割、删除、复制）
14. 开发分割工具（按S键分割）
15. 性能优化（虚拟滚动、Canvas离屏渲染）

**技术栈：**
- React, TypeScript
- Canvas API
- react-dnd
- 自研时间轴算法

**交付物：**
- Timeline React组件
- 时间轴状态管理逻辑
- 拖拽交互库
- 时间计算工具函数

**依赖关系：**
- 被前端UI开发集成
- 接收后端返回的时间轴JSON数据

---

#### 成员3：后端核心开发 (Backend Developer)

**职责范围：**
- FastAPI后端框架搭建
- RESTful API开发
- WebSocket实时通信
- 数据库设计和操作
- 任务队列管理（Celery）
- 项目保存/加载
- 音乐库API集成

**具体任务清单（20项）：**

1. 搭建FastAPI项目结构
2. 设计SQLite数据库表结构
3. 配置SQLAlchemy ORM
4. 实现数据库迁移脚本
5. 开发素材导入API (`POST /import/video`)
6. 开发AI分析启动API (`POST /analyze/start`)
7. 开发分析结果查询API (`GET /analyze/result/{taskId}`)
8. 开发时间线生成API (`POST /timeline/generate`)
9. 开发字幕生成API (`POST /subtitle/generate`)
10. 开发音乐搜索API (`POST /music/search`)
11. 开发导出启动API (`POST /export/start`)
12. 开发项目保存API (`POST /project/save`)
13. 开发项目加载API (`GET /project/load/{projectId}`)
14. 配置Celery任务队列 + Redis
15. 实现WebSocket服务（进度推送）
16. 集成无版权音乐库API（爱给网/淘声网）
17. 开发健康检查API (`GET /health`)
18. 实现日志系统（structured logging）
19. 配置CORS（允许Electron前端访问）
20. 使用PyInstaller打包后端为独立.exe

**技术栈：**
- FastAPI, Python 3.10+
- SQLAlchemy, SQLite
- Celery, Redis
- WebSocket
- Requests

**交付物：**
- FastAPI后端服务
- 完整API文档（自动生成）
- 数据库模型和迁移脚本
- 任务队列配置
- 后端独立可执行文件

**依赖关系：**
- 为前端UI开发提供API
- 调用AI集成开发的模块
- 调用视频处理开发的模块
- 协调所有后端任务流程

---

#### 成员4：AI集成开发 (AI Integration Developer)

**职责范围：**
- 通义千问API集成
- 讯飞星火API集成
- 视频内容理解逻辑
- 剪辑策略生成算法
- 字幕生成逻辑
- 音乐情绪匹配算法

**具体任务清单（15项）：**

1. 注册并配置通义千问API密钥
2. 注册并配置讯飞星火API密钥
3. 开发通义千问SDK调用封装
4. 开发讯飞星火SDK调用封装
5. 实现视频关键帧提取模块（调用视频处理模块）
6. 设计通义千问Prompt（视频内容理解）
7. 实现视频场景分析逻辑
8. 实现精彩度评分算法
9. 开发剪辑策略生成算法（片段筛选、时长计算）
10. 实现语音转字幕功能（讯飞星火ASR）
11. 实现AI场景描述字幕生成
12. 实现关键词情绪标注生成
13. 开发音乐情绪标签生成
14. 实现音乐匹配算法（librosa分析BPM）
15. API调用异常处理和重试机制

**技术栈：**
- Python 3.10+
- 通义千问SDK (dashscope)
- 讯飞星火SDK
- librosa (音频分析)
- opencv-python (关键帧提取)

**交付物：**
- AI服务模块（Python包）
- API配置文档
- 剪辑策略算法文档
- 单元测试和示例

**依赖关系：**
- 被后端核心开发调用
- 依赖视频处理开发提取帧和音频
- 为后端提供分析结果JSON

---

#### 成员5：视频处理开发 (Video Engine Developer)

**职责范围：**
- FFmpeg集成和调用
- 视频编解码
- 缩略图生成
- 视频剪切、合成
- 字幕渲染
- 音频混合
- 最终视频导出

**具体任务清单（18项）：**

1. 下载并集成FFmpeg二进制文件
2. 开发FFmpeg调用封装（subprocess）
3. 实现视频信息提取（ffprobe）
4. 开发缩略图生成模块（每N秒一帧）
5. 实现关键帧提取（场景检测）
6. 开发音频提取模块
7. 实现视频剪切功能（trim滤镜）
8. 开发视频拼接合成（concat）
9. 实现字幕渲染（drawtext滤镜）
10. 开发ASS字幕文件生成（支持复杂样式）
11. 实现音频混合（背景音乐+原音频）
12. 开发音频淡入淡出处理
13. 实现最终视频导出模块
14. 开发FFmpeg进度解析（实时进度）
15. 支持多种分辨率导出（1080p/720p/4K）
16. 支持多种格式导出（MP4/MOV）
17. 实现硬件加速（NVENC/Quick Sync）
18. 性能优化（多线程、代理文件机制）

**技术栈：**
- Python 3.10+
- FFmpeg (subprocess)
- moviepy (可选)
- Pillow (图像处理)

**交付物：**
- 视频处理引擎模块
- FFmpeg命令封装库
- 导出配置模板
- 性能优化文档

**依赖关系：**
- 被后端核心开发和AI集成开发调用
- 接收时间轴JSON数据生成最终视频
- 为AI集成提供帧和音频素材

---

### 6.3 协作流程

**协作关系图：**

```
前端UI开发 ←→ 时间轴开发
    ↓              ↓
    └──────┬───────┘
           ↓
    后端核心开发 (协调中心)
           ↓
    ┌──────┴──────┐
    ↓             ↓
AI集成开发 ←→ 视频处理开发
```

**关键协作点：**

1. **API契约优先**
   - 第一周定义所有API接口文档
   - 前后端基于契约并行开发
   - 使用Mock Server测试

2. **数据结构共享**
   - 所有数据结构用TypeScript定义（可生成JSON Schema）
   - 前后端共享同一份类型定义

3. **每日站会**
   - 15分钟同步进度
   - 提出阻塞问题

4. **联调时间**
   - 每周三次固定联调（周二、周四、周六）
   - 集成测试前后端对接

5. **代码审查**
   - 每个PR至少一人审查
   - 关键模块多人审查

---

### 6.4 开发阶段规划

**Phase 1：基础设施搭建（Week 1-2）**

| 成员 | 任务 | 交付物 |
|------|------|--------|
| 前端UI | Electron框架 + 基础布局 | 空白界面框架 |
| 时间轴 | 数据结构设计 + 刻度尺 | 时间轴原型 |
| 后端核心 | FastAPI框架 + 数据库 | 基础API服务 |
| AI集成 | API注册 + 测试调用 | API调用demo |
| 视频处理 | FFmpeg集成 + 基础测试 | 视频信息提取demo |

**Phase 2：核心功能开发（Week 3-6）**

| 成员 | 任务 | 交付物 |
|------|------|--------|
| 前端UI | 素材导入 + 预览播放 | 可导入和预览素材 |
| 时间轴 | 拖拽交互 + 多轨道 | 可编辑的时间轴 |
| 后端核心 | API接口实现 + WebSocket | 完整API服务 |
| AI集成 | 视频分析 + 剪辑策略 | AI分析模块 |
| 视频处理 | 视频剪切 + 合成 | 视频处理模块 |

**Phase 3：AI功能集成（Week 7-9）**

| 成员 | 任务 | 交付物 |
|------|------|--------|
| 前端UI | AI分析UI + 结果展示 | AI分析界面 |
| 时间轴 | AI建议标记 | 时间轴显示AI建议 |
| 后端核心 | 任务队列 + 进度推送 | 完整异步任务系统 |
| AI集成 | 字幕生成 + 音乐匹配 | 完整AI功能 |
| 视频处理 | 字幕渲染 + 音频混合 | 完整视频导出 |

**Phase 4：完善与优化（Week 10-12）**

| 成员 | 任务 | 交付物 |
|------|------|--------|
| 前端UI | 项目保存/加载 + 设置 | 完善的UI |
| 时间轴 | 性能优化 + 细节 | 流畅的时间轴 |
| 后端核心 | 异常处理 + 日志 | 稳定的后端 |
| AI集成 | 算法优化 + 成本控制 | 优化的AI模块 |
| 视频处理 | 导出优化 + 格式支持 | 优化的视频引擎 |

**Phase 5：测试与打包（Week 13-14）**

- 集成测试（所有成员）
- 用户体验测试
- Bug修复
- 打包成.exe安装程序
- 文档编写

---

## API与配置清单

### 7.1 AI模型API配置

#### 7.1.1 通义千问 Qwen-VL

**用途：**
- 视频关键帧内容理解
- 场景描述生成
- 精彩度评分
- 情绪分析
- 字幕生成（场景描述、关键词）

**获取步骤：**

1. 访问：https://dashscope.aliyun.com/
2. 注册阿里云账号
3. 实名认证（中国大陆用户）
4. 开通"灵积模型服务"
5. 控制台 → API-KEY管理 → 创建新的API-KEY
6. 复制API Key

**配置：**
```python
# backend/config.py
QWEN_API_KEY = "sk-xxxxxxxxxxxxx"  # 替换为你的API Key
QWEN_MODEL = "qwen-vl-max"         # 或 qwen-vl-plus
```

**计费说明：**
- qwen-vl-max：约 ¥0.02/千tokens
- qwen-vl-plus：约 ¥0.008/千tokens（便宜但效果稍差）
- 处理一个5分钟视频（30帧）：预计 ¥0.5-1.0

**API限制：**
- 免费额度：新用户100万tokens
- 每分钟请求限制：60次（可申请提高）
- 单次最大图片数：10张

**文档：**
https://help.aliyun.com/zh/dashscope/developer-reference/vl-plus-quick-start

---

#### 7.1.2 讯飞星火（语音识别）

**用途：**
- 视频人声识别
- 语音转文字
- 生成带时间戳的字幕

**获取步骤：**

1. 访问：https://www.xfyun.cn/
2. 注册讯飞开放平台账号
3. 实名认证
4. 控制台 → 创建应用
5. 选择"语音听写（流式版）"或"语音转写"服务
6. 应用管理 → 查看APPID、APISecret、APIKey

**配置：**
```python
# backend/config.py
XUNFEI_APPID = "xxxxxxxx"
XUNFEI_API_SECRET = "xxxxxxxxxxxxxxxx"
XUNFEI_API_KEY = "xxxxxxxxxxxxxxxx"
```

**计费说明：**
- 语音转写：¥0.33/分钟（音频时长）
- 免费额度：新用户5小时

**API限制：**
- 单个文件最大500MB
- 最长音频时长5小时

**文档：**
https://www.xfyun.cn/doc/asr/voicedictation/API.html

---

### 7.2 音乐库配置

#### 7.2.1 在线音乐库API（可选）

**爱给网 API：**
- 官网：https://www.aigei.com/
- 目前可能没有公开API，需要商务洽谈

**淘声网 API：**
- 官网：https://www.taosound.com/
- 类似情况

**推荐方案：** 暂不依赖API，使用内置音乐库

---

#### 7.2.2 内置音乐库（推荐）

**获取步骤：**

1. 访问以下免费音乐平台：
   - YouTube Audio Library：https://studio.youtube.com/
   - Pixabay Music：https://pixabay.com/music/
   - Incompetech：https://incompetech.com/music/

2. 下载20-30首不同情绪的配乐

3. 分类整理：
   ```
   backend/data/music_library/
   ├── happy/          (欢快)
   │   ├── music1.mp3
   │   ├── music2.mp3
   ├── relaxed/        (舒缓)
   │   ├── music3.mp3
   ├── excited/        (激动)
   │   ├── music4.mp3
   ├── heartwarming/   (温馨)
   │   ├── music5.mp3
   └── sad/            (悲伤)
       ├── music6.mp3
   ```

4. 创建音乐元数据JSON：
   ```json
   {
     "musics": [
       {
         "id": "music1",
         "title": "Happy Summer",
         "path": "happy/music1.mp3",
         "duration": 180,
         "tags": ["happy", "upbeat", "outdoor"],
         "bpm": 120
       },
       ...
     ]
   }
   ```

---

### 7.3 其他必需软件

#### 7.3.1 FFmpeg

**用途：** 所有视频处理操作

**获取步骤：**

1. 访问：https://ffmpeg.org/download.html
2. 选择Windows版本
3. 下载 **Static Build**（完整独立版本）
4. 解压到项目目录：
   ```
   backend/bin/ffmpeg/
   ├── ffmpeg.exe
   ├── ffprobe.exe
   └── ffplay.exe
   ```

**配置：**
```python
# backend/config.py
FFMPEG_PATH = "./bin/ffmpeg/ffmpeg.exe"
FFPROBE_PATH = "./bin/ffmpeg/ffprobe.exe"
```

**验证安装：**
```bash
cd backend/bin/ffmpeg
ffmpeg.exe -version
```

**打包说明：**
- FFmpeg需要打包到最终.exe安装包
- 大小约100MB

---

#### 7.3.2 Redis（任务队列）

**用途：** Celery任务队列的消息中间件

**获取步骤（Windows）：**

**方案A：安装Redis**
1. 下载：https://github.com/tporadowski/redis/releases
2. 解压到任意目录
3. 运行 `redis-server.exe`

**方案B：使用Memurai（Windows优化版）**
1. 访问：https://www.memurai.com/
2. 下载安装

**方案C：不使用Redis（推荐用于简化）**
- 使用Python内置队列库（如RQ或threading.Queue）
- 简化部署，无需额外进程

**推荐：** 开发时用Redis，打包时用内存队列

**配置：**
```python
# backend/config.py
REDIS_URL = "redis://localhost:6379/0"  # 如果使用Redis
# 或
USE_IN_MEMORY_QUEUE = True              # 使用内存队列
```

---

### 7.4 开发环境配置

#### 7.4.1 前端开发环境

**必需软件：**
- Node.js 18+ ：https://nodejs.org/
- npm 或 yarn
- Git：https://git-scm.com/

**安装依赖：**
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 或使用yarn
yarn install
```

**package.json示例：**
```json
{
  "dependencies": {
    "electron": "^27.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "@reduxjs/toolkit": "^1.9.0",
    "react-redux": "^8.0.0",
    "antd": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "axios": "^1.4.0",
    "socket.io-client": "^4.5.0",
    "video.js": "^8.0.0",
    "react-dnd": "^16.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0",
    "webpack": "^5.0.0"
  }
}
```

---

#### 7.4.2 后端开发环境

**必需软件：**
- Python 3.10+：https://www.python.org/
- pip

**安装依赖：**
```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 安装依赖
pip install -r requirements.txt
```

**requirements.txt示例：**
```
fastapi==0.104.0
uvicorn[standard]==0.24.0
sqlalchemy==2.0.0
celery==5.3.0
redis==5.0.0
dashscope==1.14.0      # 通义千问SDK
websocket-client==1.6.0
moviepy==1.0.3
librosa==0.10.0
opencv-python==4.8.0
pillow==10.0.0
requests==2.31.0
pyinstaller==6.0.0     # 打包工具
```

---

### 7.5 配置文件模板

**完整配置文件：backend/config.py**

```python
import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent

# ==================== AI API配置 ====================
# 通义千问
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "sk-xxxxxxxxxxxxx")
QWEN_MODEL = "qwen-vl-max"  # 或 "qwen-vl-plus"

# 讯飞星火
XUNFEI_APPID = os.getenv("XUNFEI_APPID", "xxxxxxxx")
XUNFEI_API_SECRET = os.getenv("XUNFEI_API_SECRET", "xxxxxxxxxxxxxxxx")
XUNFEI_API_KEY = os.getenv("XUNFEI_API_KEY", "xxxxxxxxxxxxxxxx")

# ==================== FFmpeg配置 ====================
FFMPEG_PATH = str(BASE_DIR / "bin/ffmpeg/ffmpeg.exe")
FFPROBE_PATH = str(BASE_DIR / "bin/ffmpeg/ffprobe.exe")

# ==================== 数据库配置 ====================
DATABASE_URL = f"sqlite:///{BASE_DIR}/data/projects.db"

# ==================== 任务队列配置 ====================
USE_IN_MEMORY_QUEUE = True  # True=内存队列, False=Redis
REDIS_URL = "redis://localhost:6379/0"

# ==================== 音乐库配置 ====================
MUSIC_LIBRARY_PATH = str(BASE_DIR / "data/music_library")
MUSIC_METADATA_PATH = str(BASE_DIR / "data/music_library/metadata.json")

# ==================== 临时文件配置 ====================
TEMP_DIR = str(BASE_DIR / "temp")
THUMBNAIL_DIR = str(BASE_DIR / "temp/thumbnails")
CACHE_DIR = str(BASE_DIR / "temp/cache")

# ==================== 日志配置 ====================
LOG_LEVEL = "INFO"
LOG_FILE = str(BASE_DIR / "logs/app.log")

# ==================== 其他配置 ====================
MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
ALLOWED_VIDEO_FORMATS = [".mp4", ".mov", ".avi", ".mkv"]
```

---

### 7.6 配置检查清单

**你需要完成的配置任务：**

| 任务 | 必需性 | 预计时间 | 说明 |
|------|--------|----------|------|
| ✅ 注册通义千问账号并获取API Key | 必需 | 15分钟 | 有免费额度 |
| ✅ 注册讯飞星火账号并获取密钥 | 必需 | 15分钟 | 有免费额度 |
| ✅ 下载FFmpeg二进制文件 | 必需 | 10分钟 | 免费开源 |
| ⚠️ 安装Redis（或选择内存队列） | 可选 | 20分钟 | 推荐用内存队列简化 |
| ⚠️ 下载内置音乐库（20-30首） | 推荐 | 1-2小时 | 或后续接入API |
| ✅ 安装Node.js和Python环境 | 必需 | 30分钟 | 开发必需 |
| ✅ 创建config.py并填入密钥 | 必需 | 5分钟 | 基于模板填写 |

**总计预估时间：2-3小时**

---

## 后续功能规划

### 8.1 功能优先级矩阵

| 功能 | 用户价值 | 开发成本 | 优先级 | 预计周期 |
|------|----------|----------|--------|----------|
| 视频转场效果 | 高 | 中 | P0 | 1-2周 |
| 滤镜与调色 | 高 | 中 | P0 | 2周 |
| 批量导出 | 高 | 低 | P0 | 1周 |
| 视频特效（画中画、分屏） | 中 | 高 | P1 | 2-3周 |
| 持续导入素材 | 中 | 中 | P1 | 1-2周 |
| AI语音解说 | 中 | 中 | P2 | 2周 |
| 关键帧动画 | 低 | 高 | P2 | 3周 |
| 绿幕抠图 | 低 | 高 | P3 | 2-3周 |
| 字幕翻译 | 中 | 低 | P2 | 1周 |
| 云端同步 | 低 | 高 | P3 | 4周 |

### 8.2 Phase 2功能详解（MVP后1-2个月）

#### 8.2.1 视频转场效果

**功能描述：**
- 片段之间自动添加转场
- 支持多种转场样式（淡入淡出、滑动、缩放等）
- AI根据场景类型推荐转场

**技术实现：**
- FFmpeg xfade滤镜
- 时间轴UI增加转场标记图标

**Agent分工：**
- 视频处理开发：实现FFmpeg xfade调用
- 时间轴开发：时间轴显示转场图标
- AI集成开发：推荐转场类型

---

#### 8.2.2 滤镜与调色

**功能描述：**
- 预设滤镜（复古、清新、电影感等）
- 亮度、对比度、饱和度调整
- AI自动调色

**技术实现：**
- FFmpeg颜色滤镜（eq, hue, colorbalance）
- LUT（Look-Up Table）文件

**Agent分工：**
- 视频处理开发：FFmpeg滤镜集成
- 前端UI开发：滤镜选择UI
- AI集成开发：自动调色算法

---

#### 8.2.3 批量导出

**功能描述：**
- 一键导出多种分辨率（1080p/720p/480p）
- 一键导出多种比例（9:16/16:9/1:1）

**技术实现：**
- FFmpeg并行导出
- 预设导出模板

**Agent分工：**
- 视频处理开发：批量导出逻辑
- 后端核心开发：任务队列管理
- 前端UI开发：批量导出UI

---

### 8.3 长期规划（6个月+）

- AI语音解说（TTS集成）
- 关键帧动画
- 绿幕抠图
- 云端同步
- 多人协作编辑

---

## 技术风险与挑战

### 9.1 风险清单

#### 风险1：AI理解准确性不足

**风险描述：**
- 通义千问可能误判视频内容
- 精彩度评分不符合用户预期
- 生成的剪辑建议需要大量手动调整

**影响：** 用户体验下降，自动化率低于80%

**缓解措施：**
1. 提供详细的AI建议解释（为什么保留/删除）
2. 用户可以轻松推翻AI建议（一键反选）
3. 收集用户反馈，持续优化Prompt
4. 添加用户自定义规则（如"保留所有人脸特写"）
5. A/B测试不同Prompt版本

**责任人：** AI集成开发

---

#### 风险2：API成本过高

**风险描述：**
- 频繁调用AI API导致成本增加
- 处理长视频时关键帧过多

**影响：** 运营成本高

**缓解措施：**
1. 智能采样策略（场景稳定时减少采样）
2. 提供"精细分析"和"快速分析"两种模式
3. 本地缓存分析结果（同一视频不重复分析）
4. 用户自费模式（用户填入自己的API Key）
5. 成本监控和预警

**责任人：** AI集成开发 + 后端核心开发

---

#### 风险3：视频处理性能问题

**风险描述：**
- 长视频处理耗时长（10分钟视频可能需要5-10分钟处理）
- 预览卡顿
- 导出速度慢

**影响：** 用户体验差

**缓解措施：**
1. 代理文件机制：导入时生成低分辨率代理，编辑时用代理，导出时用原片
2. FFmpeg硬件加速（NVIDIA NVENC、Intel Quick Sync）
3. 后台异步处理，不阻塞UI
4. 进度提示和预计剩余时间
5. 多线程并行处理

**责任人：** 视频处理开发

---

#### 风险4：跨平台兼容性

**风险描述：**
- FFmpeg在不同系统行为可能不一致
- Windows打包后的依赖问题

**影响：** 软件无法正常运行

**缓解措施：**
1. MVP阶段只专注Windows
2. 充分测试不同Windows版本（Win10、Win11）
3. 使用相对路径和环境变量
4. 完善的错误日志
5. 打包测试（在干净的Windows系统测试安装）

**责任人：** 所有成员

---

#### 风险5：用户学习成本

**风险描述：**
- 界面复杂，用户不会用
- AI建议逻辑不透明

**影响：** 用户流失

**缓解措施：**
1. 新手引导教程（首次启动时）
2. 工具提示（Tooltip）
3. 视频教程和文档
4. AI建议附带清晰的理由说明
5. 用户反馈渠道

**责任人：** 前端UI开发 + 项目经理

---

### 9.2 应急预案

**如果AI效果不理想：**
- Plan B：降低AI自动化程度，改为"AI辅助+人工主导"模式
- 重点优化用户手动编辑的便利性

**如果开发进度延期：**
- 砍掉次要功能（如AI语音解说）
- 优先保证核心功能质量

**如果性能问题严重：**
- 限制视频时长（如单段最长20分钟）
- 降低分析精度（减少关键帧数量）

---

## 附录

### A.1 术语表

| 术语 | 解释 |
|------|------|
| MVP | Minimum Viable Product，最小可行产品 |
| ASR | Automatic Speech Recognition，自动语音识别 |
| TTS | Text-to-Speech，文本转语音 |
| BPM | Beats Per Minute，每分钟节拍数 |
| LUT | Look-Up Table，颜色查找表 |
| IPC | Inter-Process Communication，进程间通信 |
| ORM | Object-Relational Mapping，对象关系映射 |
| CORS | Cross-Origin Resource Sharing，跨域资源共享 |

### A.2 参考资源

**技术文档：**
- Electron官方文档：https://www.electronjs.org/docs
- FastAPI官方文档：https://fastapi.tiangolo.com/
- FFmpeg官方文档：https://ffmpeg.org/documentation.html
- 通义千问API文档：https://help.aliyun.com/zh/dashscope/
- 讯飞星火API文档：https://www.xfyun.cn/doc/

**学习资源：**
- React官方教程：https://react.dev/learn
- TypeScript官方文档：https://www.typescriptlang.org/docs/
- Python官方教程：https://docs.python.org/3/tutorial/

---

## 结语

这份设计文档详细规划了智能视频剪辑软件的方方面面，从系统架构到Agent Teams分工，从核心功能到后续规划，从技术选型到风险管理。

**设计核心理念：**
1. **AI为核心，人工为辅**：80%自动化 + 20%微调
2. **专业且易用**：专业级功能 + 友好的交互
3. **模块化设计**：前后端分离，职责清晰
4. **渐进式开发**：MVP优先，后续迭代

**成功标准：**
- ✅ 用户能在20-30分钟内完成一个3-5分钟短视频的剪辑
- ✅ AI生成的视频80%以上可直接发布
- ✅ 软件稳定运行，无重大Bug
- ✅ Agent Teams高效协作，按时交付

祝项目开发顺利！🎉
