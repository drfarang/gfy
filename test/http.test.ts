import { describe, expect, test } from "bun:test";
import { decodeHtml } from "../src/vb/http";

function encoded(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function bytes(values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

describe("decodeHtml", () => {
  test("prefers valid UTF-8 even when vB6 declares latin1", () => {
    expect(decodeHtml(encoded("Hello from Spain — GFY"), "text/html; charset=ISO-8859-1")).toBe(
      "Hello from Spain — GFY",
    );
  });

  test("falls back to latin1 for legacy non-UTF-8 bytes", () => {
    expect(decodeHtml(bytes([0x63, 0x61, 0x66, 0xe9]), "text/html; charset=ISO-8859-1")).toBe("café");
  });
});
