import type { Paged, ThreadSummary } from "../vb/types";

export const SOURCE_PAGES_PER_VIEW = 2;

export interface ThreadPageReader {
  threads(forumId: number, page: number): Promise<Paged<ThreadSummary>>;
}

export interface ThreadListView {
  items: ThreadSummary[];
  title?: string;
  forumId?: number;
  viewPage: number;
  totalViews: number;
  sourcePageStart: number;
  sourcePageEnd: number;
  totalSourcePages: number;
}

/** Load two adjacent vBulletin pages as one TUI view. */
export async function loadThreadListView(
  reader: ThreadPageReader,
  forumId: number,
  viewPage: number,
): Promise<ThreadListView> {
  if (!Number.isInteger(viewPage) || viewPage < 1) {
    throw new RangeError("viewPage must be a positive integer");
  }

  const sourcePageStart = (viewPage - 1) * SOURCE_PAGES_PER_VIEW + 1;
  const first = await reader.threads(forumId, sourcePageStart);
  let totalSourcePages = Math.max(1, first.totalPages);
  const second = sourcePageStart < totalSourcePages
    ? await reader.threads(forumId, sourcePageStart + 1)
    : undefined;
  if (second) totalSourcePages = Math.max(totalSourcePages, second.totalPages);

  const seen = new Set<number>();
  const items = [...first.items, ...(second?.items ?? [])].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return {
    items,
    title: first.title ?? second?.title,
    forumId: first.forumId ?? second?.forumId ?? forumId,
    viewPage,
    totalViews: Math.max(1, Math.ceil(totalSourcePages / SOURCE_PAGES_PER_VIEW)),
    sourcePageStart,
    sourcePageEnd: second ? sourcePageStart + 1 : sourcePageStart,
    totalSourcePages,
  };
}
