import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient, { extractErrorMessage } from "@/services/api";
import type { MediaAsset } from "@/types/media";
import { formatDuration, formatFileSize } from "@/utils/format";
import "./MediaLibrary.css";

interface MediaLibraryProps {
  selectedAssetId?: string;
  onSelectAsset?: (asset: MediaAsset) => void;
}

function getAbsoluteFilePath(file: File): string {
  const fileWithPath = file as File & { path?: string };
  if (fileWithPath.path) {
    return fileWithPath.path;
  }

  if (window.electronAPI?.getPathForFile) {
    const result = window.electronAPI.getPathForFile(file);
    if (result) {
      return result;
    }
  }
  return file.name;
}

export default function MediaLibrary({
  selectedAssetId,
  onSelectAsset,
}: MediaLibraryProps): JSX.Element {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  const refreshAssets = useCallback(async () => {
    try {
      const items = await apiClient.listMediaAssets();
      setAssets(items);
    } catch (err) {
      setError(`获取素材列表失败：${extractErrorMessage(err)}`);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const handleImportClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,.mp4,.mov,.avi,.mkv,.flv";
    input.multiple = true;

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files ? Array.from(target.files) : [];
      if (files.length === 0) {
        return;
      }

      setLoading(true);
      setError("");

      const filePaths = files.map((file) => getAbsoluteFilePath(file));

      try {
        const response = await apiClient.importVideos(filePaths);
        setAssets((prev) => {
          const next = [...response.assets, ...prev];
          const dedup = new Map<string, MediaAsset>();
          for (const item of next) {
            dedup.set(item.id, item);
          }
          return Array.from(dedup.values());
        });

        if (response.assets.length > 0 && onSelectAsset) {
          onSelectAsset(response.assets[0]);
        }

        if (response.message) {
          setError(response.message);
        }
      } catch (err) {
        setError(`导入失败：${extractErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    };

    input.click();
  }, [onSelectAsset]);

  useEffect(() => {
    const triggerImport = () => {
      handleImportClick();
    };

    window.addEventListener("app:import-media", triggerImport);
    return () => {
      window.removeEventListener("app:import-media", triggerImport);
    };
  }, [handleImportClick]);

  const totalSizeText = useMemo(() => {
    const total = assets.reduce((sum, item) => sum + item.file_size, 0);
    return formatFileSize(total);
  }, [assets]);

  return (
    <section className="media-library">
      <header className="media-library-header">
        <h2>素材库</h2>
        <button type="button" className="import-button" disabled={loading} onClick={handleImportClick}>
          {loading ? "导入中..." : "导入素材"}
        </button>
      </header>

      <div className="media-tabs">
        <button type="button" className="media-tab media-tab-active">
          素材列表
        </button>
        <button type="button" className="media-tab media-tab-disabled" disabled>
          AI分析结果
        </button>
      </div>

      <p className="media-summary">
        共 {assets.length} 个素材 · 合计 {totalSizeText}
      </p>

      {error ? <div className="media-error">{error}</div> : null}

      <div className="media-grid" role="list">
        {initializing ? (
          <div className="media-empty">正在加载素材列表...</div>
        ) : null}

        {!initializing && assets.length === 0 ? (
          <div className="media-empty">
            <p>拖拽或点击导入视频素材</p>
            <p className="media-empty-sub">支持 mp4 / mov / avi / mkv / flv</p>
          </div>
        ) : null}

        {assets.map((asset) => (
          <article
            key={asset.id}
            role="listitem"
            className={`media-card ${selectedAssetId === asset.id ? "media-card-selected" : ""}`}
            onClick={() => onSelectAsset?.(asset)}
          >
            <div className="media-thumbnail">
              <div className="media-thumbnail-badge">{formatDuration(asset.duration)}</div>
              <div className="media-thumbnail-icon">视频</div>
            </div>
            <div className="media-info">
              <p className="media-name" title={asset.file_name}>
                {asset.file_name}
              </p>
              <p className="media-meta">
                {asset.resolution.width}x{asset.resolution.height}
              </p>
              <p className="media-meta">
                {asset.frame_rate.toFixed(0)} fps · {formatFileSize(asset.file_size)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
