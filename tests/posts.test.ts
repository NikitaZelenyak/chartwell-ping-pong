import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COMMENT_BODY_MAX_LENGTH,
  parseVideoUrl,
  POST_BODY_MAX_LENGTH,
  validateCommentInput,
  validatePostInput,
} from "../lib/posts";

describe("parseVideoUrl", () => {
  const supportedCases = [
    ["https://www.youtube.com/watch?v=M7lc1UVf-VE", "youtube", "M7lc1UVf-VE"],
    ["https://youtu.be/M7lc1UVf-VE?t=10", "youtube", "M7lc1UVf-VE"],
    ["https://youtube.com/shorts/M7lc1UVf-VE", "youtube", "M7lc1UVf-VE"],
    ["https://vimeo.com/76979871", "vimeo", "76979871"],
    [
      "https://www.tiktok.com/@scout2015/video/6718335390845095173",
      "tiktok",
      "6718335390845095173",
    ],
    ["https://www.instagram.com/reel/ABC_123-x/", "instagram", "reel:ABC_123-x"],
    ["https://instagram.com/p/ABC_123-x/", "instagram", "p:ABC_123-x"],
  ] as const;

  for (const [url, provider, key] of supportedCases) {
    it(`parses ${url}`, () => {
      assert.deepEqual(
        { provider: parseVideoUrl(url).provider, key: parseVideoUrl(url).key },
        { provider, key },
      );
    });
  }

  it("uses a safe external card for unsupported and deceptive hosts", () => {
    assert.deepEqual(
      {
        provider: parseVideoUrl("https://example.com/video/42").provider,
        hostname: parseVideoUrl("https://example.com/video/42").hostname,
        key: parseVideoUrl("https://example.com/video/42").key,
      },
      { provider: "external", hostname: "example.com", key: null },
    );

    const deceptive = parseVideoUrl(
      "https://youtube.com.evil.example/watch?v=M7lc1UVf-VE",
    );
    assert.equal(deceptive.provider, "external");
    assert.equal(deceptive.hostname, "youtube.com.evil.example");
  });

  it("removes fragments from external URLs", () => {
    assert.equal(
      parseVideoUrl("https://example.com/watch?id=42#private").url,
      "https://example.com/watch?id=42",
    );
  });

  for (const url of [
    "not a url",
    "http://youtube.com/watch?v=M7lc1UVf-VE",
    "https://user:password@example.com/video",
  ]) {
    it(`rejects unsafe or malformed URL ${url}`, () => {
      assert.throws(() => parseVideoUrl(url));
    });
  }
});

describe("validatePostInput", () => {
  it("accepts text-only, video-only, and combined posts", () => {
    assert.equal(validatePostInput("A great rally", "").ok, true);
    assert.equal(validatePostInput("", "https://vimeo.com/76979871").ok, true);
    assert.equal(
      validatePostInput(
        "Watch the footwork",
        "https://vimeo.com/76979871",
      ).ok,
      true,
    );
  });

  it("trims content and stores blank fields as null", () => {
    assert.deepEqual(validatePostInput("  Nice point  ", ""), {
      ok: true,
      value: { body: "Nice point", video: null },
    });
  });

  it("rejects an empty post", () => {
    const result = validatePostInput("  ", "  ");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(typeof result.fieldErrors.form, "string");
    }
  });

  it("rejects an oversized thought", () => {
    const result = validatePostInput("x".repeat(POST_BODY_MAX_LENGTH + 1), "");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(typeof result.fieldErrors.body, "string");
    }
  });

  it("reports unsafe video links on the video field", () => {
    const result = validatePostInput("", "javascript:alert(1)");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(typeof result.fieldErrors.videoUrl, "string");
    }
  });
});

describe("validateCommentInput", () => {
  it("trims valid comments", () => {
    assert.deepEqual(validateCommentInput("  Great tip!  "), {
      ok: true,
      value: "Great tip!",
    });
  });

  it("rejects blank and oversized comments", () => {
    assert.equal(validateCommentInput(" ").ok, false);
    assert.equal(
      validateCommentInput("x".repeat(COMMENT_BODY_MAX_LENGTH + 1)).ok,
      false,
    );
  });
});
