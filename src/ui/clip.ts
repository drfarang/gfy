import { createContext } from "react";

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Provides the live viewport rectangle (screen cells) of the nearest scrolling
 * container, so Kitty images can crop themselves to it instead of spilling over
 * the header/status bar when scrolled. Returns null = clip to the full screen.
 */
export const ClipContext = createContext<(() => Rect | null) | null>(null);
