export {};

declare global {
  interface Window {
    videor: {
      choosePhotos(): Promise<string[]>;
      chooseAudio(): Promise<string | null>;
      filePath(file: File): string;
      fileUrl(path: string): string;
      newProject(): Promise<boolean>;
      openProject(): Promise<{ project: unknown; path: string } | null>;
      saveProject(project: unknown, saveAs?: boolean): Promise<string | null>;
      importProject(): Promise<{ project: unknown; path: null } | null>;
      exportProject(project: unknown): Promise<string | null>;
      loadAutosave(): Promise<unknown | null>;
      autosave(project: unknown): Promise<boolean>;
      exportVideo(project: unknown, options: unknown): Promise<string | null>;
      cancelExport(): Promise<boolean>;
      onExportProgress(callback: (progress: number) => void): () => void;
    };
  }
}
