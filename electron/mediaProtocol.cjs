const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".m4v": "video/x-m4v"
};

function contentTypeForExtension(extension) {
  return mimeTypes[extension.toLowerCase()] || null;
}

function parseByteRange(rangeHeader, size) {
  const match = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || size <= 0 || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Math.min(Number(match[2]), size);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    return { start: size - suffixLength, end: size - 1 };
  }

  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

module.exports = {
  contentTypeForExtension,
  parseByteRange
};
