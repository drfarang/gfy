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
      const result = pages[requestedPage];
      if (!result) throw new Error(`unexpected page ${requestedPage}`);
      return result;
    },
  };
}

describe("loadThreadListView", () => {
  test("loads two source pages and merges them in order", async () => {
    const calls: number[] = [];
    const result = await loadThreadListView(
      reader(
        {
          1: page(1, 5, [thread(1, true), thread(2)]),
          2: page(2, 5, [thread(3), thread(4)]),
        },
        calls,
      ),
      26,
      1,
    );

    expect(calls).toEqual([1, 2]);
    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(result.viewPage).toBe(1);
    expect(result.totalViews).toBe(3);
    expect(result.sourcePageStart).toBe(1);
    expect(result.sourcePageEnd).toBe(2);
    expect(result.totalSourcePages).toBe(5);
    expect(result.title).toBe("Forum title");
    expect(result.forumId).toBe(26);
  });

  test("maps each UI page to the next pair of source pages", async () => {
    const calls: number[] = [];
    const result = await loadThreadListView(
      reader(
        {
          3: page(3, 6, [thread(30)]),
          4: page(4, 6, [thread(40)]),
        },
        calls,
      ),
      26,
      2,
    );

    expect(calls).toEqual([3, 4]);
    expect(result.items.map((item) => item.id)).toEqual([30, 40]);
    expect(result.totalViews).toBe(3);
    expect(result.sourcePageStart).toBe(3);
    expect(result.sourcePageEnd).toBe(4);
  });

  test("loads only the odd final source page", async () => {
    const calls: number[] = [];
    const result = await loadThreadListView(reader({ 5: page(5, 5, [thread(50)]) }, calls), 26, 3);

    expect(calls).toEqual([5]);
    expect(result.items.map((item) => item.id)).toEqual([50]);
    expect(result.sourcePageStart).toBe(5);
    expect(result.sourcePageEnd).toBe(5);
    expect(result.totalViews).toBe(3);
  });

  test("deduplicates sticky threads repeated on both source pages", async () => {
    const calls: number[] = [];
    const result = await loadThreadListView(
      reader(
        {
          1: page(1, 2, [thread(1, true), thread(2)]),
          2: page(2, 2, [thread(1, true), thread(3)]),
        },
        calls,
      ),
      26,
      1,
    );

    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  test("rejects invalid UI page numbers", async () => {
    const unused = reader({}, []);
    await expect(loadThreadListView(unused, 26, 0)).rejects.toThrow("positive integer");
    await expect(loadThreadListView(unused, 26, 1.5)).rejects.toThrow("positive integer");
  });
});
