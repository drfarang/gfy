import { useEffect, useState, type ReactNode } from "react";
import { theme } from "../theme";
import { useDimensions } from "../hooks";
import { decodeHalfBlock, type PixelGrid } from "../image/decode";
import { fetchImageBytes } from "../image/fetch";

function hex(red: number, green: number, blue: number): string {
  const channel = (value: number) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

export function HalfBlockImage({ src }: { src: string }) {
  const [pixels, setPixels] = useState<PixelGrid | null>(null);
  const [failed, setFailed] = useState(false);
  const { cols } = useDimensions();

  useEffect(() => {
    let active = true;
    setPixels(null);
    setFailed(false);
    const maxWidth = Math.max(8, Math.min(cols - 4, 60));
    fetchImageBytes(src)
      .then((bytes) => decodeHalfBlock(bytes, maxWidth, 18))
      .then((grid) => active && setPixels(grid))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [src, cols]);

  if (failed) return <text fg={theme.dim}>[image]</text>;
  if (!pixels || pixels.length === 0) return null;
  const height = pixels.length;
  const width = pixels[0]?.length ?? 0;
  if (width < 2 || height < 1) return null;

  const rows: ReactNode[] = [];
  for (let y = 0; y < height; y += 2) {
    const top = pixels[y] ?? [];
    const bottom = y + 1 < height ? pixels[y + 1] : null;
    const spans: ReactNode[] = [];
    for (let x = 0; x < width; x++) {
      const topPixel = top[x];
      const fg = topPixel ? hex(topPixel.r, topPixel.g, topPixel.b) : undefined;
      const bottomPixel = bottom?.[x];
      const spanProps: { key: number; fg?: string; bg?: string } = { key: x, fg };
      if (bottomPixel) spanProps.bg = hex(bottomPixel.r, bottomPixel.g, bottomPixel.b);
      spans.push(<span {...spanProps}>▀</span>);
    }
    rows.push(<text key={y}>{spans}</text>);
  }

  return <box style={{ flexDirection: "column", marginTop: 1 }}>{rows}</box>;
}
