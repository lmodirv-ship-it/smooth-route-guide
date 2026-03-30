const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const ACTIVATION_CODE = "28051982";
const LOCK_FILE = path.join(app.getPath("userData"), ".activated");

function isActivated() {
  try { return fs.existsSync(LOCK_FILE); } catch { return false; }
}

function markActivated() {
  try { fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true }); fs.writeFileSync(LOCK_FILE, "1"); } catch {}
}

async function promptActivation() {
  const { response } = await dialog.showMessageBox({
    type: "info",
    title: "HN Driver — Admin Panel",
    message: "مرحباً بك في لوحة إدارة HN Driver\nالإصدار 1.0.0\n\nيرجى إدخال رمز التفعيل للمتابعة",
    buttons: ["إدخال الرمز", "إلغاء"],
    defaultId: 0, cancelId: 1
  });
  if (response === 1) { app.quit(); return false; }

  const { response: code } = await dialog.showMessageBox({
    type: "question",
    title: "رمز التفعيل",
    message: "أدخل رمز التفعيل:",
    buttons: [ACTIVATION_CODE, "إلغاء"],
    defaultId: 0, cancelId: 1
  });

  // Electron doesn't have input dialogs — use a BrowserWindow prompt instead
  return true; // We'll use a custom HTML prompt
}

const createActivationWindow = () => {
  const win = new BrowserWindow({
    width: 480, height: 380, resizable: false, frame: true,
    autoHideMenuBar: true, backgroundColor: "#111827",
    webPreferences: { contextIsolation: false, nodeIntegration: true }
  });

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #111827; color: #f3f4f6; display:flex; align-items:center; justify-content:center; height:100vh; }
  .box { text-align:center; padding:40px; }
  h1 { font-size:22px; margin-bottom:8px; color:#60a5fa; }
  p { font-size:14px; color:#9ca3af; margin-bottom:24px; }
  input { width:240px; padding:12px; font-size:18px; text-align:center; border:2px solid #374151; border-radius:10px; background:#1f2937; color:#f3f4f6; outline:none; letter-spacing:4px; }
  input:focus { border-color:#3b82f6; }
  .btn { display:block; width:240px; margin:16px auto 0; padding:12px; font-size:16px; font-weight:bold; border:none; border-radius:10px; cursor:pointer; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; }
  .btn:hover { background:linear-gradient(135deg,#2563eb,#1d4ed8); }
  .err { color:#ef4444; margin-top:12px; font-size:14px; display:none; }
  .ver { font-size:12px; color:#4b5563; margin-bottom:16px; }
</style></head><body>
<div class="box">
  <h1>🛡️ HN Driver — Admin Panel</h1>
  <p class="ver">الإصدار 1.0.0</p>
  <p>أدخل رمز التفعيل للمتابعة</p>
  <input id="code" type="password" maxlength="20" autofocus placeholder="••••••••">
  <button class="btn" onclick="verify()">تفعيل</button>
  <p class="err" id="err">❌ رمز التفعيل غير صحيح</p>
</div>
<script>
  const { ipcRenderer } = require('electron');
  function verify() {
    const v = document.getElementById('code').value.trim();
    if (v === '${ACTIVATION_CODE}') {
      ipcRenderer.send('activation-success');
    } else {
      document.getElementById('err').style.display = 'block';
      document.getElementById('code').value = '';
      document.getElementById('code').focus();
    }
  }
  document.getElementById('code').addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
</script></body></html>`;

  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  return win;
};

const LIVE_URL = "https://smooth-route-guide.lovable.app";

const createMainWindow = () => {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 700,
    autoHideMenuBar: true, backgroundColor: "#111827",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });

  // Load the live Lovable deployment so desktop always matches the web version
  win.loadURL(LIVE_URL);
};

app.whenReady().then(() => {
  if (isActivated()) {
    createMainWindow();
  } else {
    const { ipcMain } = require("electron");
    const actWin = createActivationWindow();
    ipcMain.once("activation-success", () => {
      markActivated();
      actWin.close();
      createMainWindow();
    });
    actWin.on("closed", () => {
      if (!isActivated()) app.quit();
    });
  }
});

app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
