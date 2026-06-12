const supportedProjectVersion = 1;
const imageExtensions = /\.(jpe?g|png|webp|bmp)$/i;
const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
const videoExtensions = /\.(mp4|mov|mkv|webm|avi|m4v)$/i;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} doit être un objet.`);
  }
  return value;
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} est manquant.`);
  }
  return value;
}

function finiteNumber(value, label, minimum, maximum, fallback) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new Error(`${label} est invalide.`);
  }
  return number;
}

function mediaPath(value, label, extensionPattern) {
  const path = requiredString(value, label);
  if (!extensionPattern.test(path)) {
    throw new Error(`${label} utilise un format non pris en charge.`);
  }
  return path;
}

function validatePhoto(value, index) {
  const photo = assertObject(value, `La photo ${index + 1}`);
  const path = mediaPath(photo.path, `Le chemin de la photo ${index + 1}`, imageExtensions);
  const rotation = finiteNumber(photo.rotation, `La rotation de la photo ${index + 1}`, 0, 270, 0);
  if (![0, 90, 180, 270].includes(rotation)) {
    throw new Error(`La rotation de la photo ${index + 1} est invalide.`);
  }
  const fit = photo.fit === undefined ? "cover" : photo.fit;
  if (fit !== "cover" && fit !== "contain") {
    throw new Error(`Le recadrage de la photo ${index + 1} est invalide.`);
  }

  return {
    id: typeof photo.id === "string" && photo.id ? photo.id : `photo-${index + 1}`,
    path,
    name: typeof photo.name === "string" && photo.name ? photo.name : path.split(/[\\/]/).pop(),
    duration: finiteNumber(photo.duration, `La durée de la photo ${index + 1}`, 0.5, 600, 5),
    rotation,
    fit,
    positionX: finiteNumber(photo.positionX, `La position horizontale de la photo ${index + 1}`, 0, 100, 50),
    positionY: finiteNumber(photo.positionY, `La position verticale de la photo ${index + 1}`, 0, 100, 50)
  };
}

function validateAudio(value) {
  if (value === null || value === undefined) return null;
  const audio = assertObject(value, "La piste audio");
  const path = mediaPath(audio.path, "Le chemin de la piste audio", audioExtensions);
  return {
    path,
    name: typeof audio.name === "string" && audio.name ? audio.name : path.split(/[\\/]/).pop(),
    duration: finiteNumber(audio.duration, "La durée audio", 0, Number.MAX_SAFE_INTEGER, 0),
    volume: finiteNumber(audio.volume, "Le volume audio", 0, 1, 0.8)
  };
}

function validateVideo(value) {
  if (value === null || value === undefined) return null;
  const video = assertObject(value, "La vidéo");
  const path = mediaPath(video.path, "Le chemin de la vidéo", videoExtensions);
  const duration = finiteNumber(video.duration, "La durée vidéo", 0.05, Number.MAX_SAFE_INTEGER);
  const trimStart = finiteNumber(video.trimStart, "Le début de la vidéo", 0, duration, 0);
  const trimEnd = finiteNumber(video.trimEnd, "La fin de la vidéo", trimStart, duration, duration);
  if (video.cuts !== undefined && !Array.isArray(video.cuts)) {
    throw new Error("La liste des coupes vidéo est invalide.");
  }
  const cuts = (video.cuts || []).map((value, index) => {
    const cut = assertObject(value, `La coupe ${index + 1}`);
    const start = finiteNumber(cut.start, `Le début de la coupe ${index + 1}`, trimStart, trimEnd);
    const end = finiteNumber(cut.end, `La fin de la coupe ${index + 1}`, trimStart, trimEnd);
    if (end - start < 0.05) throw new Error(`La coupe ${index + 1} est trop courte.`);
    return { start, end };
  });

  return {
    path,
    previewPath: typeof video.previewPath === "string" ? video.previewPath : null,
    name: typeof video.name === "string" && video.name ? video.name : path.split(/[\\/]/).pop(),
    duration,
    width: finiteNumber(video.width, "La largeur vidéo", 0, 32768, 0),
    height: finiteNumber(video.height, "La hauteur vidéo", 0, 32768, 0),
    hasAudio: Boolean(video.hasAudio),
    trimStart,
    trimEnd,
    cuts
  };
}

function validateProject(value) {
  const project = assertObject(value, "Le projet");
  if (project.format !== "videor-project") {
    throw new Error("Ce fichier n'est pas un projet Vidéor valide.");
  }
  const version = finiteNumber(
    project.version,
    "La version du projet",
    1,
    Number.MAX_SAFE_INTEGER,
    1
  );
  if (version !== supportedProjectVersion) {
    throw new Error(`La version ${version} du projet n'est pas prise en charge.`);
  }
  if (project.photos !== undefined && !Array.isArray(project.photos)) {
    throw new Error("La liste des photos est invalide.");
  }

  const photos = (project.photos || []).map(validatePhoto);
  const video = validateVideo(project.video);
  if (photos.length && video) {
    throw new Error("Un projet ne peut pas contenir un diaporama et une vidéo simultanément.");
  }
  if (video && project.audio) {
    throw new Error("Une piste audio externe n'est pas prise en charge en mode vidéo.");
  }

  return {
    format: "videor-project",
    version: supportedProjectVersion,
    name: typeof project.name === "string" && project.name.trim()
      ? project.name.trim().slice(0, 120)
      : "Mon projet",
    photos,
    audio: validateAudio(project.audio),
    video,
    ...(typeof project.updatedAt === "string" ? { updatedAt: project.updatedAt } : {})
  };
}

module.exports = {
  supportedProjectVersion,
  validateProject
};
