// Domain types for the vBulletin (gfy.com) wrapper layer.
// These are intentionally UI-agnostic so the vb/ layer stays testable on its own.

export interface Forum {
  id: number;
  title: string;
  description?: string;
  /** Title of the parent category section this forum was listed under. */
  category?: string;
  /** Child forums when the index nests them. */
  subforums?: Forum[];
  /** Relative path for thread list, e.g. /forum/cat/forum-slug (vB6 slug routing) */
  path?: string;
}

export interface ThreadSummary {
  id: number;
  title: string;
  /** Canonical relative path for vB6 slug routing. */
  path?: string;
  author?: string;
  replies?: number;
  views?: number;
  /** Raw "last post" cell text (date + user), kept as-is for display. */
  lastPost?: string;
  sticky?: boolean;
  /** Number of pages the thread spans, when the listing hints it. */
  pages?: number;
  forumId?: number;
}

export interface Post {
  /** vBulletin post id (the `p` value), when resolvable. */
  id?: number;
  author: string;
  date?: string;
  /** Post body rendered to plain terminal text. */
  body: string;
  /** Position within the thread page listing (1-based), informational. */
  index?: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  totalPages: number;
  title?: string;
  forumId?: number;
  threadId?: number;
}

/** Persisted authenticated session. */
export interface Session {
  cookies: Record<string, string>;
  userId?: string;
  username?: string;
  securityToken?: string;
  savedAt?: number;
}

/** Hidden fields scraped from a new-reply / new-thread form, required to post. */
export interface PostFormTokens {
  securitytoken: string;
  posthash?: string;
  poststarttime?: string;
  loggedinuser?: string;
  forumId?: number;
  /** Any other hidden inputs we want to echo back verbatim. */
  extra: Record<string, string>;
}
