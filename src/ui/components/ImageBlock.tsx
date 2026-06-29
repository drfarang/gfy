import { useEffect, useState } from "react";
import { useRenderer } from "@opentui/react";
import { cellPixelSize, kittySupported } from "../kitty";
import { KittyImageBlock } from "./KittyImageBlock";
import { HalfBlockImage } from "./HalfBlockImage";

/** Poll for terminal pixel resolution because capability metadata can arrive a beat late. */
function useCellSize(): { w: number; h: number } | null {
  const renderer = useRenderer();
  const [cell, setCell] = useState(() => cellPixelSize(renderer));
  useEffect(() => {
    if (cell) return;
    let tries = 0;
    const id = setInterval(() => {
      const next = cellPixelSize(renderer);
      if (next) {
        setCell(next);
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
  return kittySupported(renderer) && cell ? <KittyImageBlock src={src} cell={cell} /> : <HalfBlockImage src={src} />;
}
