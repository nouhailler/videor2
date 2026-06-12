function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function buildSlideshowExportArgs(project, options, outputPath) {
  if (!Array.isArray(project.photos) || !project.photos.length) {
    throw new Error("Ajoutez des photos avant l'export.");
  }

  const dimensions = {
    "720p": [1280, 720],
    "1080p": [1920, 1080],
    "4k": [3840, 2160]
  }[options.resolution] || [1920, 1080];
  const [width, height] = dimensions;
  const totalDuration = project.photos.reduce(
    (sum, photo) => sum + positiveNumber(photo.duration, 5),
    0
  );
  const args = ["-y"];

  for (const photo of project.photos) {
    args.push("-loop", "1", "-t", String(positiveNumber(photo.duration, 5)), "-i", photo.path);
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
    const volume = Math.min(1, Math.max(0, Number(project.audio.volume) || 0));
    args.push(
      "-map", `${audioIndex}:a`,
      "-filter:a", `volume=${volume},apad`,
      "-t", String(totalDuration)
    );
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

  return { args, totalDuration };
}

module.exports = {
  buildSlideshowExportArgs
};
