import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { validateProject } = require("./projectValidation.cjs");

describe("project validation", () => {
  it("normalizes a compatible version 1 project", () => {
    expect(validateProject({
      format: "videor-project",
      version: 1,
      name: "  Vacances  ",
      photos: [{
        path: "/tmp/photo.jpg",
        duration: 3
      }]
    })).toEqual({
      format: "videor-project",
      version: 1,
      name: "Vacances",
      photos: [{
        id: "photo-1",
        path: "/tmp/photo.jpg",
        name: "photo.jpg",
        duration: 3,
        rotation: 0,
        fit: "cover",
        positionX: 50,
        positionY: 50
      }],
      audio: null,
      video: null
    });
  });

  it("rejects invalid media data and incompatible project versions", () => {
    expect(() => validateProject({
      format: "videor-project",
      version: 1,
      photos: [{ path: "/tmp/script.exe" }]
    })).toThrow("format non pris en charge");

    expect(() => validateProject({
      format: "videor-project",
      version: 2,
      photos: []
    })).toThrow("version");
  });

  it("rejects projects mixing slideshow and video modes", () => {
    expect(() => validateProject({
      format: "videor-project",
      version: 1,
      photos: [{ path: "/tmp/photo.jpg" }],
      video: {
        path: "/tmp/video.mp4",
        duration: 10,
        trimStart: 0,
        trimEnd: 10,
        cuts: []
      }
    })).toThrow("diaporama et une vidéo");
  });

  it("rejects malformed video cuts and external audio in video mode", () => {
    const video = {
      path: "/tmp/video.mp4",
      duration: 10,
      trimStart: 0,
      trimEnd: 10,
      cuts: []
    };
    expect(() => validateProject({
      format: "videor-project",
      version: 1,
      photos: [],
      video: { ...video, cuts: "invalid" }
    })).toThrow("liste des coupes");

    expect(() => validateProject({
      format: "videor-project",
      version: 1,
      photos: [],
      audio: { path: "/tmp/audio.mp3" },
      video
    })).toThrow("piste audio externe");
  });
});
