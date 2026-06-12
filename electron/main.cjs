const { app, BrowserWindow, dialog, ipcMain, protocol } = require("electron");
const { createReadStream } = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { Readable } = require("node:stream");
const { buildVideoExportArgs } = require("./videoExport.cjs");
const { buildSlideshowExportArgs } = require("./slideshowExport.cjs");
const { contentTypeForExtension, parseByteRange } = require("./mediaProtocol.cjs");
const { validateProject } = require("./projectValidation.cjs");

let mainWindow;
let currentProjectPath = null;
let exportProcess = null;

if (process.platform === "linux") {
  app.disableHardwareAcceleration();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "videor-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    icon: path.join(__dirname, "../build/icon.png"),
    backgroundColor: "#131313",
    title: "Vidéor",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Le processus d'affichage Vidéor s'est arrêté :", details);
  });
  mainWindow.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) console.error(`[renderer:${level}] ${message}`);
  });
  if (!app.isPackaged && process.env.VIDEOR_SMOKE_PHOTOS) {
    mainWindow.webContents.once("did-finish-load", async () => {
      await mainWindow.webContents.executeJavaScript(
        "document.querySelector('.drop-zone')?.click()"
      );
      const deadline = Date.now() + 60000;
      let result;
      do {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await mainWindow.webContents.executeJavaScript(`({
          cards: document.querySelectorAll('.media-card').length,
          clips: document.querySelectorAll('.clip').length,
          imagesLoaded: [...document.images].filter(
            (image) => image.complete && image.naturalWidth > 0
          ).length,
          imagesFailed: [...document.images].filter(
            (image) => image.complete && image.naturalWidth === 0
          ).length,
          status: document.querySelector('.statusbar span')?.textContent
        })`);
      } while (
        Date.now() < deadline &&
        result.status?.startsWith("Préparation de ")
      );
      console.log("VIDEOR_SMOKE_RESULT", JSON.stringify(result));
    });
  } else if (!app.isPackaged && process.env.VIDEOR_SMOKE_VIDEO) {
    mainWindow.webContents.once("did-finish-load", async () => {
      await mainWindow.webContents.executeJavaScript(`
        [...document.querySelectorAll('.tabs button')]
          .find((button) => button.textContent.includes('Vidéo'))?.click();
      `);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await mainWindow.webContents.executeJavaScript(`
        [...document.querySelectorAll('.library-content button')]
          .find((button) => button.textContent.includes('Charger une vidéo'))?.click();
      `);
      const deadline = Date.now() + 30000;
      let result;
      do {
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = await mainWindow.webContents.executeJavaScript(`({
          videoCards: document.querySelectorAll('.video-card').length,
          videoPlayers: document.querySelectorAll('.player video').length,
          videoTracks: document.querySelectorAll('.video-track').length,
          status: document.querySelector('.statusbar span')?.textContent
        })`);
      } while (
        Date.now() < deadline &&
        (!result.videoCards || result.status?.includes("Analyse"))
      );
      await mainWindow.webContents.executeJavaScript(
        "document.querySelector('.play-button')?.click()"
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await mainWindow.webContents.executeJavaScript(`({
        videoCards: document.querySelectorAll('.video-card').length,
        videoPlayers: document.querySelectorAll('.player video').length,
        videoTracks: document.querySelectorAll('.video-track').length,
        currentTime: document.querySelector('.player video')?.currentTime,
        paused: document.querySelector('.player video')?.paused,
        readyState: document.querySelector('.player video')?.readyState,
        networkState: document.querySelector('.player video')?.networkState,
        mediaError: document.querySelector('.player video')?.error?.message || null,
        status: document.querySelector('.statusbar span')?.textContent
      })`);
      console.log("VIDEOR_VIDEO_SMOKE_RESULT", JSON.stringify(result));
    });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  protocol.handle("videor-media", async (request) => {
    const filePath = new URL(request.url).searchParams.get("path");
    if (!filePath) return new Response("Chemin média manquant", { status: 400 });
    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypeForExtension(extension);
    if (!contentType) {
      return new Response("Type de média interdit", { status: 403 });
    }
    try {
      const stat = await fs.stat(filePath);
      const rangeHeader = request.headers.get("range");
      const headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": contentType
      };

      if (rangeHeader) {
        const range = parseByteRange(rangeHeader, stat.size);
        if (!range) {
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${stat.size}` }
          });
        }
        const { start, end } = range;
        const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
        return new Response(stream, {
          status: 206,
          headers: {
            ...headers,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`
          }
        });
      }

      const stream = Readable.toWeb(createReadStream(filePath));
      return new Response(stream, {
        status: 200,
        headers: { ...headers, "Content-Length": String(stat.size) }
      });
    } catch {
      return new Response("Média introuvable", { status: 404 });
    }
  });
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

function previewCachePath(filePath, stat, suffix = "") {
  const key = crypto
    .createHash("sha256")
    .update(`${filePath}:${stat.size}:${stat.mtimeMs}`)
    .digest("hex");
  return path.join(app.getPath("userData"), "previews", `${key}${suffix}.jpg`);
}

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let stderr = "";
    process.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.split("\n").slice(-6).join("\n")));
    });
  });
}

