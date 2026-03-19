import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("nativeShell", {
  platform: process.platform,
});
