/**
 * HN Driver — Desktop (Windows / macOS / Linux)
 * ------------------------------------------------------------
 * فلسفة العمل: التطبيق نافذة أصلية تفتح الموقع الحيّ مباشرة.
 * أي صفحة / مقال / ميزة تُضاف على الموقع تظهر فوراً في نسخة الحاسوب
 * بدون إعادة بناء. البناء (OTA) يلزم فقط عند تغيير الغلاف نفسه.
 */
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fssync = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const CONFIG = require('./config.json');

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const ROLE = process.env.HN_ROLE || CONFIG.defaultRole;
const ROLE_CFG = CONFIG.roles[ROLE] || CONFIG.roles[CONFIG.defaultRole];

// جذر مساحة الملفات المحلية (تنظيم + أرشفة)
const WORKSPACE = path.join(app.getPath('documents'), 'HN-Driver', ROLE);

let win;

function ensureWorkspace() {
  for (const sub of CONFIG.workspaceFolders) {
    fssync.mkdirSync(path.join(WORKSPACE, sub), { recursive: true });
  }
}

function safePath(rel) {
  const target = path.resolve(WORKSPACE, rel || '.');
  if (!target.startsWith(path.resolve(WORKSPACE))) {
    throw new Error('مسار خارج مساحة العمل المسموح بها');
  }
  return target;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b0f19',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadURL(ROLE_CFG.url);

  // الروابط الخارجية تُفتح في المتصفح
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(new URL(ROLE_CFG.url).origin)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // صفحة خطأ بسيطة عند انقطاع الشبكة + إعادة محاولة
  win.webContents.on('did-fail-load', () => {
    win.loadFile(path.join(__dirname, 'offline.html'));
  });
}

app.whenReady().then(() => {
  ensureWorkspace();
  createWindow();
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 3000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 30 * 60 * 1000);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ───────────── OTA ───────────── */
autoUpdater.setFeedURL({ provider: 'generic', url: CONFIG.updateFeed + ROLE + '/' });

autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox(win, {
      type: 'info',
      title: 'تحديث جاهز',
      message: `الإصدار ${info.version} تم تنزيله. إعادة التشغيل لتطبيقه.`,
      buttons: ['إعادة التشغيل الآن', 'لاحقاً'],
    })
    .then((r) => r.response === 0 && autoUpdater.quitAndInstall());
});
autoUpdater.on('error', (e) => log.error('OTA:', e));

/* ───────────── جسر الملفات (IPC) ───────────── */
ipcMain.handle('fs:info', () => ({
  role: ROLE,
  workspace: WORKSPACE,
  version: app.getVersion(),
  platform: process.platform,
  folders: CONFIG.workspaceFolders,
}));

ipcMain.handle('fs:list', async (_e, rel = '.') => {
  const dir = safePath(rel);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return Promise.all(
    entries.map(async (en) => {
      const full = path.join(dir, en.name);
      const st = await fs.stat(full);
      return {
        name: en.name,
        path: path.relative(WORKSPACE, full).split(path.sep).join('/'),
        isDir: en.isDirectory(),
        size: st.size,
        modified: st.mtimeMs,
      };
    })
  );
});

ipcMain.handle('fs:read', async (_e, rel, encoding = 'utf8') => {
  const buf = await fs.readFile(safePath(rel));
  return encoding === 'base64' ? buf.toString('base64') : buf.toString('utf8');
});

ipcMain.handle('fs:write', async (_e, rel, data, encoding = 'utf8') => {
  const target = safePath(rel);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, encoding === 'base64' ? Buffer.from(data, 'base64') : data);
  return { ok: true, path: rel };
});

ipcMain.handle('fs:mkdir', async (_e, rel) => {
  await fs.mkdir(safePath(rel), { recursive: true });
  return { ok: true };
});

ipcMain.handle('fs:move', async (_e, from, to) => {
  const dst = safePath(to);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.rename(safePath(from), dst);
  return { ok: true };
});

ipcMain.handle('fs:delete', async (_e, rel) => {
  await fs.rm(safePath(rel), { recursive: true, force: true });
  return { ok: true };
});

// تنظيم تلقائي: توزيع ملفات مجلد على مجلدات فرعية حسب الامتداد
ipcMain.handle('fs:organize', async (_e, rel = 'inbox') => {
  const dir = safePath(rel);
  const map = CONFIG.organizeMap;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let moved = 0;
  for (const en of entries) {
    if (en.isDirectory()) continue;
    const ext = path.extname(en.name).toLowerCase().replace('.', '');
    const bucket = Object.keys(map).find((k) => map[k].includes(ext)) || 'other';
    const dst = path.join(dir, bucket, en.name);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.rename(path.join(dir, en.name), dst);
    moved++;
  }
  return { moved };
});

// اختيار ملفات من الجهاز ونسخها إلى مساحة العمل
ipcMain.handle('fs:import', async (_e, rel = 'inbox') => {
  const res = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
  if (res.canceled) return { imported: [] };
  const imported = [];
  for (const src of res.filePaths) {
    const dst = safePath(path.join(rel, path.basename(src)));
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
    imported.push(path.relative(WORKSPACE, dst).split(path.sep).join('/'));
  }
  return { imported };
});

ipcMain.handle('fs:reveal', (_e, rel) => {
  shell.showItemInFolder(safePath(rel));
  return { ok: true };
});

ipcMain.handle('app:reload', () => {
  win.loadURL(ROLE_CFG.url);
  return { ok: true };
});
