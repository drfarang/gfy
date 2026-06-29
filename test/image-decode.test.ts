import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import {
  clampDelay,
  decodeHalfBlock,
  decodeKittyImage,
  preparedImageWeight,
} from "../src/ui/image/decode";

async function solidPng(width: number, height: number, background = "#ff0000"): Promise<Buffer> {
  return await sharp({ create: { width, height, channels: 4, background } }).png().toBuffer();
}

async function twoFrameGif(): Promise<Buffer> {
  const frameBytes = 2 * 2 * 4;
  const data = Buffer.alloc(frameBytes * 2);
  for (let i = 0; i < frameBytes; i += 4) {
    data.set([255, 0, 0, 255], i);
    data.set([0, 0, 255, 255], frameBytes + i);
  }
  return await sharp(data, { raw: { width: 2, height: 4, channels: 4, pageHeight: 2 } })
    .gif({ delay: [10, 40], keepDuplicateFrames: true })
    .toBuffer();
}

describe("decodeKittyImage", () => {
  test("fits a still image into the pixel box and reports cell dimensions", async () => {
    const image = await decodeKittyImage(await solidPng(100, 50), {
      maxCols: 10,
      maxRows: 10,
      cellW: 10,
      cellH: 10,
    });

    expect(image.frames).toHaveLength(1);
    expect(image.srcPxW).toBe(100);
    expect(image.srcPxH).toBe(50);
    expect(image.cols).toBe(10);
    expect(image.rows).toBe(5);
  });

  test("caps enlargement at three times the source dimensions", async () => {
    const image = await decodeKittyImage(await solidPng(10, 10), {
      maxCols: 20,
      maxRows: 20,
      cellW: 10,
      cellH: 10,
    });
    expect(image.srcPxW).toBe(30);
    expect(image.srcPxH).toBe(30);
  });

  test("decodes animation frames and clamps browser-hostile delays", async () => {
    const image = await decodeKittyImage(await twoFrameGif(), {
      maxCols: 10,
      maxRows: 10,
      cellW: 1,
      cellH: 1,
    });
    expect(image.frames).toHaveLength(2);
    expect(image.frames.map((frame) => frame.delayMs)).toEqual([100, 40]);
  });

  test("counts unique retained PNG buffers", async () => {
    const image = await decodeKittyImage(await solidPng(8, 8), {
      maxCols: 8,
      maxRows: 8,
      cellW: 1,
      cellH: 1,
    });
    expect(preparedImageWeight(image)).toBe(image.pngBytes.length);
  });
});

describe("decodeHalfBlock", () => {
  test("returns an RGBA-derived pixel grid at the requested bounds", async () => {
    const grid = await decodeHalfBlock(await solidPng(4, 4, "#0a141e"), 4, 2);
    expect(grid).toHaveLength(4);
    expect(grid[0]).toHaveLength(4);
    expect(grid[0]?.[0]).toEqual({ r: 10, g: 20, b: 30 });
  });

  test("drops tiny spacer images", async () => {
    expect(await decodeHalfBlock(await solidPng(2, 2), 10, 18)).toEqual([]);
  });
});

test("clampDelay floors missing and very short frame delays", () => {
  expect(clampDelay(undefined)).toBe(100);
  expect(clampDelay(0)).toBe(100);
  expect(clampDelay(19)).toBe(100);
  expect(clampDelay(20)).toBe(20);
});
