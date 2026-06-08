const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

let mainWindow;
let currentProjectPath = null;
let exportProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#131313",
    title: "Vidéor",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function autosavePath() {
  return path.join(app.getPath("userData"), "autosave.videor");
}

async function readProject(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const project = JSON.parse(content);
  if (project.format !== "videor-project") {
    throw new Error("Ce fichier n'est pas un projet Vidéor valide.");
  }
  return project;
}

async function writeProject(filePath, project) {
  const payload = {
    ...project,
    format: "videor-project",
    version: 1,
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function registerIpc() {
  ipcMain.handle("media:choose-photos", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Importer des photos",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "bmp"] }]
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle("media:choose-audio", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choisir une piste audio",
      properties: ["openFile"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a", "aac", "flac"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("project:new", () => {
    currentProjectPath = null;
    return true;
  });

  ipcMain.handle("project:open", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Ouvrir un projet",
      properties: ["openFile"],
      filters: [{ name: "Projet Vidéor", extensions: ["videor", "json"] }]
    });
    if (result.canceled) return null;
    currentProjectPath = result.filePaths[0];
    return { project: await readProject(currentProjectPath), path: currentProjectPath };
  });

  ipcMain.handle("project:import", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Importer un projet",
      properties: ["openFile"],
      filters: [{ name: "Projet Vidéor", extensions: ["videor", "json"] }]
    });
    if (result.canceled) return null;
    return { project: await readProject(result.filePaths[0]), path: null };
  });

  ipcMain.handle("project:save", async (_event, project, saveAs) => {
    let target = saveAs ? null : currentProjectPath;
    if (!target) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Enregistrer le projet",
        defaultPath: `${project.name || "Mon projet"}.videor`,
        filters: [{ name: "Projet Vidéor", extensions: ["videor"] }]
      });
      if (result.canceled || !result.filePath) return null;
      target = result.filePath;
    }
    currentProjectPath = target;
    await writeProject(target, project);
    return target;
  });

  ipcMain.handle("project:export", async (_event, project) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exporter une copie du projet",
      defaultPath: `${project.name || "Mon projet"}.videor`,
      filters: [{ name: "Projet Vidéor", extensions: ["videor"] }]
    });
    if (result.canceled || !result.filePath) return null;
    await writeProject(result.filePath, project);
    return result.filePath;
  });

  ipcMain.handle("project:autosave", async (_event, project) => {
    await writeProject(autosavePath(), project);
    if (currentProjectPath) await writeProject(currentProjectPath, project);
    return true;
  });

  ipcMain.handle("project:load-autosave", async () => {
    try {
      return await readProject(autosavePath());
    } catch {
      return null;
    }
  });

  ipcMain.handle("video:cancel-export", () => {
    if (exportProcess) exportProcess.kill("SIGTERM");
    return true;
  });

  ipcMain.handle("video:export", async (_event, project, options) => {
    if (!project.photos.length) throw new Error("Ajoutez au moins une photo avant l'export.");
    const extension = options.format === "webm" ? "webm" : "mp4";
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exporter la vidéo",
      defaultPath: `${project.name || "video"}.${extension}`,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
    });
    if (result.canceled || !result.filePath) return null;
    await runFfmpeg(project, options, result.filePath);
    return result.filePath;
  });
}

function runFfmpeg(project, options, outputPath) {
  return new Promise((resolve, reject) => {
    const dimensions = {
      "720p": [1280, 720],
      "1080p": [1920, 1080],
      "4k": [3840, 2160]
    }[options.resolution] || [1920, 1080];
    const [width, height] = dimensions;
    const totalDuration = project.photos.reduce((sum, photo) => sum + photo.duration, 0);
    const args = ["-y"];

    for (const photo of project.photos) {
      args.push("-loop", "1", "-t", String(photo.duration), "-i", photo.path);
    }
    const audioIndex = project.audio ? project.photos.length : -1;
    if (project.audio) args.push("-i", project.audio.path);

    const filters = project.photos.map((photo, index) => {
      const rotation = {
        90: "transpose=1,",
        180: "hflip,vflip,",
        270: "transpose=2,"
      }[photo.rotation] || "";
      const framing = photo.fit === "contain"
        ? `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`
        : `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
          `crop=${width}:${height}:(iw-ow)*${(photo.positionX ?? 50) / 100}:` +
          `(ih-oh)*${(photo.positionY ?? 50) / 100}`;
      return `[${index}:v]${rotation}${framing},setsar=1,fps=30,format=yuv420p[v${index}]`;
    });
    filters.push(
      `${project.photos.map((_photo, index) => `[v${index}]`).join("")}` +
      `concat=n=${project.photos.length}:v=1:a=0[vout]`
    );
    args.push("-filter_complex", filters.join(";"), "-map", "[vout]");

    if (audioIndex >= 0) {
      args.push("-map", `${audioIndex}:a`, "-filter:a", `volume=${project.audio.volume}`, "-shortest");
    } else {
      args.push("-t", String(totalDuration));
    }

    if (options.format === "webm") {
      args.push("-c:v", "libvpx-vp9", "-crf", "28", "-b:v", "0");
      if (audioIndex >= 0) args.push("-c:a", "libopus");
    } else {
      args.push("-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart");
      if (audioIndex >= 0) args.push("-c:a", "aac", "-b:a", "192k");
    }
    args.push(outputPath);

    exportProcess = spawn("ffmpeg", args);
    let stderr = "";
    exportProcess.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const match = text.match(/time=(\d+):(\d+):([\d.]+)/);
      if (match && mainWindow) {
        const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
        mainWindow.webContents.send("video:progress", Math.min(99, Math.round((seconds / totalDuration) * 100)));
      }
    });
    exportProcess.on("error", reject);
    exportProcess.on("close", (code, signal) => {
      exportProcess = null;
      if (code === 0) {
        mainWindow?.webContents.send("video:progress", 100);
        resolve();
      } else if (signal) {
        reject(new Error("Export annulé."));
      } else {
        reject(new Error(stderr.split("\n").slice(-8).join("\n") || "Échec de FFmpeg."));
      }
    });
  });
}
