export type TimeRange = {
  start: number;
  end: number;
};

export type VideoEdits = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  cuts: TimeRange[];
};

const minimumSegmentDuration = 0.05;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeVideoEdits(edits: VideoEdits): VideoEdits {
  const duration = Math.max(0, Number(edits.duration) || 0);
  const trimStart = clamp(Number(edits.trimStart) || 0, 0, duration);
  const trimEnd = clamp(
    Number.isFinite(edits.trimEnd) ? edits.trimEnd : duration,
    trimStart,
    duration
  );
  const cuts = edits.cuts
    .map((range) => ({
      start: clamp(Math.min(range.start, range.end), trimStart, trimEnd),
      end: clamp(Math.max(range.start, range.end), trimStart, trimEnd)
    }))
    .filter((range) => range.end - range.start >= minimumSegmentDuration)
    .sort((left, right) => left.start - right.start)
    .reduce<TimeRange[]>((merged, range) => {
      const previous = merged.at(-1);
      if (!previous || range.start > previous.end) {
        merged.push(range);
      } else {
        previous.end = Math.max(previous.end, range.end);
      }
      return merged;
    }, []);

  return { duration, trimStart, trimEnd, cuts };
}

export function keptVideoSegments(edits: VideoEdits): TimeRange[] {
  const normalized = normalizeVideoEdits(edits);
  const segments: TimeRange[] = [];
  let cursor = normalized.trimStart;

  for (const cut of normalized.cuts) {
    if (cut.start - cursor >= minimumSegmentDuration) {
      segments.push({ start: cursor, end: cut.start });
    }
    cursor = Math.max(cursor, cut.end);
  }

  if (normalized.trimEnd - cursor >= minimumSegmentDuration) {
    segments.push({ start: cursor, end: normalized.trimEnd });
  }
  return segments;
}

export function editedVideoDuration(edits: VideoEdits) {
  return keptVideoSegments(edits).reduce(
    (total, segment) => total + segment.end - segment.start,
    0
  );
}

export function editedTimeToSource(edits: VideoEdits, editedTime: number) {
  const segments = keptVideoSegments(edits);
  if (!segments.length) return normalizeVideoEdits(edits).trimStart;

  let remaining = clamp(editedTime, 0, editedVideoDuration(edits));
  for (const segment of segments) {
    const segmentDuration = segment.end - segment.start;
    if (remaining <= segmentDuration) return segment.start + remaining;
    remaining -= segmentDuration;
  }
  return segments.at(-1)!.end;
}

export function sourceTimeToEdited(edits: VideoEdits, sourceTime: number) {
  const segments = keptVideoSegments(edits);
  let elapsed = 0;

  for (const segment of segments) {
    if (sourceTime < segment.start) return elapsed;
    if (sourceTime <= segment.end) return elapsed + sourceTime - segment.start;
    elapsed += segment.end - segment.start;
  }
  return elapsed;
}

export function segmentAtSourceTime(edits: VideoEdits, sourceTime: number) {
  const segments = keptVideoSegments(edits);
  const index = segments.findIndex(
    (segment) => sourceTime >= segment.start && sourceTime < segment.end
  );
  return {
    index,
    segment: index >= 0 ? segments[index] : null,
    next: index >= 0 ? segments[index + 1] || null : segments.find((item) => item.start > sourceTime) || null
  };
}
