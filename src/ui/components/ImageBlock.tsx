import { useState, useEffect, useRef, useContext, type ReactNode } from "react";
import sharp from "sharp";
import { useRenderer } from "@opentui/react";
import { theme } from "../theme";
import { useDimensions } from "../hooks";
import { ClipContext } from "../clip";
import { allocImageId, allocPlacementId, cellPixelSize, kittySupported } from "../kitty";
import "./KittyImage"; // registers the <kittyImage> renderable via extend()

const hex = (r: number, g: number, b: number) => {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
};

function toAbsolute(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return "https://www.gfy.com" + src;
  return "https://www.gfy.com/" + src;
}

// In-memory cache for fetched image bytes to avoid re-downloads on resize.
const byteCache = new Map<string, Buffer>();

async function fetchImageBytes(src: string): Promise<Buffer> {
  const url = toAbsolute(src);
  if (byteCache.has(url)) return byteCache.get(url)!;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": ua, "accept": "image/*,*/*;q=0.8" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const lenStr = res.headers.get("content-length");
    if (lenStr && Number(lenStr) > 8 * 1024 * 1024) throw new Error("too large");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) throw new Error("too large");
    byteCache.set(url, buf);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/** Poll for the terminal's reported pixel resolution (it can arrive a beat late). */
function useCellSize(): { w: number; h: number } | null {
  const renderer = useRenderer();
  const [cell, setCell] = useState(() => cellPixelSize(renderer));
  useEffect(() => {
    if (cell) return;
    let tries = 0;
    const id = setInterval(() => {
      const c = cellPixelSize(renderer);
      if (c) {
        setCell(c);
        clearInterval(id);
      } else if (++tries > 20) {
        clearInterval(id);
      }
    }, 50);
    return () => clearInterval(id);
  }, [cell, renderer]);
  return cell;
}

export function ImageBlock({ src }: { src: string }) {
  const renderer = useRenderer();
  const cell = useCellSize();
  if (kittySupported(renderer) && cell) {
    return <KittyImageBlock src={src} cell={cell} />;
  }
  return <HalfBlockImage src={src} />;
}

// ---------------------------------------------------------------------------
// Kitty graphics path (crisp, real pixels - what Ghostty/kitty/timg can do).
// ---------------------------------------------------------------------------

interface KittyPrep {
  imageId: number;
  pngBytes: Buffer;
  srcPxW: number;
  srcPxH: number;
  cols: number;
  rows: number;
}

const prepCache = new Map<string, KittyPrep>();

async function prepareKittyImage(
  src: string,
  maxCols: number,
  maxRows: number,
  cellW: number,
  cellH: number,
): Promise<KittyPrep> {
  const url = toAbsolute(src);
  const key = `${url}|${maxCols}x${maxRows}|${cellW.toFixed(2)}x${cellH.toFixed(2)}`;
  const cached = prepCache.get(key);
  if (cached) return cached;

  const buf = await fetchImageBytes(src);
  const boxW = Math.max(1, Math.round(maxCols * cellW));
  const boxH = Math.max(1, Math.round(maxRows * cellH));
  const out = await sharp(buf)
    .resize({ width: boxW, height: boxH, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  const w = out.info.width ?? 0;
  const h = out.info.height ?? 0;
  if (w < 2 || h < 2) throw new Error("tiny");

  const prep: KittyPrep = {
    imageId: allocImageId(),
    pngBytes: out.data,
    srcPxW: w,
    srcPxH: h,
    cols: Math.max(1, Math.ceil(w / cellW)),
    rows: Math.max(1, Math.ceil(h / cellH)),
  };
  prepCache.set(key, prep);
  return prep;
}

function KittyImageBlock({ src, cell }: { src: string; cell: { w: number; h: number } }) {
  const { cols: termCols, rows: termRows } = useDimensions();
  const getClip = useContext(ClipContext);
  const placementId = useRef(allocPlacementId()).current;
  const [prep, setPrep] = useState<KittyPrep | null>(null);
  const [failed, setFailed] = useState(false);

  // Scale with the screen (~2x the old fixed caps), but keep images from
  // dominating: width up to ~half the terminal, height up to ~70% of it.
  const maxCols = Math.max(16, Math.min(termCols - 4, 120));
  const maxRows = Math.max(16, Math.min(Math.round(termRows * 0.7), 48));

  useEffect(() => {
    let active = true;
    setPrep(null);
    setFailed(false);
    prepareKittyImage(src, maxCols, maxRows, cell.w, cell.h)
      .then((p) => active && setPrep(p))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [src, maxCols, maxRows, cell.w, cell.h]);

  if (failed) return <text fg={theme.dim}>[image]</text>;
  if (!prep) return null; // pops in once decoded
  if (prep.cols < 1 || prep.rows < 1) return null;

  return (
    <kittyImage
      key={prep.imageId}
      style={{ width: prep.cols, height: prep.rows, marginTop: 1 }}
      pngBytes={prep.pngBytes}
      imageId={prep.imageId}
      placementId={placementId}
      cols={prep.cols}
      rows={prep.rows}
      cellPxW={cell.w}
      cellPxH={cell.h}
      srcPxW={prep.srcPxW}
      srcPxH={prep.srcPxH}
      getClip={getClip}
    />
  );
}

// ---------------------------------------------------------------------------
// Fallback path: half-block (▀) fg/bg mosaic, for terminals without Kitty
// graphics support.
// ---------------------------------------------------------------------------

function HalfBlockImage({ src }: { src: string }) {
  const [pixels, setPixels] = useState<{ r: number; g: number; b: number }[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { cols } = useDimensions();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const buf = await fetchImageBytes(src);

        const maxW = Math.max(8, Math.min(cols - 4, 60));
        const maxH = 18; // ~36 source px tall (faster decode)

        const raw = await sharp(buf)
          .resize({ width: maxW, height: maxH * 2, fit: "inside", withoutEnlargement: true })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const { data, info } = raw;
        const w = info.width ?? 0;
        const h = info.height ?? 0;

        const grid: { r: number; g: number; b: number }[][] = [];
        for (let y = 0; y < h; y++) {
          const row: { r: number; g: number; b: number }[] = [];
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            row.push({
              r: data[idx] ?? 0,
              g: data[idx + 1] ?? 0,
              b: data[idx + 2] ?? 0,
            });
          }
          grid.push(row);
        }

        if (active) {
          if (w < 4 && h < 4) {
            setPixels([]); // drop tiny/spacer images
          } else {
            setPixels(grid);
          }
        }
      } catch (err) {
        if (active) setError(String(err));
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [src, cols]);

  if (error) return <text fg={theme.dim}>[image]</text>;
  if (!pixels) return null;
  if (pixels.length === 0) return null;

  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  if (width < 2 || height < 1) return null;

  const rows: ReactNode[] = [];
  for (let y = 0; y < height; y += 2) {
    const rowTop = pixels[y] ?? [];
    const rowBot = y + 1 < height ? pixels[y + 1] : null;

    const spans: ReactNode[] = [];
    for (let x = 0; x < width; x++) {
      const t = rowTop[x];
      const fg = t ? hex(t.r, t.g, t.b) : undefined;
      const b = rowBot ? rowBot[x] : null;
      const spanProps: any = { key: x, fg };
      if (b) spanProps.bg = hex(b.r, b.g, b.b);
      spans.push(<span {...spanProps}>▀</span>);
    }
    rows.push(<text key={y}>{spans}</text>);
  }

  return <box style={{ flexDirection: "column", marginTop: 1 }}>{rows}</box>;
}
