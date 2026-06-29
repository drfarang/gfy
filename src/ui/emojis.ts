import type { TabSelectOption } from "@opentui/core";

/**
 * Temporary Unicode palette for the composer. The displayed name and inserted
 * value are deliberately separate so these can later become GFY smiley labels
 * and BBCode without changing the picker itself.
 */
export const COMPOSER_EMOJIS: TabSelectOption[] = [
  { name: "😀", description: "grin", value: "😀" },
  { name: "😂", description: "laugh", value: "😂" },
  { name: "😉", description: "wink", value: "😉" },
  { name: "😍", description: "love", value: "😍" },
  { name: "😎", description: "cool", value: "😎" },
  { name: "🤔", description: "thinking", value: "🤔" },
  { name: "😮", description: "surprised", value: "😮" },
  { name: "😢", description: "sad", value: "😢" },
  { name: "😡", description: "angry", value: "😡" },
  { name: "👍", description: "thumbs up", value: "👍" },
  { name: "👎", description: "thumbs down", value: "👎" },
  { name: "🎉", description: "celebrate", value: "🎉" },
];
