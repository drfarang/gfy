import { describe, expect, test } from "bun:test";
import { createImageFetcher, toAbsolute } from "../src/ui/image/fetch";

const asFetch = (fn: (input: string | URL | Request, init?: RequestInit) => Promise<Response>): typeof fetch =>
  fn as typeof fetch;

describe("image URL normalization", () => {
  test("normalizes absolute, protocol-relative, root-relative and relative sources", () => {
    expect(toAbsolute("https://img.test/a.png")).toBe("https://img.test/a.png");
    expect(toAbsolute("//img.test/a.png")).toBe("https://img.test/a.png");
    expect(toAbsolute("/images/a.png")).toBe("https://www.gfy.com/images/a.png");
    expect(toAbsolute("images/a.png")).toBe("https://www.gfy.com/images/a.png");
  });
});

describe("createImageFetcher", () => {
  test("caches successful responses by normalized URL", async () => {
    const inputs: string[] = [];
    const fetchImage = createImageFetcher({
      fetchFn: asFetch(async (input) => {
        inputs.push(String(input));
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }),
      cacheBytes: 16,
    });

    expect(await fetchImage("/a.png")).toEqual(Buffer.from([1, 2, 3]));
    expect(await fetchImage("https://www.gfy.com/a.png")).toEqual(Buffer.from([1, 2, 3]));
    expect(inputs).toEqual(["https://www.gfy.com/a.png"]);
  });

  test("coalesces concurrent requests for the same URL", async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImage = createImageFetcher({
      fetchFn: asFetch(async () => {
        calls++;
        await gate;
        return new Response(new Uint8Array([7]), { status: 200 });
      }),
      cacheBytes: 16,
    });

    const first = fetchImage("https://img.test/a.png");
    const second = fetchImage("https://img.test/a.png");
    expect(calls).toBe(1);
    release();
    expect(await first).toEqual(Buffer.from([7]));
    expect(await second).toEqual(Buffer.from([7]));
  });

  test("rejects HTTP errors and retries rather than caching failures", async () => {
    let calls = 0;
    const fetchImage = createImageFetcher({
      fetchFn: asFetch(async () => {
        calls++;
        return calls === 1
          ? new Response("no", { status: 503 })
          : new Response(new Uint8Array([1]), { status: 200 });
      }),
      cacheBytes: 16,
    });

    await expect(fetchImage("https://img.test/a.png")).rejects.toThrow("HTTP 503");
    expect(await fetchImage("https://img.test/a.png")).toEqual(Buffer.from([1]));
    expect(calls).toBe(2);
  });

  test("rejects declared and actual bodies over the per-image limit", async () => {
    const declared = createImageFetcher({
      fetchFn: asFetch(async () => new Response(new Uint8Array([1]), { headers: { "content-length": "5" } })),
      maxImageBytes: 4,
      cacheBytes: 16,
    });
    await expect(declared("https://img.test/declared.png")).rejects.toThrow("too large");

    const actual = createImageFetcher({
      fetchFn: asFetch(async () => new Response(new Uint8Array([1, 2, 3, 4, 5]))),
      maxImageBytes: 4,
      cacheBytes: 16,
    });
    await expect(actual("https://img.test/actual.png")).rejects.toThrow("too large");
  });

  test("aborts requests after the configured timeout", async () => {
    const fetchImage = createImageFetcher({
      fetchFn: asFetch(
        async (_input, init) =>
          await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
          }),
      ),
      timeoutMs: 5,
      cacheBytes: 16,
    });

    await expect(fetchImage("https://img.test/slow.png")).rejects.toThrow("aborted");
  });
});
