import type { Post } from "../vb/types";

export interface QuoteContext {
  posts: Post[];
  page: number;
  totalPages: number;
}

// Screen stack model. Only the top screen is rendered at a time.
export type Screen =
  | { kind: "login" }
  | { kind: "settings" }
  | { kind: "forums" }
  | { kind: "threads"; forumId: number; title: string; forumPath?: string }
  | { kind: "thread"; threadId: number; title: string; threadPath?: string }
  | { kind: "composeReply"; threadId: number; title: string; threadPath?: string; quoteContext?: QuoteContext }
  | { kind: "composeThread"; forumId: number; title: string };
