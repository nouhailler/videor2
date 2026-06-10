import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  buildVideoExportArgs,
  normalizeVideoSegments
} = require("./videoExport.cjs");

describe("video FFmpeg export", () => {
  const video = {
    path: "/tmp/source.mp4",
    duration: 20,
    trimStart: 2,
    trimEnd: 18,
    cuts: [{ start: 7, end: 10 }],
    hasAudio: true
  };

  it("builds the kept source segments", () => {
    expect(normalizeVideoSegments(video)).toEqual([
      { start: 2, end: 7 },
      { start: 10, end: 18 }
    ]);
  });

  it("builds video and audio trim filters followed by concat", () => {
    const result = buildVideoExportArgs(
      video,
      { format: "mp4", resolution: "720p" },
      "/tmp/output.mp4"
    );
    const filters = result.args[result.args.indexOf("-filter_complex") + 1];

    expect(result.totalDuration).toBe(13);
    expect(filters).toContain("[0:v]trim=start=2:end=7");
    expect(filters).toContain("[0:a]atrim=start=10:end=18");
    expect(filters).toContain("concat=n=2:v=1:a=1[vout][aout]");
    expect(result.args).toContain("[aout]");
    expect(result.args.at(-1)).toBe("/tmp/output.mp4");
  });
});
