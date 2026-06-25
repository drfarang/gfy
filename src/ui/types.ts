// Screen stack model. Only the top screen is rendered at a time.
export type Screen =
  | { kind: "login" }
  | { kind: "forums" }
  | { kind: "threads"; forumId: number; title: string }
  | { kind: "thread"; threadId: number; title: string }
  | { kind: "composeReply"; threadId: number; title: string }
  | { kind: "composeThread"; forumId: number; title: string };
