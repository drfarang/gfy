import type { Paged, ThreadSummary } from "../vb/types";

export const SOURCE_PAGES_PER_VIEW = 5;

export interface ThreadPageReader {
  threads(forumId: number, page: number, forumPath?: string): Promise<Paged<ThreadSummary>>;
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

/**
 * Load source pages for one TUI view.
 *
 * Keep this bounded and predictable: each UI view reads five source pages. GFY
 * vB6 currently renders 10 thread links per source page, so this gives the
 * requested 50 thread links without the old unbounded enrichment crawl.
 */
export async function loadThreadListView(
  reader: ThreadPageReader,
  forumId: number,
  viewPage: number,
  forumPath?: string,
): Promise<ThreadListView> {
  if (!Number.isInteger(viewPage) || viewPage < 1) {
    throw new RangeError("viewPage must be a positive integer");
  }

  const sourcePageStart = (viewPage - 1) * SOURCE_PAGES_PER_VIEW + 1;
  let totalSourcePages = 1;
  const seen = new Set<number>();
  const allItems: ThreadSummary[] = [];
  let viewTitle: string | undefined;

  const absorb = (res: Paged<ThreadSummary>) => {
    totalSourcePages = Math.max(totalSourcePages, res.totalPages || 1);
    if (!viewTitle && res.title) viewTitle = res.title;
    for (const item of res.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
  };

  // Load the first page to learn the available source-page count, then start
  // the remaining pages together. HttpClient spaces actual request starts.
  absorb(await reader.threads(forumId, sourcePageStart, forumPath));

  const sourcePageEnd = Math.min(sourcePageStart + SOURCE_PAGES_PER_VIEW - 1, totalSourcePages);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, sourcePageEnd - sourcePageStart) }, (_, i) =>
      reader.threads(forumId, sourcePageStart + i + 1, forumPath),
    ),
  );
  for (const res of rest) absorb(res);

  const lastLoaded = Math.max(
    sourcePageEnd,
    sourcePageStart
  );
  return {
    items: allItems,
    title: viewTitle,
    forumId,
    viewPage,
    totalViews: Math.max(1, Math.ceil(totalSourcePages / SOURCE_PAGES_PER_VIEW)),
    sourcePageStart,
    sourcePageEnd: Math.min(lastLoaded, totalSourcePages),
    totalSourcePages,
  };
}
