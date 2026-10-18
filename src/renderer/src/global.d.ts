import type { DesktopApi } from "../../../electron/preload/preload";

declare global {
  interface Window {
    readonly desktop: DesktopApi;
  }
}

export {};
