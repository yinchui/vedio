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
