const { contextBridge, ipcRenderer, webUtils } = require("electron");
const { pathToFileURL } = require("node:url");

contextBridge.exposeInMainWorld("videor", {
  choosePhotos: () => ipcRenderer.invoke("media:choose-photos"),
  chooseAudio: () => ipcRenderer.invoke("media:choose-audio"),
  filePath: (file) => webUtils.getPathForFile(file),
  fileUrl: (path) => pathToFileURL(path).href,
  newProject: () => ipcRenderer.invoke("project:new"),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (project, saveAs = false) =>
    ipcRenderer.invoke("project:save", project, saveAs),
  importProject: () => ipcRenderer.invoke("project:import"),
  exportProject: (project) => ipcRenderer.invoke("project:export", project),
  loadAutosave: () => ipcRenderer.invoke("project:load-autosave"),
  autosave: (project) => ipcRenderer.invoke("project:autosave", project),
  exportVideo: (project, options) =>
    ipcRenderer.invoke("video:export", project, options),
  cancelExport: () => ipcRenderer.invoke("video:cancel-export"),
  onExportProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("video:progress", listener);
    return () => ipcRenderer.removeListener("video:progress", listener);
  }
});
