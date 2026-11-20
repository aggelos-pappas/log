import { describe, expect, test } from "bun:test";
import { ADDRESS_NONE, ADDRESS_WAITING, addressText } from "./widget/address.ts";

describe("the browser view's address bar", () => {
  test("a page that is shown but has no web address no longer says it is waiting", () => {
    expect(addressText(null, false)).toBe(ADDRESS_WAITING);
    expect(addressText({ address: null, generation: null }, false)).toBe(ADDRESS_WAITING);
    expect(addressText({ address: null, generation: "a".repeat(32) }, false)).toBe(ADDRESS_NONE);
    expect(addressText({ address: null, generation: null }, true)).toBe(ADDRESS_NONE);
    expect(addressText({ address: "https://example.com/login", generation: "a".repeat(32) }, true)).toBe("https://example.com/login");
  });
});
