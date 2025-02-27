const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    getNews: () => ipcRenderer.invoke("get-news"),
    translateNews: () => ipcRenderer.invoke("translate-news"),
});
