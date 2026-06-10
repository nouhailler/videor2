import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  contentTypeForExtension,
  parseByteRange
} = require("./mediaProtocol.cjs");

describe("media protocol", () => {
  it("returns explicit MIME types for videos", () => {
    expect(contentTypeForExtension(".mp4")).toBe("video/mp4");
    expect(contentTypeForExtension(".WEBM")).toBe("video/webm");
    expect(contentTypeForExtension(".txt")).toBeNull();
  });

  it("parses bounded and open byte ranges", () => {
    expect(parseByteRange("bytes=100-199", 1000)).toEqual({ start: 100, end: 199 });
    expect(parseByteRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("parses suffix byte ranges and rejects invalid ranges", () => {
    expect(parseByteRange("bytes=-250", 1000)).toEqual({ start: 750, end: 999 });
    expect(parseByteRange("bytes=1000-", 1000)).toBeNull();
    expect(parseByteRange("items=0-10", 1000)).toBeNull();
  });
});
