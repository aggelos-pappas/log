import { describe, expect, test } from "bun:test";
import { postLine, postsCommand } from "./helpers/posts.ts";

describe("log twitter posts", () => {
  test("a post line shows when, the stats, the link, the text and the video", () => {
    const line = postLine({ id: "1", url: "https://x.com/someone/status/1", createdAt: "Thu Nov 12", text: "introducing log", repostOf: null, isQuote: false, likes: 254, reposts: 30, replies: 12, quotes: 2, views: 20212, media: [{ type: "video", url: "t.jpg", videoUrl: "https://video.twimg.com/high.mp4", durationMs: 62186 }] }, 0);
    expect(line).toContain("20212 views · 254 likes");
    expect(line).toContain("https://x.com/someone/status/1");
    expect(line).toContain("video 62 s https://video.twimg.com/high.mp4");
  });

  test("a repost names whose post it was", () => {
    expect(postLine({ id: "2", url: "u", createdAt: null, text: "", repostOf: "other", isQuote: false, likes: 0, reposts: 0, replies: 0, quotes: 0, views: 0, media: [] }, 1)).toContain("repost of @other");
  });

  test("it needs a handle and refuses anything else before X is called", async () => {
    const out = await postsCommand.run({} as never, ["--account", "xAccount", "--user", "not a handle!"]);
    expect(out.code).not.toBe(0);
  });
});
