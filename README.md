# AI智能剪辑助手

AI 视频自动剪辑桌面应用，当前实现 Phase 1 基础设施：前后端通信、素材导入与基础工作区界面。

## 技术栈
- 前端: Electron + React + TypeScript + Vite
- 后端: FastAPI + Python
- 视频信息提取: FFprobe

## 开发环境搭建

### 前端
```bash
cd frontend
npm install
npm run electron:dev
```

### 后端
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

## 项目结构
- `frontend/` Electron + React 客户端
- `backend/` FastAPI 服务与视频处理
- `docs/` 设计与计划文档

## 当前阶段
- [x] Phase 0: 设计文档
- [x] Phase 1: 基础设施搭建
- [ ] Phase 2: 核心功能开发
- [ ] Phase 3: AI功能集成

## 注意事项
- 若需要真实读取视频元信息，请将 `ffprobe.exe` 放入 `backend/bin/ffmpeg/`。
- 开发联调建议先启动后端，再启动前端。
