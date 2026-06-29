import type { Paged, ThreadSummary } from "../vb/types";

export const SOURCE_PAGES_PER_VIEW = 2;
const TARGET_THREADS_PER_VIEW = 50;

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
 * Always enriches (using filter variants + extra pages) until we have at least TARGET_THREADS_PER_VIEW (~50)
 * distinct threads. This is needed because vB6 forum pages only render small overlapping sets of threads
 * (~23 unique across "pages"); different filter params are required to surface more.
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

  // load the nominal window for this view
  for (let i = 0; i < SOURCE_PAGES_PER_VIEW; i++) {
    const pg = sourcePageStart + i;
    if (pg > totalSourcePages && totalSourcePages > 1) break;
    const res = await reader.threads(forumId, pg, forumPath);
    totalSourcePages = Math.max(totalSourcePages, res.totalPages || 1);
    if (!viewTitle && res.title) viewTitle = res.title;
    for (const item of res.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
    if (pg >= totalSourcePages) break;
  }

  // For EVERY view, enrich using filter variants + additional pages until we have 50 threads.
  // Plain pagination on vB6 often returns heavily overlapping small sets (~23 unique across many pages).
  // Different filter combos (time, sort, prefix) surface different threads.
  const variants = [
    "",
    "filter_time=time_all&filter_show=show_all",
    "filter_time=time_all&filter_sort=replies",
    "filter_prefix=-1",
  ];

  // First, try variants on the start page of this view (gives a rich ~50 set for this "page")
  for (const v of variants) {
    if (allItems.length >= TARGET_THREADS_PER_VIEW) break;
    let augPath = forumPath || "";
    if (v) {
      const sep = augPath.includes("?") ? "&" : "?";
      augPath = augPath + sep + v;
    }
    const res = await reader.threads(forumId, sourcePageStart, augPath || undefined);
    totalSourcePages = Math.max(totalSourcePages, res.totalPages || 1);
    if (!viewTitle && res.title) viewTitle = res.title;
    for (const item of res.items || []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
  }

  // Then continue with plain additional pages (and their variants) until 50 or end
  let enrichPg = sourcePageStart + SOURCE_PAGES_PER_VIEW;
  while (allItems.length < TARGET_THREADS_PER_VIEW && enrichPg <= (totalSourcePages || 99999)) {
    // plain
    const res = await reader.threads(forumId, enrichPg, forumPath);
    totalSourcePages = Math.max(totalSourcePages, res.totalPages || 1);
    for (const item of res.items || []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }

    // variants on this page too for more variety
    for (const v of variants) {
      if (allItems.length >= TARGET_THREADS_PER_VIEW) break;
      let augPath = forumPath || "";
      if (v) {
        const sep = augPath.includes("?") ? "&" : "?";
        augPath = augPath + sep + v;
      }
      const vres = await reader.threads(forumId, enrichPg, augPath || undefined);
      totalSourcePages = Math.max(totalSourcePages, vres.totalPages || 1);
      for (const item of vres.items || []) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          allItems.push(item);
        }
      }
    }

    if (enrichPg >= totalSourcePages) break;
    enrichPg++;
  }

  const lastLoaded = Math.max(
    sourcePageStart + SOURCE_PAGES_PER_VIEW - 1,
    enrichPg - 1,
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
