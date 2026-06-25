/**
 * Low-level Kitty terminal graphics protocol helpers.
 *
 * Ghostty (and kitty) render real pixels via APC `_G` escape sequences. We
 * transmit a PNG once (a=t, keyed by an image id), then cheaply place/crop it
 * at screen-cell coordinates (a=p) as the user scrolls. `timg` uses the same
 * protocol - this is what gives crisp images instead of half-block mosaics.
 *
 * All sequences use `q=2` to suppress the terminal's acknowledgement replies,
 * so they never land in OpenTUI's stdin parser.
 *
 * Writes go straight to stdout. The renderer MUST run single-threaded
 * (`useThread: false`) so these writes don't interleave with the native frame
 * writer on another thread.
 */
import type { CliRenderer } from "@opentui/core";

const ESC = "\x1b";
const APC = ESC + "_G";
const ST = ESC + "\\";

let nextImageId = 1;
let nextPlacementId = 1;
const transmitted = new Set<number>();

export function allocImageId(): number {
  return nextImageId++;
}

export function allocPlacementId(): number {
  return nextPlacementId++;
}

function write(s: string): void {
  process.stdout.write(s);
}

export function kittySupported(renderer: CliRenderer): boolean {
  return renderer.capabilities?.kitty_graphics === true;
}

/** Pixel size of one terminal cell, or null if the terminal hasn't reported it. */
export function cellPixelSize(renderer: CliRenderer): { w: number; h: number } | null {
  const res = renderer.resolution;
  const cols = renderer.terminalWidth;
  const rows = renderer.terminalHeight;
  if (!res || !res.width || !res.height || !cols || !rows) return null;
  return { w: res.width / cols, h: res.height / rows };
}

/** Transmit (store) a PNG under `imageId`. No-op if already transmitted. */
export function transmitImage(imageId: number, pngBytes: Buffer): void {
  if (transmitted.has(imageId)) return;
  const b64 = pngBytes.toString("base64");
  const CHUNK = 4096;
  let out = "";
  if (b64.length <= CHUNK) {
    out = `${APC}a=t,f=100,i=${imageId},q=2,m=0;${b64}${ST}`;
  } else {
    for (let i = 0; i < b64.length; i += CHUNK) {
      const chunk = b64.slice(i, i + CHUNK);
      const last = i + CHUNK >= b64.length;
      out +=
        i === 0
          ? `${APC}a=t,f=100,i=${imageId},q=2,m=1;${chunk}${ST}`
          : `${APC}m=${last ? 0 : 1};${chunk}${ST}`;
    }
  }
  write(out);
  transmitted.add(imageId);
}

export interface Placement {
  imageId: number;
  placementId: number;
  /** 0-based screen cell of the top-left corner. */
  col: number;
  row: number;
  /** display size in cells. */
  cols: number;
  rows: number;
  /** source crop rectangle, in image pixels. */
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
}

/** Place a (cropped) region of a transmitted image at a screen-cell position. */
export function placeImage(p: Placement): void {
  const cup = `${ESC}[${p.row + 1};${p.col + 1}H`; // CUP is 1-based
  const g =
    `${APC}a=p,i=${p.imageId},p=${p.placementId},` +
    `c=${p.cols},r=${p.rows},x=${p.srcX},y=${p.srcY},w=${p.srcW},h=${p.srcH},` +
    `C=1,q=2${ST}`; // C=1: do not advance the cursor
  // Save/restore the cursor so we don't disturb OpenTUI's own cursor handling.
  write(`${ESC}7${cup}${g}${ESC}8`);
}

/** Remove one placement but keep the stored image (lowercase d=i retains data). */
export function deletePlacement(imageId: number, placementId: number): void {
  write(`${APC}a=d,d=i,i=${imageId},p=${placementId},q=2${ST}`);
}

/** Free a stored image and all of its placements. */
export function deleteImage(imageId: number): void {
  transmitted.delete(imageId);
  write(`${APC}a=d,d=I,i=${imageId},q=2${ST}`);
}
