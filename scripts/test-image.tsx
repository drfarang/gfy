// Visual test for crisp inline Kitty images (with scroll-clipping).
// Run this INSIDE Ghostty/kitty:  bun run scripts/test-image.tsx [image-url ...]
//   - real images render via the Kitty graphics protocol (like timg)
//   - scroll with up/down to verify they crop to the viewport AND that the
//     surrounding text stays intact
//   - q / ctrl-c to exit
import { createCliRenderer, type ScrollBoxRenderable } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { useRef, useCallback } from "react";
import { ImageBlock } from "../src/ui/components/ImageBlock";
import { ClipContext, type Rect } from "../src/ui/clip";
import { kittySupported, cellPixelSize } from "../src/ui/kitty";

const urls =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : [
        "https://tjeezers.com/wp-content/uploads/2026/05/Tjeezers_com-e1779048333270.png",
        "https://placehold.co/600x200/7aa2f7/1a1b26/png?text=Kitty+Graphics",
      ];

// Lorem-ish filler so there's plenty of text to scroll past the images.
const FILLER = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen",
  "liquor jugs. How vexingly quick daft zebras jump! Sphinx of black quartz,",
  "judge my vow. The five boxing wizards jump quickly. Bright vixens jab.",
];

function Test() {
  const renderer = useRenderer();
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const getClip = useCallback((): Rect | null => {
    const v = scrollRef.current?.viewport;
    return v ? { x: v.screenX, y: v.screenY, width: v.width, height: v.height } : null;
  }, []);

  useKeyboard((k) => {
    const n = String(k.name);
    if (n === "q" || n === "escape") {
      try { renderer.destroy(); } catch {}
      process.exit(0);
    } else if (n === "down" || n === "j") scrollRef.current?.scrollBy(2);
    else if (n === "up" || n === "k") scrollRef.current?.scrollBy(-2);
  });

  return (
    <box style={{ flexDirection: "column", padding: 1, flexGrow: 1 }}>
      {/* Constant header: if THIS garbles after images load/scroll, image
          escapes are corrupting text. If it stays clean, we're good. */}
      <text fg="#7aa2f7">image test  ---  up/down to scroll  ---  q to quit</text>
      <ClipContext.Provider value={getClip}>
        <scrollbox ref={scrollRef} focused viewportCulling={false} style={{ flexGrow: 1, marginTop: 1 }}>
          {urls.map((u, i) => (
            <box key={i} style={{ flexDirection: "column", marginBottom: 1 }}>
              <text fg="#9ece6a">{`### image ${i + 1} (text above) ###`}</text>
              <text fg="#565f89">{u}</text>
              <ImageBlock src={u} />
              <text fg="#9ece6a">{`### image ${i + 1} (text below) ###`}</text>
              {FILLER.map((line, j) => (
                <text key={j} fg="#c0caf5">{line}</text>
              ))}
            </box>
          ))}
          <text fg="#565f89">--- end (scroll up/down to test clipping) ---</text>
        </scrollbox>
      </ClipContext.Provider>
    </box>
  );
}

// Report detected mode to stderr so it doesn't perturb the on-screen text.
const renderer = await createCliRenderer({ useThread: false });
const cell = cellPixelSize(renderer);
process.stderr.write(
  `[test-image] mode=${kittySupported(renderer) && cell ? "KITTY" : "half-block"} ` +
    `cellpx=${cell ? `${cell.w.toFixed(1)}x${cell.h.toFixed(1)}` : "unknown"}\n`,
);
createRoot(renderer).render(<Test />);
