function normalizeVideoSegments(video) {
  const trimStart = Math.max(0, Math.min(video.duration, video.trimStart || 0));
  const trimEnd = Math.max(trimStart, Math.min(video.duration, video.trimEnd ?? video.duration));
  const cuts = (video.cuts || [])
    .map((cut) => ({
      start: Math.max(trimStart, Math.min(trimEnd, Math.min(cut.start, cut.end))),
      end: Math.max(trimStart, Math.min(trimEnd, Math.max(cut.start, cut.end)))
    }))
    .filter((cut) => cut.end - cut.start >= 0.05)
    .sort((left, right) => left.start - right.start)
    .reduce((merged, cut) => {
      const previous = merged[merged.length - 1];
      if (!previous || cut.start > previous.end) merged.push(cut);
      else previous.end = Math.max(previous.end, cut.end);
      return merged;
    }, []);
  const segments = [];
  let cursor = trimStart;
  for (const cut of cuts) {
    if (cut.start - cursor >= 0.05) segments.push({ start: cursor, end: cut.start });
    cursor = Math.max(cursor, cut.end);
  }
  if (trimEnd - cursor >= 0.05) segments.push({ start: cursor, end: trimEnd });
  return segments;
}

function buildVideoExportArgs(video, options, outputPath) {
  const dimensions = {
    "720p": [1280, 720],
    "1080p": [1920, 1080],
    "4k": [3840, 2160]
  }[options.resolution] || [1920, 1080];
  const [width, height] = dimensions;
  const segments = normalizeVideoSegments(video);
  if (!segments.length) throw new Error("Les coupes suppriment toute la vidéo.");

  const totalDuration = segments.reduce(
    (total, segment) => total + segment.end - segment.start,
    0
  );
  const filters = [];
  for (const [index, segment] of segments.entries()) {
    filters.push(
      `[0:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS,` +
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
      `setsar=1,fps=30,format=yuv420p[v${index}]`
    );
    if (video.hasAudio) {
      filters.push(
        `[0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}]`
      );
    }
  }
  const concatInputs = segments.map((_segment, index) =>
    video.hasAudio ? `[v${index}][a${index}]` : `[v${index}]`
  ).join("");
  filters.push(
    `${concatInputs}concat=n=${segments.length}:v=1:a=${video.hasAudio ? 1 : 0}` +
    (video.hasAudio ? "[vout][aout]" : "[vout]")
  );

  const args = [
    "-y",
    "-i", video.path,
    "-filter_complex", filters.join(";"),
    "-map", "[vout]"
  ];
  if (video.hasAudio) args.push("-map", "[aout]");
  if (options.format === "webm") {
    args.push("-c:v", "libvpx-vp9", "-crf", "28", "-b:v", "0");
    if (video.hasAudio) args.push("-c:a", "libopus");
  } else {
    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart");
    if (video.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
  }
  args.push(outputPath);
  return { args, segments, totalDuration };
}

module.exports = {
  buildVideoExportArgs,
  normalizeVideoSegments
};
