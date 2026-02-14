import { useEffect, useMemo, useState } from "react";

import MediaLibrary from "@/components/MediaLibrary";
import apiClient from "@/services/api";
import type { MediaAsset } from "@/types/media";
import { formatDuration, formatTimecode } from "@/utils/format";
import "./App.css";

type BackendStatus = "checking" | "online" | "offline";

export default function App(): JSX.Element {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [backendMessage, setBackendMessage] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  useEffect(() => {
    void checkBackend();
  }, []);

  const checkBackend = async () => {
    setBackendStatus("checking");
    try {
      const response = await apiClient.healthCheck();
      setBackendStatus("online");
      setBackendMessage(response.message);
    } catch (error) {
      setBackendStatus("offline");
      setBackendMessage("无法连接后端服务，请先启动 FastAPI 服务");
      console.error("Backend connection error:", error);
    }
  };

  const propertyRows = useMemo(() => {
    if (!selectedAsset) {
      return [
        { label: "时长", value: "00:00:00" },
        { label: "入点/出点", value: "00:00:00 - 00:00:00" },
        { label: "分辨率", value: "-" },
        { label: "帧率", value: "-" },
      ];
    }

    return [
      { label: "时长", value: formatTimecode(selectedAsset.duration) },
      { label: "入点/出点", value: `00:00:00 - ${formatTimecode(selectedAsset.duration)}` },
      {
        label: "分辨率",
        value: `${selectedAsset.resolution.width}x${selectedAsset.resolution.height}`,
      },
      { label: "帧率", value: `${selectedAsset.frame_rate.toFixed(2)} fps` },
    ];
  }, [selectedAsset]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="menu-row">
          <nav className="menu-list">
            <span>文件</span>
            <span>编辑</span>
            <span>视图</span>
            <span>工具</span>
            <span>帮助</span>
          </nav>
          <p className="brand-text">AI智能剪辑助手 · Mono+Blue</p>
        </div>
        <div className="toolbar-row">
          <div className="toolbar-left">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.dispatchEvent(new Event("app:import-media"))}
            >
              导入素材
            </button>
            <button type="button" className="btn btn-primary" disabled>
              AI自动分析
            </button>
            <button type="button" className="btn btn-primary" disabled>
              导出
            </button>
          </div>
          <div className="toolbar-right">
            <button type="button" className="btn btn-ghost" disabled>
              撤销
            </button>
            <button type="button" className="btn btn-ghost" disabled>
              重做
            </button>
            <button type="button" className="btn btn-ghost" disabled>
              设置
            </button>
          </div>
        </div>
      </header>

      <main className="work-area">
        <aside className="left-panel">
          <MediaLibrary
            selectedAssetId={selectedAsset?.id}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </aside>

        <section className="preview-panel">
          <h2>预览窗口</h2>
          <div className="video-player">
            <button type="button" className="play-button" aria-label="播放" disabled>
              ▶
            </button>
          </div>

          <div className="control-bar">
            <div className="control-group">
              <button type="button" className="control-button" disabled>
                ⏮
              </button>
              <button type="button" className="control-button control-button-main" disabled>
                {selectedAsset ? "▶" : "⏵"}
              </button>
              <button type="button" className="control-button" disabled>
                ⏭
              </button>
            </div>
            <div className="control-progress">
              <div className="progress-track">
                <div className="progress-fill" />
              </div>
              <span className="progress-time">
                00:00:00 / {selectedAsset ? formatTimecode(selectedAsset.duration) : "00:00:00"}
              </span>
            </div>
            <div className="control-group">
              <button type="button" className="control-button" disabled>
                🔈
              </button>
              <button type="button" className="control-button" disabled>
                ⛶
              </button>
            </div>
          </div>
          <p className="panel-hint">
            {selectedAsset
              ? `已选素材：${selectedAsset.file_name} · ${formatDuration(selectedAsset.duration)}`
              : "播放速率 1.0x | 代理模式：关闭"}
          </p>
        </section>

        <aside className="right-panel">
          <h2>属性面板</h2>
          <div className="property-tabs">
            <button type="button" className="property-tab property-tab-active">
              视频属性
            </button>
            <button type="button" className="property-tab" disabled>
              字幕编辑
            </button>
            <button type="button" className="property-tab" disabled>
              音频设置
            </button>
          </div>

          <div className="property-grid">
            {propertyRows.map((row) => (
              <div className="property-row" key={row.label}>
                <span className="property-label">{row.label}</span>
                <span className="property-value">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="slider-row">
            <span className="property-label">音量</span>
            <div className="slider-track">
              <div className="slider-fill" />
            </div>
          </div>

          <div className="speed-row">● 正常　○ 慢动作　○ 快动作</div>
        </aside>
      </main>

      <section className="timeline-panel">
        <h2>时间轴编辑器</h2>
        <div className="timeline-body">
          <div className="track-names">
            <span>▾ 视频轨道 V1</span>
            <span>▾ 音频轨道 A1</span>
            <span>▾ 字幕轨道 S1</span>
            <span>▾ 配乐轨道 M1</span>
          </div>
          <div className="track-main">
            <div className="ruler">
              <span>0:00</span>
              <span>0:30</span>
              <span>1:00</span>
              <span>1:30</span>
              <span>2:00</span>
              <span>2:30</span>
            </div>
            <div className="track-rows">
              <div className="row" />
              <div className="row row-alt" />
              <div className="row" />
              <div className="row row-alt" />
            </div>
            <div className="timeline-empty">
              <p>拖拽左侧素材到时间轴，开始自动或手动剪辑</p>
              <p className="timeline-empty-sub">支持多轨道：视频 / 音频 / 字幕 / 配乐</p>
            </div>
          </div>
        </div>
      </section>

      <div className={`backend-status backend-status-${backendStatus}`}>
        <span className="status-dot" />
        <span>
          后端状态：
          {backendStatus === "checking" ? "检查中..." : backendStatus === "online" ? "在线" : "离线"}
        </span>
        <span className="status-message">{backendMessage}</span>
        {backendStatus === "offline" ? (
          <button type="button" className="status-retry" onClick={() => void checkBackend()}>
            重试连接
          </button>
        ) : null}
      </div>
    </div>
  );
}
