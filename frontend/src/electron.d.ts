export {};

declare global {
  interface Window {
    electronAPI?: {
      version: string;
      getPathForFile?: (fileLike: unknown) => string;
    };
  }
}
