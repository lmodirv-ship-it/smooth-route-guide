import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: "#111827",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (app.isPackaged) {
    await win.loadFile(path.join(__dirname, "../dist/index.html"));
    return;
  }

  const devUrl = process.env.ELECTRON_START_URL ?? "http://localhost:8080";
  await win.loadURL(devUrl);
};

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
