const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    readFile: (table) => ipcRenderer.invoke('readFile', table),
    writeFile: (table, tableObject) => ipcRenderer.invoke('writeFile', table, tableObject),
    loadBackup: () => ipcRenderer.invoke('loadBackup'),
    saveBackup: () => ipcRenderer.invoke('saveBackup'),
    fpdfAnagrafica: () => ipcRenderer.invoke('fpdfAnagrafica'),
    fpdfS21Singola: (anno, proc) => ipcRenderer.invoke('fpdfS21Singola', anno, proc),
    fpdfS21Tutte: (anno) => ipcRenderer.invoke('fpdfS21Tutte', anno),
    fpdfS88: (anno) => ipcRenderer.invoke('fpdfS88', anno),
    fpdfRapporti: (mese) => ipcRenderer.invoke('fpdfRapporti', mese),
    update: (callback) => ipcRenderer.on('update', callback),
    closeModalWindow: () => ipcRenderer.send('closeModalWindow'),
    openBrowserUpdate: (url) => ipcRenderer.invoke('openBrowserUpdate', url),
})