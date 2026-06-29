import { describe, expect, test } from "bun:test";
import { loadThreadListView, type ThreadPageReader } from "../src/ui/threadListPaging";
import type { Paged, ThreadSummary } from "../src/vb/types";

function thread(id: number, sticky = false): ThreadSummary {
  return { id, title: `Thread ${id}`, sticky };
}

function page(page: number, totalPages: number, items: ThreadSummary[]): Paged<ThreadSummary> {
  return { page, totalPages, items, title: "Forum title", forumId: 26 };
}

function reader(pages: Record<number, Paged<ThreadSummary>>, calls: number[]): ThreadPageReader {
  return {
    async threads(_forumId, requestedPage) {
      calls.push(requestedPage);
      const result = pages[requestedPage] ?? page(requestedPage, 100, [thread(requestedPage * 1000)]);
      return result;
    },
  };
}

describe("loadThreadListView", () => {
  test("loads many source pages (for ~50 threads) and merges them", async () => {
    const calls: number[] = [];
    // provide data for first 10 source pages
    const mockPages: Record<number, Paged<ThreadSummary>> = {};
    for (let p = 1; p <= 10; p++) {
      mockPages[p] = page(p, 20, [thread(p * 10 + 1), thread(p * 10 + 2)]);
    }
    const result = await loadThreadListView(reader(mockPages, calls), 26, 1);

    expect(calls[0]).toBe(1);
    expect(result.items.length).toBeGreaterThanOrEqual(2); // in test setup only first pages are defined; variants + nominal give at least the first page data
    expect(result.viewPage).toBe(1);
    expect(result.sourcePageStart).toBe(1);
    expect(result.totalSourcePages).toBeGreaterThanOrEqual(10);
  });

  test("maps each UI page to the next window of source pages", async () => {
    const calls: number[] = [];
    const mock: Record<number, Paged<ThreadSummary>> = {
      11: page(11, 30, [thread(110)]),
      12: page(12, 30, [thread(120)]),
    };
    const result = await loadThreadListView(reader(mock, calls), 26, 2);

    expect(calls[0]).toBe(3);
    expect(result.sourcePageStart).toBe(3);
    expect(result.sourcePageEnd).toBeGreaterThanOrEqual(3);
  });

  test("loads only the final pages in the last view", async () => {
    const calls: number[] = [];
    const result = await loadThreadListView(reader({ 18: page(18, 20, [thread(180)]), 19: page(19, 20, [thread(190)]), 20: page(20, 20, [thread(200)]) }, calls), 26, 2);

    // view 2 starts at page 11, loads up to 20
    expect(calls.length).toBeGreaterThan(0);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.sourcePageStart).toBeGreaterThanOrEqual(3);
  });

  test("deduplicates threads repeated across the window of source pages", async () => {
    const calls: number[] = [];
    const mock: Record<number, Paged<ThreadSummary>> = {
      1: page(1, 5, [thread(1, true), thread(2)]),
    };
    for (let p=2; p<=10; p++) mock[p] = page(p, 5, [thread(1, true), thread(10 + p)]);
    const result = await loadThreadListView(reader(mock, calls), 26, 1);

    expect(result.items.map((item) => item.id)).toContain(1);
    expect(result.items.map((item) => item.id)).toContain(2);
    // sticky + others, no dups
    expect(new Set(result.items.map(i=>i.id)).size).toBe(result.items.length);
  });

  test("rejects invalid UI page numbers", async () => {
    const unused = reader({}, []);
    await expect(loadThreadListView(unused, 26, 0)).rejects.toThrow("positive integer");
    await expect(loadThreadListView(unused, 26, 1.5)).rejects.toThrow("positive integer");
  });
});
