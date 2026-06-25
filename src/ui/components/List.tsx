import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import { useDimensions } from "../hooks";
import { theme } from "../theme";

export interface ListProps<T> {
  items: T[];
  /** Render the inner content of a row (the row box + highlight are handled here). */
  renderRow: (item: T, selected: boolean) => ReactNode;
  onEnter: (item: T, index: number) => void;
  onBack?: () => void;
  active?: boolean;
  /** Rows consumed by surrounding chrome (header + status + borders), to size the viewport. */
  chromeRows?: number;
  emptyText?: string;
  /** Handle an extra key by name; return true if consumed. */
  extraKeys?: (name: string) => boolean;
}

export function List<T>({
  items,
  renderRow,
  onEnter,
  onBack,
  active = true,
  chromeRows = 8,
  emptyText = "Nothing here.",
  extraKeys,
}: ListProps<T>) {
  const { rows } = useDimensions();
  const viewport = Math.max(3, rows - chromeRows);
  const [sel, setSel] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (sel > items.length - 1) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  useEffect(() => {
    if (sel < offset) setOffset(sel);
    else if (sel >= offset + viewport) setOffset(sel - viewport + 1);
  }, [sel, viewport, offset]);

  useKeyboard((key) => {
    if (!active) return;
    const n = String(key.name);
    if (extraKeys?.(n)) return;
    if (n === "up" || n === "k") setSel((s) => Math.max(0, s - 1));
    else if (n === "down" || n === "j") setSel((s) => Math.min(items.length - 1, s + 1));
    else if (n === "pageup") setSel((s) => Math.max(0, s - viewport));
    else if (n === "pagedown" || n === "space") setSel((s) => Math.min(items.length - 1, s + viewport));
    else if (n === "home" || n === "g") setSel(0);
    else if (n === "end" || n === "G") setSel(Math.max(0, items.length - 1));
    else if (n === "return" || n === "enter" || n === "right" || n === "l") {
      const it = items[sel];
      if (it !== undefined) onEnter(it, sel);
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
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
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
