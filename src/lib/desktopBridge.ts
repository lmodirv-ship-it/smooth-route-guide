/**
 * جسر نسخة الحاسوب (Electron).
 * في المتصفح: isDesktop = false وكل الدوال ترجع null بأمان.
 * في نسخة الحاسوب: وصول كامل لمساحة ملفات محلية منظّمة.
 */
export type DesktopFile = {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: number;
};

export type DesktopInfo = {
  role: string;
  workspace: string;
  version: string;
  platform: string;
  folders: string[];
};

type DesktopAPI = {
  isDesktop: true;
  info: () => Promise<DesktopInfo>;
  files: {
    list: (dir?: string) => Promise<DesktopFile[]>;
    read: (path: string, encoding?: "utf8" | "base64") => Promise<string>;
    write: (path: string, data: string, encoding?: "utf8" | "base64") => Promise<{ ok: boolean; path: string }>;
    mkdir: (path: string) => Promise<{ ok: boolean }>;
    move: (from: string, to: string) => Promise<{ ok: boolean }>;
    remove: (path: string) => Promise<{ ok: boolean }>;
    organize: (dir?: string) => Promise<{ moved: number }>;
    importFiles: (dir?: string) => Promise<{ imported: string[] }>;
    reveal: (path: string) => Promise<{ ok: boolean }>;
  };
  reload: () => Promise<{ ok: boolean }>;
};

declare global {
  interface Window {
    hnDesktop?: DesktopAPI;
  }
}

export const desktop = (): DesktopAPI | null =>
  typeof window !== "undefined" && window.hnDesktop ? window.hnDesktop : null;

export const isDesktopApp = (): boolean => !!desktop();
