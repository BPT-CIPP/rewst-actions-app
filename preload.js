const { contextBridge, ipcRenderer } = require('electron');

// Exposing a safe subset of the ipcRenderer API to the renderer process
contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    }
});
