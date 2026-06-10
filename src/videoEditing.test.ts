import { describe, expect, it } from "vitest";
import {
  editedTimeToSource,
  editedVideoDuration,
  keptVideoSegments,
  normalizeVideoEdits,
  sourceTimeToEdited
} from "./videoEditing";

describe("video editing ranges", () => {
  it("merges overlapping cuts and clamps them to the trimmed video", () => {
    expect(normalizeVideoEdits({
      duration: 100,
      trimStart: 10,
      trimEnd: 90,
      cuts: [
        { start: 5, end: 15 },
        { start: 14, end: 30 },
        { start: 70, end: 120 }
      ]
    })).toEqual({
      duration: 100,
      trimStart: 10,
      trimEnd: 90,
      cuts: [
        { start: 10, end: 30 },
        { start: 70, end: 90 }
      ]
    });
  });

  it("returns the portions that remain after internal cuts", () => {
    expect(keptVideoSegments({
      duration: 60,
      trimStart: 5,
      trimEnd: 55,
      cuts: [
        { start: 15, end: 20 },
        { start: 35, end: 40 }
      ]
    })).toEqual([
      { start: 5, end: 15 },
      { start: 20, end: 35 },
      { start: 40, end: 55 }
    ]);
  });

  it("calculates the final duration", () => {
    expect(editedVideoDuration({
      duration: 60,
      trimStart: 5,
      trimEnd: 55,
      cuts: [{ start: 15, end: 20 }]
    })).toBe(45);
  });

  it("maps edited time to source time across a removed range", () => {
    const edits = {
      duration: 30,
      trimStart: 5,
      trimEnd: 25,
      cuts: [{ start: 10, end: 15 }]
    };
    expect(editedTimeToSource(edits, 0)).toBe(5);
    expect(editedTimeToSource(edits, 5)).toBe(10);
    expect(editedTimeToSource(edits, 6)).toBe(16);
    expect(sourceTimeToEdited(edits, 16)).toBe(6);
  });
});
