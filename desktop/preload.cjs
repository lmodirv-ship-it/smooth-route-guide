/**
 * جسر آمن بين الموقع ونظام الملفات المحلي.
 * يظهر في الويب كـ window.hnDesktop (غير موجود في المتصفح العادي).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hnDesktop', {
  isDesktop: true,
  info: () => ipcRenderer.invoke('fs:info'),
  files: {
    list: (dir) => ipcRenderer.invoke('fs:list', dir),
    read: (p, enc) => ipcRenderer.invoke('fs:read', p, enc),
    write: (p, data, enc) => ipcRenderer.invoke('fs:write', p, data, enc),
    mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
    move: (a, b) => ipcRenderer.invoke('fs:move', a, b),
    remove: (p) => ipcRenderer.invoke('fs:delete', p),
    organize: (dir) => ipcRenderer.invoke('fs:organize', dir),
    importFiles: (dir) => ipcRenderer.invoke('fs:import', dir),
    reveal: (p) => ipcRenderer.invoke('fs:reveal', p),
  },
  reload: () => ipcRenderer.invoke('app:reload'),
});
