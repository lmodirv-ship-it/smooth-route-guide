const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 700,
    autoHideMenuBar: true, backgroundColor: "#111827",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.loadFile(path.join(__dirname, "../dist/index.html"));
};
app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
