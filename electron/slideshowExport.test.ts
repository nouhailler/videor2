import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildSlideshowExportArgs } = require("./slideshowExport.cjs");

describe("slideshow FFmpeg export", () => {
  const project = {
    photos: [{
      path: "/tmp/photo.jpg",
      duration: 4,
      rotation: 0,
      fit: "cover",
      positionX: 50,
      positionY: 50
    }],
    audio: {
      path: "/tmp/audio.wav",
      volume: 0.6
    }
  };

  it("pads short audio and limits the output to the slideshow duration", () => {
    const result = buildSlideshowExportArgs(
      project,
      { format: "mp4", resolution: "720p" },
      "/tmp/output.mp4"
    );
    const audioFilter = result.args[result.args.indexOf("-filter:a") + 1];

    expect(result.totalDuration).toBe(4);
    expect(audioFilter).toBe("volume=0.6,apad");
    expect(result.args).not.toContain("-shortest");
    expect(result.args.slice(result.args.indexOf("-filter:a"))).toContain("-t");
  });

  it("builds a silent slideshow without an audio mapping", () => {
    const result = buildSlideshowExportArgs(
      { ...project, audio: null },
      { format: "webm", resolution: "1080p" },
      "/tmp/output.webm"
    );

    expect(result.args).not.toContain("-filter:a");
    expect(result.args).not.toContain("libopus");
    expect(result.args).toContain("-t");
  });
});
