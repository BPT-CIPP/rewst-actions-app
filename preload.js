const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process via `window.electronAPI`
contextBridge.exposeInMainWorld('electronAPI', {
    loadActions: () => ipcRenderer.invoke('load-actions'),
    saveActions: (data) => ipcRenderer.invoke('save-actions', data)
});
