import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { KittyImageRenderable } from "../src/ui/components/KittyImage";

test("KittyImageRenderable owns and releases its terminal image exactly once", async () => {
  const { renderer } = await createTestRenderer({ width: 20, height: 10 });
  const image = new KittyImageRenderable(renderer, {
    id: "kitty-lifecycle-test",
    pngBytes: Buffer.from([1]),
    placementId: 1,
    cols: 1,
    rows: 1,
    cellPxW: 1,
    cellPxH: 1,
    srcPxW: 1,
    srcPxH: 1,
  });
  const originalWrite = process.stdout.write;
  let output = "";
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stdout.write;

  try {
    image.destroy();
    image.destroy(); // Renderable.destroy is idempotent.
  } finally {
    process.stdout.write = originalWrite;
    renderer.destroy();
  }

  const deleteCommand = `a=d,d=I,i=${image.imageId}`;
  expect(output.split(deleteCommand)).toHaveLength(2);
});
