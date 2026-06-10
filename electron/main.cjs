const { app, BrowserWindow, dialog, ipcMain, net, protocol } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { buildVideoExportArgs } = require("./videoExport.cjs");

let mainWindow;
let currentProjectPath = null;
let exportProcess = null;

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
  protocol.handle("videor-media", (request) => {
    const filePath = new URL(request.url).searchParams.get("path");
    if (!filePath) return new Response("Chemin média manquant", { status: 400 });
    const extension = path.extname(filePath).toLowerCase();
    const allowed = new Set([
      ".jpg", ".jpeg", ".png", ".webp", ".bmp",
      ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac",
      ".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"
    ]);
    if (!allowed.has(extension)) {
      return new Response("Type de média interdit", { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).href);
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
