const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  startOAuth: () => ipcRenderer.invoke('start-oauth'),
  onOAuthCode: (callback) => ipcRenderer.on('oauth-code', (_, code) => callback(code))
})
