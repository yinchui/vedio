import axios, { type AxiosInstance } from "axios";
import type { HealthCheckResponse, ImportVideoResponse, MediaAsset } from "@/types/media";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "未知错误";
}

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = import.meta.env.VITE_BACKEND_URL ?? DEFAULT_API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get<HealthCheckResponse>("/api/health");
    return response.data;
  }

  async importVideos(filePaths: string[]): Promise<ImportVideoResponse> {
    const response = await this.client.post<ImportVideoResponse>("/api/media/import", {
      file_paths: filePaths,
    });
    return response.data;
  }

  async listMediaAssets(): Promise<MediaAsset[]> {
    const response = await this.client.get<MediaAsset[]>("/api/media/list");
    return response.data;
  }

  async isBackendOnline(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.status === "ok";
    } catch {
      return false;
    }
  }
}

export const apiClient = new APIClient();
export default apiClient;
