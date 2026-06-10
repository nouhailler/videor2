const { contextBridge, ipcRenderer, webUtils } = require("electron");

function toMediaUrl(filePath) {
  return `videor-media://local/?path=${encodeURIComponent(filePath)}`;
}

contextBridge.exposeInMainWorld("videor", {
  choosePhotos: () => ipcRenderer.invoke("media:choose-photos"),
  chooseAudio: () => ipcRenderer.invoke("media:choose-audio"),
  chooseVideo: () => ipcRenderer.invoke("media:choose-video"),
  preparePhotos: (paths) => ipcRenderer.invoke("media:prepare-photos", paths),
  prepareVideo: (path) => ipcRenderer.invoke("media:prepare-video", path),
  filePath: (file) => webUtils.getPathForFile(file),
  fileUrl: (path) => toMediaUrl(path),
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
