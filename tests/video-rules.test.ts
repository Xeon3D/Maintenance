import { describe, expect, it } from "vitest";
import { canCopyVideo, ffmpegArgs, parseProbe, parseRange, posterUrl, tooLong, type VideoProbe } from "@/lib/video-rules";

const probe = (over: Partial<VideoProbe["video"]> = {}, rest: Partial<VideoProbe> = {}): VideoProbe => ({
  duration: 30,
  video: { codec: "h264", pixFmt: "yuv420p", width: 1280, height: 720, rotation: 0, bitRate: 2_000_000, ...over },
  audio: { codec: "aac" },
  ...rest,
});

describe("parseProbe", () => {
  it("reads duration, streams and rotation", () => {
    const p = parseProbe({
      format: { duration: "42.5" },
      streams: [
        { codec_type: "video", codec_name: "hevc", pix_fmt: "yuv420p10le", width: 3840, height: 2160, bit_rate: "45000000", side_data_list: [{ rotation: -90 }] },
        { codec_type: "audio", codec_name: "aac" },
      ],
    });
    expect(p).toEqual({
      duration: 42.5,
      video: { codec: "hevc", pixFmt: "yuv420p10le", width: 3840, height: 2160, rotation: -90, bitRate: 45_000_000 },
      audio: { codec: "aac" },
    });
  });

  it("returns null without a video stream", () => {
    expect(parseProbe({ format: { duration: "10" }, streams: [{ codec_type: "audio", codec_name: "mp3" }] })).toBeNull();
    expect(parseProbe({})).toBeNull();
  });

  it("accepts the old rotate tag and a missing bitrate", () => {
    const p = parseProbe({ format: { duration: "5" }, streams: [{ codec_type: "video", codec_name: "h264", width: 640, height: 480, tags: { rotate: "90" } }] });
    expect(p?.video.rotation).toBe(90);
    expect(p?.video.bitRate).toBeNull();
    expect(p?.audio).toBeNull();
  });
});

describe("limits", () => {
  it("allows a minute with a little slack", () => {
    expect(tooLong(probe({}, { duration: 60.9 }))).toBe(false);
    expect(tooLong(probe({}, { duration: 65 }))).toBe(true);
  });

  it("copies only small, upright H.264", () => {
    expect(canCopyVideo(probe())).toBe(true);
    expect(canCopyVideo(probe({ height: 1280, width: 720 }))).toBe(true);
    expect(canCopyVideo(probe({ width: 1920, height: 1080 }))).toBe(false);
    expect(canCopyVideo(probe({ codec: "hevc" }))).toBe(false);
    expect(canCopyVideo(probe({ rotation: 90 }))).toBe(false);
    expect(canCopyVideo(probe({ pixFmt: "yuv420p10le" }))).toBe(false);
    expect(canCopyVideo(probe({ bitRate: 9_000_000 }))).toBe(false);
  });
});

describe("ffmpegArgs", () => {
  it("copies what it can and always drops metadata", () => {
    const args = ffmpegArgs("in", "out.mp4", probe());
    expect(args.join(" ")).toContain("-c:v copy");
    expect(args.join(" ")).toContain("-c:a copy");
    expect(args.join(" ")).toContain("-map_metadata -1");
    expect(args.join(" ")).toContain("+faststart");
    expect(args.at(-1)).toBe("out.mp4");
  });

  it("re-encodes large or odd video and non-AAC sound", () => {
    const args = ffmpegArgs("in", "out.mp4", probe({ codec: "hevc", width: 3840, height: 2160 }, { audio: { codec: "opus" } })).join(" ");
    expect(args).toContain("-c:v libx264");
    expect(args).toContain("-c:a aac");
    expect(args).toContain("min(1280");
  });

  it("handles silent videos", () => {
    const args = ffmpegArgs("in", "out.mp4", probe({}, { audio: null }));
    expect(args).toContain("-an");
    expect(args).not.toContain("0:a:0");
  });
});

describe("parseRange", () => {
  it("parses the forms players send", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=0-", 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=0-1", 100)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=50-500", 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  });

  it("rejects ranges outside the file and ignores what it can't read", () => {
    expect(parseRange("bytes=100-", 100)).toBe("invalid");
    expect(parseRange("bytes=5-2", 100)).toBe("invalid");
    expect(parseRange("bytes=0-1,5-6", 100)).toBeNull();
    expect(parseRange("items=0-1", 100)).toBeNull();
  });
});

it("builds the poster URL next to the file", () => {
  expect(posterUrl("/api/files/abc")).toBe("/api/files/abc?poster=1");
});
