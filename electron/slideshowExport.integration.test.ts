import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildSlideshowExportArgs } = require("./slideshowExport.cjs");

describe("slideshow FFmpeg integration", () => {
  const directory = mkdtempSync(join(tmpdir(), "videor-export-"));
  const imagePath = join(directory, "photo.jpg");
  const audioPath = join(directory, "audio.wav");
  const outputPath = join(directory, "output.mp4");

  beforeAll(() => {
    execFileSync("ffmpeg", [
      "-loglevel", "error",
      "-y",
      "-f", "lavfi",
      "-i", "color=c=steelblue:s=320x180",
      "-frames:v", "1",
      imagePath
    ]);
    execFileSync("ffmpeg", [
      "-loglevel", "error",
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=0.25",
      audioPath
    ]);
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("keeps the full slideshow duration when the audio ends early", () => {
    const { args } = buildSlideshowExportArgs({
      photos: [{
        path: imagePath,
        duration: 1.2,
        rotation: 0,
        fit: "contain",
        positionX: 50,
        positionY: 50
      }],
      audio: {
        path: audioPath,
        volume: 0.8
      }
    }, {
      format: "mp4",
      resolution: "720p"
    }, outputPath);

    execFileSync("ffmpeg", ["-loglevel", "error", ...args], { timeout: 30000 });
    const probe = JSON.parse(execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type",
      "-of", "json",
      outputPath
    ], { encoding: "utf8" }));

    expect(Number(probe.format.duration)).toBeGreaterThanOrEqual(1.15);
    expect(Number(probe.format.duration)).toBeLessThan(1.4);
    expect(probe.streams.map((stream: { codec_type: string }) => stream.codec_type))
      .toEqual(expect.arrayContaining(["video", "audio"]));
  }, 40000);
});
