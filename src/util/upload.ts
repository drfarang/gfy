import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where uploaded images go and how to reach them publicly. */
export interface UploadTarget {
  /** ssh/scp host (e.g. an alias from ~/.ssh/config). Empty disables upload. */
  host: string;
  /** Absolute directory on the host, e.g. /var/www/uploads */
  dir: string;
  /** Public URL base that serves `dir`, e.g. https://uploads.example.com/ */
  baseUrl: string;
}

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "apng", "avif"]);

/** Returns the lowercased image extension of a path/name/URL, or null. */
export function imageExt(pathOrName: string): string | null {
  const m = pathOrName.toLowerCase().match(/\.([a-z0-9]+)(?:[?#].*)?$/);
  return m && IMAGE_EXT.has(m[1]!) ? m[1]! : null;
}

/**
 * Interpret a dragged/pasted string as a local image file path. Terminals drop
 * a file as its path (sometimes a file:// URL, quoted, or with escaped spaces);
 * we return the path only if it points at an image, else null (so normal text
 * pastes are left alone).
 */
export function parseDroppedImagePath(text: string): string | null {
  let s = (text.split(/\r?\n/)[0] ?? "").trim();
  if (!s) return null;
  s = s.replace(/^['"]|['"]$/g, ""); // surrounding quotes
  if (s.startsWith("file://")) {
    try {
      s = decodeURIComponent(new URL(s).pathname);
    } catch {
      /* not a URL, keep as-is */
    }
  }
  s = s.replace(/\\ /g, " "); // shell-escaped spaces (Ghostty)
  if (s.startsWith("~")) s = (process.env.HOME ?? "~") + s.slice(1);
  if (!s.startsWith("/")) return null;
  return imageExt(s) ? s : null;
}

/** Random, non-identifying file name with the given extension. */
export function randomName(ext: string): string {
  return randomBytes(5).toString("hex") + "." + ext;
}

const trimSlash = (s: string) => s.replace(/\/+$/, "");

/**
 * scp a local image to the target host and return its public URL. Throws with
 * the scp stderr on failure (bad host, perms, no key, etc.).
 */
export async function uploadImageFile(localPath: string, target: UploadTarget): Promise<string> {
  if (!target.host) throw new Error("image upload is not configured (no host)");
  const name = randomName(imageExt(localPath) ?? "png");
  const remote = `${target.host}:${trimSlash(target.dir)}/${name}`;
  const proc = Bun.spawn(
    ["scp", "-q", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", localPath, remote],
    { stdout: "pipe", stderr: "pipe" },
  );
  const code = await proc.exited;
  if (code !== 0) {
    const err = (await new Response(proc.stderr).text()).trim();
    throw new Error(err || `scp exited with code ${code}`);
  }
  return `${trimSlash(target.baseUrl)}/${name}`;
}

/**
 * Dump the current clipboard image to a temp PNG and return its path, or null
 * if the clipboard holds no image. Prefers `pngpaste`; falls back to osascript.
 */
export async function clipboardImageToTempFile(): Promise<string | null> {
  const out = join(tmpdir(), `gfy-clip-${randomName("png")}`);

  if (Bun.which("pngpaste")) {
    const p = Bun.spawn(["pngpaste", out], { stdout: "ignore", stderr: "ignore" });
    if ((await p.exited) === 0 && Bun.file(out).size > 0) return out;
    return null;
  }

  // osascript fallback: write the clipboard PNG bytes to a file.
  const script = `try
  set png to (the clipboard as «class PNGf»)
  set f to open for access (POSIX file "${out}") with write permission
  write png to f
  close access f
  return "ok"
on error
  try
    close access (POSIX file "${out}")
  end try
  return "no"
end try`;
  const p = Bun.spawn(["osascript", "-e", script], { stdout: "pipe", stderr: "ignore" });
  await p.exited;
  const res = (await new Response(p.stdout).text()).trim();
  return res === "ok" && Bun.file(out).size > 0 ? out : null;
}
