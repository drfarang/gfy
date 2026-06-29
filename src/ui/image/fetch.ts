import { WeightedLru } from "../../util/lru";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const SOURCE_CACHE_BYTES = 128 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function toAbsolute(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return "https://www.gfy.com" + src;
  return "https://www.gfy.com/" + src;
}

export interface ImageFetcherOptions {
  fetchFn?: typeof fetch;
  cacheBytes?: number;
  maxImageBytes?: number;
  timeoutMs?: number;
}

export function createImageFetcher(options: ImageFetcherOptions = {}): (src: string) => Promise<Buffer> {
  const fetchFn = options.fetchFn ?? fetch;
  const maxImageBytes = options.maxImageBytes ?? MAX_IMAGE_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cache = new WeightedLru<string, Buffer>({
    maxWeight: options.cacheBytes ?? SOURCE_CACHE_BYTES,
    weightOf: (value) => value.length,
  });
  const inFlight = new Map<string, Promise<Buffer>>();

  return async (src: string): Promise<Buffer> => {
    const url = toAbsolute(src);
    const cached = cache.get(url);
    if (cached !== undefined) return cached;

    const pending = inFlight.get(url);
    if (pending) return await pending;

    const request = load(url);
    inFlight.set(url, request);
    const clear = () => {
      if (inFlight.get(url) === request) inFlight.delete(url);
    };
    void request.then(clear, clear);
    return await request;
  };

  async function load(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, {
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: "image/*,*/*;q=0.8" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const declaredLength = response.headers.get("content-length");
      if (declaredLength && Number(declaredLength) > maxImageBytes) throw new Error("too large");

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > maxImageBytes) throw new Error("too large");
      cache.set(url, bytes);
      return bytes;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const fetchImageBytes = createImageFetcher();
