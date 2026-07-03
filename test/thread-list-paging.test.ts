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
  test("loads the bounded source-page window and merges rows", async () => {
    const calls: number[] = [];
    const mockPages: Record<number, Paged<ThreadSummary>> = {};
    for (let p = 1; p <= 5; p++) {
      mockPages[p] = page(p, 20, [thread(p * 10 + 1), thread(p * 10 + 2)]);
    }
    const result = await loadThreadListView(reader(mockPages, calls), 26, 1);

    expect(calls).toEqual([1, 2, 3, 4, 5]);
    expect(result.items.map((item) => item.id)).toEqual([11, 12, 21, 22, 31, 32, 41, 42, 51, 52]);
    expect(result.viewPage).toBe(1);
    expect(result.sourcePageStart).toBe(1);
    expect(result.sourcePageEnd).toBe(5);
    expect(result.totalSourcePages).toBe(20);
  });

  test("maps each UI page to the next window of source pages", async () => {
    const calls: number[] = [];
    const mock: Record<number, Paged<ThreadSummary>> = {
      6: page(6, 30, [thread(60)]),
      7: page(7, 30, [thread(70)]),
    };
    const result = await loadThreadListView(reader(mock, calls), 26, 2);

    expect(calls).toEqual([6, 7, 8, 9, 10]);
    expect(result.sourcePageStart).toBe(6);
    expect(result.sourcePageEnd).toBe(10);
  });

  test("loads only the final pages in the last view", async () => {
    const calls: number[] = [];
    const result = await loadThreadListView(reader({ 16: page(16, 20, [thread(160)]), 17: page(17, 20, [thread(170)]), 18: page(18, 20, [thread(180)]), 19: page(19, 20, [thread(190)]), 20: page(20, 20, [thread(200)]) }, calls), 26, 4);

    expect(calls).toEqual([16, 17, 18, 19, 20]);
    expect(result.items.map((item) => item.id)).toEqual([160, 170, 180, 190, 200]);
    expect(result.sourcePageStart).toBe(16);
    expect(result.sourcePageEnd).toBe(20);
  });

  test("deduplicates threads repeated across the window of source pages", async () => {
    const calls: number[] = [];
    const mock: Record<number, Paged<ThreadSummary>> = {
      1: page(1, 5, [thread(1, true), thread(2)]),
    };
    mock[2] = page(2, 5, [thread(1, true), thread(12)]);
    mock[3] = page(3, 5, [thread(1, true), thread(13)]);
    mock[4] = page(4, 5, [thread(1, true), thread(14)]);
    mock[5] = page(5, 5, [thread(1, true), thread(15)]);
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