async function runCommandWithOutput(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.split("\n").slice(-6).join("\n")));
    });
  });
}

async function preparePhoto(filePath) {
  try {
    const stat = await fs.stat(filePath);
    const target = previewCachePath(filePath, stat);
    try {
      await fs.access(target);
      return { path: filePath, previewPath: target, error: null };
    } catch {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await runCommand("ffmpeg", [
        "-loglevel", "error",
        "-y",
        "-i", filePath,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease",
        "-frames:v", "1",
        "-q:v", "3",
        target
      ]);
      return { path: filePath, previewPath: target, error: null };
    }
  } catch (error) {
    return {
      path: filePath,
      previewPath: null,
      error: error instanceof Error ? error.message : "Image illisible"
    };
  }
}

async function preparePhotos(filePaths) {
  const results = [];
  for (const filePath of filePaths) {
    results.push(await preparePhoto(filePath));
  }
  return results;
}

async function prepareVideo(filePath) {
  try {
    const stat = await fs.stat(filePath);
    const probeOutput = await runCommandWithOutput("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=index,codec_type,width,height",
      "-of", "json",
      filePath
    ]);
    const probe = JSON.parse(probeOutput);
    const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
    const duration = Number(probe.format?.duration);
    if (!videoStream || !Number.isFinite(duration) || duration <= 0) {
      throw new Error("Aucune piste vidéo exploitable");
    }

    const previewPath = previewCachePath(filePath, stat, "-video");
    try {
      await fs.access(previewPath);
    } catch {
      await fs.mkdir(path.dirname(previewPath), { recursive: true });
      await runCommand("ffmpeg", [
        "-loglevel", "error",
        "-y",
        "-ss", String(Math.min(duration / 2, 5)),
        "-i", filePath,
        "-vf", "scale=960:540:force_original_aspect_ratio=decrease",
        "-frames:v", "1",
        "-q:v", "3",
        previewPath
      ]);
    }

    return {
      path: filePath,
      previewPath,
      duration,
      width: Number(videoStream.width) || 0,
      height: Number(videoStream.height) || 0,
      hasAudio: probe.streams?.some((stream) => stream.codec_type === "audio") || false,
      error: null
    };
  } catch (error) {
    return {
      path: filePath,
      previewPath: null,
      duration: 0,
      width: 0,
      height: 0,
      hasAudio: false,
      error: error instanceof Error ? error.message : "Vidéo illisible"
    };
  }
}

async function readProject(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  try {
    return validateProject(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Le fichier projet contient un JSON invalide.");
    }
    throw error;
  }
}

async function writeProject(filePath, project) {
  const payload = {
    ...validateProject(project),
    format: "videor-project",
    version: 1,
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function registerIpc() {
  ipcMain.handle("media:choose-photos", async () => {
    if (!app.isPackaged && process.env.VIDEOR_SMOKE_PHOTOS) {
      return process.env.VIDEOR_SMOKE_PHOTOS.split(path.delimiter).filter(Boolean);
    }
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

  ipcMain.handle("media:choose-video", async () => {
    if (!app.isPackaged && process.env.VIDEOR_SMOKE_VIDEO) {
      return process.env.VIDEOR_SMOKE_VIDEO;
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choisir une vidéo",
      properties: ["openFile"],
      filters: [{ name: "Vidéo", extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("media:prepare-photos", async (_event, filePaths) => {
    if (!Array.isArray(filePaths)) return [];
    return preparePhotos(filePaths);
  });

  ipcMain.handle("media:prepare-video", async (_event, filePath) => {
    if (typeof filePath !== "string" || !filePath) return null;
    return prepareVideo(filePath);
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
    if (!project.photos.length && !project.video) {
      throw new Error("Ajoutez des photos ou une vidéo avant l'export.");
    }
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
  if (project.video) {
    return runVideoFfmpeg(project.video, options, outputPath);
  }
  return new Promise((resolve, reject) => {
    let exportConfig;
    try {
      exportConfig = buildSlideshowExportArgs(project, options, outputPath);
    } catch (error) {
      reject(error);
      return;
    }
    const { args, totalDuration } = exportConfig;

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

function runVideoFfmpeg(video, options, outputPath) {
  return new Promise((resolve, reject) => {
    let exportConfig;
    try {
      exportConfig = buildVideoExportArgs(video, options, outputPath);
    } catch (error) {
      reject(new Error("Les coupes suppriment toute la vidéo."));
      return;
    }
    const { args, totalDuration } = exportConfig;
    exportProcess = spawn("ffmpeg", args);
    let stderr = "";
    exportProcess.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const match = text.match(/time=(\d+):(\d+):([\d.]+)/);
      if (match && mainWindow) {
        const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
        mainWindow.webContents.send(
          "video:progress",
          Math.min(99, Math.round((seconds / totalDuration) * 100))
        );
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
