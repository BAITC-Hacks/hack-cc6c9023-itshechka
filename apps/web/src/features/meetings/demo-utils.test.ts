import { describe, expect, it } from "vitest";
import { parseTimestamp, validateMeetingFile } from "./demo-utils";

describe("validateMeetingFile", () => {
  it("accepts supported audio and video formats case-insensitively", () => {
    expect(validateMeetingFile({ name: "meeting.M4A", size: 1024 })).toBeNull();
    expect(validateMeetingFile({ name: "meeting.webm", size: 1024 })).toBeNull();
  });

  it("rejects unsupported, empty and oversized files", () => {
    expect(validateMeetingFile({ name: "notes.pdf", size: 1024 })).toContain("MP3");
    expect(validateMeetingFile({ name: "empty.mp3", size: 0 })).toContain("пустой");
    expect(validateMeetingFile({ name: "huge.mp4", size: 2 * 1024 ** 3 + 1 })).toContain("2 ГБ");
  });
});

describe("parseTimestamp", () => {
  it("converts minute and hour timecodes to seconds", () => {
    expect(parseTimestamp("02:31")).toBe(151);
    expect(parseTimestamp("01:02:03")).toBe(3723);
  });
});
