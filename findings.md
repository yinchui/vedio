# Findings & Decisions

## Requirements
- 按 `docs/plans/2026-02-14-mvp-phase1-infrastructure.md` 完成 Phase 1（Task 0-6）。
- 参考 `UI设计.pen` 的界面风格与布局，至少覆盖 Phase 1 对应的素材导入与基础工作区体验。
- 输出应可在本地运行并具备基础验证结果。

## Research Findings
- Phase 1 计划明确了前后端技术栈：Electron + React + TypeScript，FastAPI + Python。
- 后端核心在本阶段是：健康检查、FFmpeg 检查、视频信息提取、素材导入 API。
- 前端核心在本阶段是：Electron 启动、后端连通、素材导入 UI 与素材网格展示。
- `2026-02-14-ui-design-prompt-for-pencil.md` 说明整体 UI 应接近专业剪辑软件布局：顶部工具区 + 三栏工作区 + 底部时间轴。
- `UI设计.pen` 含多个状态画板，Phase 1 最关键参考为：`状态2-已导入素材-时间轴空`（`ncpDO`）和 `状态7-1280x720适配验证`（`Eadzg`）。
- 从 `.pen` 结构提取的关键比例：工作区左中右约 `20% / 50% / 30%`，底部时间轴高度约 `30%`，顶部双行栏高约 `80px`。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Phase 1 前端实现采用“专业剪辑台骨架 + 素材导入可用”的折中方案 | 兼顾计划功能目标与 UI 设计稿结构 |
| 后端 `VideoService` 提供可注入 ffprobe 路径 | 便于测试与未来跨平台扩展 |
| API 错误信息统一结构化返回 | 方便前端显示与排障 |
| 素材绝对路径通过 `file.path` 获取，并保留 `electronAPI.getPathForFile` 兼容兜底 | 兼容 Electron 27 且符合计划文档“使用 file.path”要求 |
| Electron 使用 `esbuild` 编译 `main.ts/preload.ts` | 避免直接运行 TS 的不稳定性，降低开发复杂度 |
| 素材绝对路径获取改为 `file.path` 优先 | 与计划文档一致，且兼容 Electron 27 类型定义 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 初次读取中文计划文档乱码 | 改用 UTF-8 编码重新读取 |
| `fastapi.testclient` 运行缺少 `httpx` | 改用协程调用 `health_check/check_ffmpeg` 做启动能力校验 |
| Playwright 浏览器缺少 Chrome 可执行文件 | 本轮跳过自动视觉回归，仅保留构建与单元测试验证 |
| `preload.ts` 使用 `webUtils` 触发 TS 类型报错 | 删除 `webUtils` 依赖并切换到 `file.path` |

## Resources
- `docs/plans/2026-02-14-mvp-phase1-infrastructure.md`
- `docs/plans/2026-02-14-ui-design-prompt-for-pencil.md`
- `docs/plans/2026-02-14-video-editing-software-design.md`
- `UI设计.pen`

## Visual/Browser Findings
- UI 提示词要求深色专业风格（主背景 `#2B2B2B`，面板 `#353535`，强调蓝 `#1890FF`）。
- 核心布局方向：顶部菜单/工具区、左素材库、中预览、右属性、底部时间轴。
- Phase 1 可优先实现左侧素材导入与中部基础预览占位，时间轴先给可扩展骨架。
- `.pen` 的状态2中，时间轴展示为空态提示文案，并保留刻度尺和轨道名；实现时应保持同样信息层级。
