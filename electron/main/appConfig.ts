import path from "node:path";
import { app } from "electron";

export type RuntimeMode = "development" | "production";

export type DesktopRuntimeConfig = {
  readonly mode: RuntimeMode;
  readonly appName: string;
  readonly appVersion: string;
  readonly platform: NodeJS.Platform;
  readonly userDataPath: string;
  readonly rendererDevServerUrl: string | null;
  readonly rendererIndexPath: string;
  readonly preloadPath: string;
  readonly iconPath: string;
  readonly localConnectorAvailable: boolean;
};

export function getRuntimeConfig(): DesktopRuntimeConfig {
  const mode: RuntimeMode = process.env["NODE_ENV"] === "development" ? "development" : "production";
  const rendererDevServerUrl = process.env["VITE_DEV_SERVER_URL"] ?? null;
  const userDataPath = app.getPath("userData");

  return {
    mode,
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    userDataPath,
    rendererDevServerUrl,
    rendererIndexPath: path.join(app.getAppPath(), "dist", "renderer", "index.html"),
    preloadPath: path.join(app.getAppPath(), "dist", "preload", "preload.cjs"),
    iconPath: path.join(app.getAppPath(), "build", "icon.png"),
    localConnectorAvailable: process.platform === "win32",
  };
}
