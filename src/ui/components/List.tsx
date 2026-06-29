import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import type { BoxRenderable } from "@opentui/core";
import { theme } from "../theme";

/** Rows moved per Ctrl+Up / Ctrl+Down jump. */
const JUMP = 10;

export interface ListProps<T> {
  items: T[];
  /** Render the inner content of a row (the row box + highlight are handled here). */
  renderRow: (item: T, selected: boolean) => ReactNode;
  onEnter: (item: T, index: number) => void;
  /** Open the selected item in a new background tab (Shift+Enter or `t`). */
  onOpenInTab?: (item: T, index: number) => void;
  onBack?: () => void;
  active?: boolean;
  emptyText?: string;
  /** Handle an extra key by name; return true if consumed. */
  extraKeys?: (name: string) => boolean;
}

export function List<T>({
  items,
  renderRow,
  onEnter,
  onOpenInTab,
  onBack,
  active = true,
  emptyText = "Nothing here.",
  extraKeys,
}: ListProps<T>) {
  const [containerRows, setContainerRows] = useState(0);
  // One row belongs to the scroll-position hint. The remaining rows are the
  // actual item viewport, based on the height Yoga allocated to this list.
  const viewport = Math.max(1, containerRows - 1);
  const [sel, setSel] = useState(0);
  const [offset, setOffset] = useState(0);
  const measuredRows = useRef(0);
  const updateContainerRows = useCallback(function (this: BoxRenderable) {
    const next = this.height;
    if (measuredRows.current === next) return;
    measuredRows.current = next;
    // Layout callbacks run during OpenTUI's render pass. Deferring the React
    // update ensures the resulting render request is not dropped by OpenTUI.
    process.nextTick(() => setContainerRows(next));
  }, []);

  useEffect(() => {
    if (sel > items.length - 1) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  useEffect(() => {
    if (sel < offset) setOffset(sel);
    else if (sel >= offset + viewport) setOffset(sel - viewport + 1);
  }, [sel, viewport, offset]);

  useKeyboard((key) => {
    if (!active) return;
    // Ctrl/Meta combos are global (theme, tab close, quit) and handled in
    // App. Ignore them here so e.g. Ctrl+T doesn't also fire the plain-`t` newtab.
    if ((key as { ctrl?: boolean }).ctrl || (key as { meta?: boolean }).meta) return;
    const raw = String(key.name);
    const n = raw.toLowerCase();
    // Treat an uppercase letter as Shift, whether the terminal reports a real
    // shift flag (Kitty protocol: name "j" + shift) or just sends the capital
    // letter (legacy: name "J", no modifier). Lets J/K and G work everywhere.
    const shift = Boolean((key as { shift?: boolean }).shift) || raw !== n;
    if (extraKeys?.(raw)) return;
    if (shift && (n === "k" || n === "up")) setSel((s) => Math.max(0, s - JUMP));
    else if (shift && (n === "j" || n === "down")) setSel((s) => Math.min(items.length - 1, s + JUMP));
    else if (n === "up" || n === "k") setSel((s) => Math.max(0, s - 1));
    else if (n === "down" || n === "j") setSel((s) => Math.min(items.length - 1, s + 1));
    else if (n === "pageup") setSel((s) => Math.max(0, s - viewport));
    else if (n === "pagedown" || n === "space") setSel((s) => Math.min(items.length - 1, s + viewport));
    else if (shift && n === "g") setSel(Math.max(0, items.length - 1));
    else if (n === "home" || n === "g") setSel(0);
    else if (n === "end") setSel(Math.max(0, items.length - 1));
    else if (n === "return" || n === "enter") {
      const it = items[sel];
      if (it !== undefined) (shift && onOpenInTab ? onOpenInTab : onEnter)(it, sel);
    } else if (n === "right" || n === "l") {
      const it = items[sel];
      if (it !== undefined) onEnter(it, sel);
    } else if (n === "t" && onOpenInTab) {
      const it = items[sel];
      if (it !== undefined) onOpenInTab(it, sel);
    } else if (n === "left" || n === "h" || n === "escape" || n === "backspace") {
      onBack?.();
    }
  });

  if (items.length === 0) {
    return (
      <box style={{ flexGrow: 1, padding: 1 }}>
        <text fg={theme.dim}>{emptyText}</text>
      </box>
    );
  }

  const visible = items.slice(offset, offset + viewport);
  const scrollHint =
    `${sel + 1}/${items.length}` +
    (offset > 0 ? "  ^more" : "") +
    (offset + viewport < items.length ? "  vmore" : "");

  return (
    <box onSizeChange={updateContainerRows} style={{ flexDirection: "column", flexGrow: 1 }}>
      {visible.map((item, i) => {
        const idx = offset + i;
        const selected = idx === sel;
        return (
          <box key={idx} style={{ backgroundColor: selected ? theme.selBg : undefined }}>
            {renderRow(item, selected)}
          </box>
        );
      })}
      <box style={{ flexGrow: 1 }} />
      <text fg={theme.dim}>{scrollHint}</text>
    </box>
  );
}
