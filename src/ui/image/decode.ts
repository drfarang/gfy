import sharp from "sharp";
import type { AnimFrame } from "../kitty";

export const MAX_SCALE = 3;
export const MAX_FRAMES = 48;

export interface KittyDecodeBounds {
  maxCols: number;
  maxRows: number;
  cellW: number;
  cellH: number;
}

export interface PreparedKittyImage {
  pngBytes: Buffer;
  frames: AnimFrame[];
  srcPxW: number;
  srcPxH: number;
  cols: number;
  rows: number;
}

export interface RgbPixel {
  r: number;
  g: number;
  b: number;
}

export type PixelGrid = RgbPixel[][];

export function clampDelay(ms: number | undefined): number {
  if (!ms || ms < 20) return 100;
  return ms;
}

export async function decodeKittyImage(buf: Buffer, bounds: KittyDecodeBounds): Promise<PreparedKittyImage> {
  const boxW = Math.max(1, Math.round(bounds.maxCols * bounds.cellW));
  const boxH = Math.max(1, Math.round(bounds.maxRows * bounds.cellH));
  const metadata = await sharp(buf).metadata();
  const pages = metadata.pages ?? 1;
  const srcW = metadata.width ?? boxW;
  const srcH = metadata.pageHeight ?? metadata.height ?? boxH;
  const scale = Math.min(boxW / srcW, boxH / srcH, MAX_SCALE);
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  return pages > 1
    ? await decodeAnimated(buf, pages, metadata.delay, targetW, targetH, bounds.cellW, bounds.cellH)
    : await decodeStill(buf, targetW, targetH, bounds.cellW, bounds.cellH);
}

async function decodeStill(
  buf: Buffer,
  targetW: number,
  targetH: number,
  cellW: number,
  cellH: number,
): Promise<PreparedKittyImage> {
  const out = await sharp(buf)
    .resize({ width: targetW, height: targetH, fit: "fill" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const width = out.info.width ?? 0;
  const height = out.info.height ?? 0;
  if (width < 2 || height < 2) throw new Error("tiny");

  return {
    pngBytes: out.data,
    frames: [{ pngBytes: out.data, delayMs: 0 }],
    srcPxW: width,
    srcPxH: height,
    cols: Math.max(1, Math.ceil(width / cellW)),
    rows: Math.max(1, Math.ceil(height / cellH)),
  };
}

async function decodeAnimated(
  buf: Buffer,
  pages: number,
  delays: number[] | undefined,
  targetW: number,
  targetH: number,
  cellW: number,
  cellH: number,
): Promise<PreparedKittyImage> {
  const frameCount = Math.min(pages, MAX_FRAMES);
  const { data, info } = await sharp(buf, { pages: frameCount })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frameWidth = info.width ?? 0;
  const frameHeight = info.pageHeight ?? Math.round((info.height ?? 0) / frameCount);
  if (frameWidth < 2 || frameHeight < 2) throw new Error("tiny");

  const bytesPerFrame = frameWidth * frameHeight * 4;
  const frames: AnimFrame[] = [];
  for (let index = 0; index < frameCount; index++) {
    const start = index * bytesPerFrame;
    const slice = data.subarray(start, start + bytesPerFrame);
    if (slice.length < bytesPerFrame) break;
    const pngBytes = await sharp(slice, { raw: { width: frameWidth, height: frameHeight, channels: 4 } })
      .resize({ width: targetW, height: targetH, fit: "fill" })
      .png()
      .toBuffer();
    frames.push({ pngBytes, delayMs: clampDelay(delays?.[index]) });
  }
  if (frames.length === 0) throw new Error("no frames");

  const metadata = await sharp(frames[0]!.pngBytes).metadata();
  const width = metadata.width ?? targetW;
  const height = metadata.height ?? targetH;
  return {
    pngBytes: frames[0]!.pngBytes,
    frames,
    srcPxW: width,
    srcPxH: height,
    cols: Math.max(1, Math.ceil(width / cellW)),
    rows: Math.max(1, Math.ceil(height / cellH)),
  };
}

export async function decodeHalfBlock(buf: Buffer, maxWidth: number, maxRows: number): Promise<PixelGrid> {
  const { data, info } = await sharp(buf)
    .resize({ width: maxWidth, height: maxRows * 2, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (width < 4 && height < 4) return [];

  const grid: PixelGrid = [];
  for (let y = 0; y < height; y++) {
    const row: RgbPixel[] = [];
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      row.push({ r: data[index] ?? 0, g: data[index + 1] ?? 0, b: data[index + 2] ?? 0 });
    }
    grid.push(row);
  }
  return grid;
}

/** Retained PNG memory, counting the root frame only once. */
export function preparedImageWeight(image: PreparedKittyImage): number {
  const buffers = new Set<Buffer>([image.pngBytes, ...image.frames.map((frame) => frame.pngBytes)]);
  let total = 0;
  for (const buffer of buffers) total += buffer.length;
  return total;
}
