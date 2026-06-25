/**
 * A custom OpenTUI renderable that reserves cell space in the layout and draws
 * a real image into it via the Kitty graphics protocol.
 *
 * OpenTUI's cell buffer can't express graphics, so we bypass it: the box stays
 * empty (no text drawn over the image) while `renderSelf` emits placement
 * escapes each frame the renderable is rendered. We diff against the last
 * placement and only re-emit when the visible rectangle changes, so a settled
 * image doesn't flicker; scrolling re-clips it to the viewport.
 */
import {
  Renderable,
  type RenderContext,
  type RenderableOptions,
  type OptimizedBuffer,
} from "@opentui/core";
import { extend } from "@opentui/react";
import type { Rect } from "../clip";
import { transmitImage, placeImage, deletePlacement } from "../kitty";

export interface KittyImageOptions extends RenderableOptions {
  pngBytes?: Buffer;
  imageId?: number;
  placementId?: number;
  cols?: number;
  rows?: number;
  cellPxW?: number;
  cellPxH?: number;
  srcPxW?: number;
  srcPxH?: number;
  getClip?: (() => Rect | null) | null;
}

export class KittyImageRenderable extends Renderable {
  pngBytes: Buffer | null = null;
  imageId = 0;
  placementId = 0;
  imgCols = 0;
  imgRows = 0;
  cellPxW = 0;
  cellPxH = 0;
  srcPxW = 0;
  srcPxH = 0;
  getClip: (() => Rect | null) | null = null;

  private lastKey = "";
  private placed = false;
  private lastTermW = 0;
  private lastTermH = 0;

  constructor(ctx: RenderContext, options: KittyImageOptions) {
    super(ctx, options);
    this.pngBytes = options.pngBytes ?? null;
    this.imageId = options.imageId ?? 0;
    this.placementId = options.placementId ?? 0;
    this.imgCols = options.cols ?? 0;
    this.imgRows = options.rows ?? 0;
    this.cellPxW = options.cellPxW ?? 0;
    this.cellPxH = options.cellPxH ?? 0;
    this.srcPxW = options.srcPxW ?? 0;
    this.srcPxH = options.srcPxH ?? 0;
    this.getClip = options.getClip ?? null;
  }

  protected override renderSelf(_buffer: OptimizedBuffer, _dt: number): void {
    if (!this.pngBytes || !this.imageId) return;
    if (this.imgCols < 1 || this.imgRows < 1) return;
    if (this.cellPxW <= 0 || this.cellPxH <= 0) return;

    // Terminals may drop images when the screen is cleared on resize, so force a
    // re-placement whenever the terminal dimensions change.
    const termW = this.ctx.width;
    const termH = this.ctx.height;
    if (termW !== this.lastTermW || termH !== this.lastTermH) {
      this.lastTermW = termW;
      this.lastTermH = termH;
      this.lastKey = "";
    }

    transmitImage(this.imageId, this.pngBytes);

    const col = this.screenX;
    const row = this.screenY;
    const cols = this.imgCols;
    const rows = this.imgRows;

    // Clip to the scroll viewport (if any) and to the screen.
    const clip = this.getClip?.() ?? { x: 0, y: 0, width: termW, height: termH };
    const clipRight = clip.x + clip.width;
    const clipBottom = clip.y + clip.height;

    const visLeft = Math.max(col, clip.x, 0);
    const visTop = Math.max(row, clip.y, 0);
    const visRight = Math.min(col + cols, clipRight, termW);
    const visBottom = Math.min(row + rows, clipBottom, termH);

    const visCols = visRight - visLeft;
    const visRows = visBottom - visTop;

    if (visCols < 1 || visRows < 1) {
      if (this.placed) {
        deletePlacement(this.imageId, this.placementId);
        this.placed = false;
        this.lastKey = "";
      }
      return;
    }

    const hiddenLeft = visLeft - col;
    const hiddenTop = visTop - row;

    // Source crop (image pixels), clamped to the transmitted image bounds.
    const srcX = Math.min(Math.round(hiddenLeft * this.cellPxW), Math.max(0, this.srcPxW - 1));
    const srcY = Math.min(Math.round(hiddenTop * this.cellPxH), Math.max(0, this.srcPxH - 1));
    const srcW = Math.min(Math.round(visCols * this.cellPxW), this.srcPxW - srcX);
    const srcH = Math.min(Math.round(visRows * this.cellPxH), this.srcPxH - srcY);
    if (srcW < 1 || srcH < 1) return;

    const key = `${visLeft},${visTop},${visCols},${visRows},${srcX},${srcY},${srcW},${srcH}`;
    if (key === this.lastKey) return;

    if (this.placed) deletePlacement(this.imageId, this.placementId);
    placeImage({
      imageId: this.imageId,
      placementId: this.placementId,
      col: visLeft,
      row: visTop,
      cols: visCols,
      rows: visRows,
      srcX,
      srcY,
      srcW,
      srcH,
    });
    this.placed = true;
    this.lastKey = key;
  }

  protected override destroySelf(): void {
    if (this.placed) {
      deletePlacement(this.imageId, this.placementId);
      this.placed = false;
    }
    super.destroySelf();
  }
}

declare module "@opentui/react" {
  interface OpenTUIComponents {
    kittyImage: typeof KittyImageRenderable;
  }
}

extend({ kittyImage: KittyImageRenderable });
