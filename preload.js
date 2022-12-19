const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    importFile: () => ipcRenderer.invoke('importFile'),
    backupFile: () => ipcRenderer.invoke('backupFile'),
    getAll: (table) => ipcRenderer.invoke('getAll', table),
    getRows: (table, select) => ipcRenderer.invoke('getRows', table, select),
    insertTableContent: (table, array) => ipcRenderer.invoke('insertTableContent', table, array),
    updateRow: (tableName, set, where) => ipcRenderer.invoke('updateRow', tableName, set, where),
    deleteRow: (table, where) => ipcRenderer.invoke('deleteRow', table, where),
    count: (table) => ipcRenderer.invoke('count', table),
    sum: (table, where, fields) => ipcRenderer.invoke('sum', table, where, fields),
    fpdfAnagrafica: () => ipcRenderer.invoke('fpdfAnagrafica'),
    fpdfS21Singola: (anno, proc) => ipcRenderer.invoke('fpdfS21Singola', anno, proc),
    fpdfS21Tutte: (anno) => ipcRenderer.invoke('fpdfS21Tutte', anno),
    fpdfS88: (anno) => ipcRenderer.invoke('fpdfS88', anno),
    fpdfRapporti: (mese) => ipcRenderer.invoke('fpdfRapporti', mese),
})