import { useContext, useEffect, useRef, useState } from "react";
import { theme } from "../theme";
import { useDimensions } from "../hooks";
import { ClipContext } from "../clip";
import { allocPlacementId } from "../kitty";
import { WeightedLru } from "../../util/lru";
import {
  decodeKittyImage,
  preparedImageWeight,
  type PreparedKittyImage,
} from "../image/decode";
import { fetchImageBytes, toAbsolute } from "../image/fetch";
import "./KittyImage"; // registers the <kittyImage> renderable via extend()

export const PREPARED_CACHE_BYTES = 256 * 1024 * 1024;

interface PreparedEntry {
  key: string;
  image: PreparedKittyImage;
}

const preparedCache = new WeightedLru<string, PreparedKittyImage>({
  maxWeight: PREPARED_CACHE_BYTES,
  weightOf: preparedImageWeight,
});
const preparedInFlight = new Map<string, Promise<PreparedKittyImage>>();

async function prepareImage(
  src: string,
  maxCols: number,
  maxRows: number,
  cellW: number,
  cellH: number,
): Promise<PreparedEntry> {
  const key = `${toAbsolute(src)}|${maxCols}x${maxRows}|${cellW.toFixed(2)}x${cellH.toFixed(2)}`;
  const cached = preparedCache.get(key);
  if (cached) return { key, image: cached };

  let pending = preparedInFlight.get(key);
  if (!pending) {
    pending = fetchImageBytes(src).then((bytes) => decodeKittyImage(bytes, { maxCols, maxRows, cellW, cellH }));
    preparedInFlight.set(key, pending);
    const clear = () => {
      if (preparedInFlight.get(key) === pending) preparedInFlight.delete(key);
    };
    void pending.then(clear, clear);
  }

  const image = await pending;
  preparedCache.set(key, image);
  return { key, image };
}

export function KittyImageBlock({ src, cell }: { src: string; cell: { w: number; h: number } }) {
  const { cols: termCols, rows: termRows } = useDimensions();
  const getClip = useContext(ClipContext);
  const placementId = useRef(allocPlacementId()).current;
  const [prepared, setPrepared] = useState<PreparedEntry | null>(null);
  const [failed, setFailed] = useState(false);
  const maxCols = Math.max(20, Math.min(termCols - 4, Math.round(termCols * 0.65)));
  const maxRows = Math.max(20, Math.round((termRows - 3) * 0.85));

  useEffect(() => {
    let active = true;
    setPrepared(null);
    setFailed(false);
    prepareImage(src, maxCols, maxRows, cell.w, cell.h)
      .then((result) => active && setPrepared(result))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [src, maxCols, maxRows, cell.w, cell.h]);

  if (failed) return <text fg={theme.dim}>[image]</text>;
  if (!prepared || prepared.image.cols < 1 || prepared.image.rows < 1) return null;
  const image = prepared.image;

  return (
    <kittyImage
      key={prepared.key}
      style={{ width: image.cols, height: image.rows, marginTop: 1 }}
      pngBytes={image.pngBytes}
      frames={image.frames}
      placementId={placementId}
      cols={image.cols}
      rows={image.rows}
      cellPxW={cell.w}
      cellPxH={cell.h}
      srcPxW={image.srcPxW}
      srcPxH={image.srcPxH}
      getClip={getClip}
    />
  );
}
