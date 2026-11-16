import { describe, expect, test } from "bun:test";
import { ownPostLine } from "./helpers/posts.ts";

describe("log linkedin posts", () => {
  test("a post line shows when, reactions by type, comments, reposts and the link", () => {
    const line = ownPostLine({ activityId: "1", url: "https://www.linkedin.com/feed/update/urn:li:activity:1/", text: "We didn't place", postedAgo: "3h", repost: false, content: null, reactions: 5, comments: 2, reposts: 0, reactionTypes: { LIKE: 3, PRAISE: 1, EMPATHY: 1 } }, 0);
    expect(line).toContain("3h · 5 reactions (like 3, praise 1, empathy 1) · 2 comments · 0 reposts");
    expect(line).toContain("urn:li:activity:1/");
  });

  test("a repost says so, since its numbers are the original's", () => {
    expect(ownPostLine({ activityId: "2", url: null, text: "", postedAgo: "3d", repost: true, content: null, reactions: 2312, comments: 94, reposts: 12, reactionTypes: {} }, 1)).toContain("3d · repost · 2312 reactions");
  });
});
