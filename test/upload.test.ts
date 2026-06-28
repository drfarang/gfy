import { describe, expect, test } from "bun:test";
import { imageExt, parseDroppedImagePath, randomName } from "../src/util/upload";

describe("imageExt", () => {
  test("recognizes image extensions (case-insensitive, ignores query)", () => {
    expect(imageExt("/a/b/c.PNG")).toBe("png");
    expect(imageExt("photo.jpeg")).toBe("jpeg");
    expect(imageExt("https://x.test/a.gif?v=2#frag")).toBe("gif");
  });
  test("rejects non-images", () => {
    expect(imageExt("notes.txt")).toBeNull();
    expect(imageExt("/no/extension")).toBeNull();
  });
});

describe("parseDroppedImagePath", () => {
  test("accepts a plain absolute image path", () => {
    expect(parseDroppedImagePath("/Users/me/cat.png")).toBe("/Users/me/cat.png");
  });
  test("strips surrounding quotes and unescapes spaces", () => {
    expect(parseDroppedImagePath(`'/Users/me/my pic.jpg'`)).toBe("/Users/me/my pic.jpg");
    expect(parseDroppedImagePath(`/Users/me/my\\ pic.jpg`)).toBe("/Users/me/my pic.jpg");
  });
  test("decodes a file:// URL", () => {
    expect(parseDroppedImagePath("file:///Users/me/a%20b.gif")).toBe("/Users/me/a b.gif");
  });
  test("takes only the first line when several are dropped", () => {
    expect(parseDroppedImagePath("/a/one.png\n/a/two.png")).toBe("/a/one.png");
  });
  test("returns null for non-image or non-path text (normal pastes)", () => {
    expect(parseDroppedImagePath("just some pasted text")).toBeNull();
    expect(parseDroppedImagePath("/Users/me/notes.txt")).toBeNull();
    expect(parseDroppedImagePath("https://x.test/a.png")).toBeNull(); // a URL, not a local file
  });
});

describe("randomName", () => {
  test("is a hex name with the given extension and not predictable", () => {
    const a = randomName("png");
    const b = randomName("png");
    expect(a).toMatch(/^[0-9a-f]{10}\.png$/);
    expect(a).not.toBe(b);
  });
});
