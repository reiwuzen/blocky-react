import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "./useEditor";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number };

// ─── Apply format to selection ─────────────────────────────────────────────────

function applyFormat(blockEl: HTMLElement, className: string) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (!blockEl.contains(range.commonAncestorContainer)) return;

  // ── Resolve container element from a range boundary ───────────────────────
  const toSpan = (node: Node): HTMLSpanElement => {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement! : node as HTMLElement;
    // If bare text landed directly on blockEl, wrap it first
    if (el === blockEl) {
      const span = document.createElement("span");
      blockEl.insertBefore(span, node);
      span.appendChild(node);
      return span;
    }
    return el as HTMLSpanElement;
  };

  // ── Split a span at offset, return the RIGHT half ─────────────────────────
  const splitSpanAt = (span: HTMLSpanElement, offset: number): HTMLSpanElement | null => {
    const len = span.textContent?.length ?? 0;
    if (offset <= 0 || offset >= len) return null;
    const text = span.firstChild as Text | null;
    if (!text || text.nodeType !== Node.TEXT_NODE) return null;
    const rightText = text.splitText(offset);
    const right = document.createElement("span");
    if (span.className) right.className = span.className;
    span.after(right);
    right.appendChild(rightText);
    return right;
  };

  // ── Snapshot start/end before any DOM mutation ────────────────────────────
  let startSpan = toSpan(range.startContainer);
  let endSpan   = toSpan(range.endContainer);
  const startOffset = range.startOffset;
  const endOffset   = range.endOffset;
  const sameSpan    = startSpan === endSpan;

  if (sameSpan) {
    // Single span selected — split out just the selected portion:
    // 1. Split tail off the end  →  startSpan | tail
    // 2. Split head off the start →  head | selectedSpan
    splitSpanAt(startSpan, endOffset);            // cut tail
    const mid = splitSpanAt(startSpan, startOffset); // cut head
    if (mid) { startSpan = mid; endSpan = mid; }
    // If no split happened (entire span selected), startSpan === endSpan still correct
  } else {
    // Different spans — split end first (doesn't affect start offsets)
    if (endOffset > 0 && endOffset < (endSpan.textContent?.length ?? 0)) {
      splitSpanAt(endSpan, endOffset);
      // endSpan itself is the left (selected) portion — correct
    }
    if (startOffset > 0) {
      const right = splitSpanAt(startSpan, startOffset);
      if (right) startSpan = right;
    }
  }

  // ── Collect spans startSpan → endSpan inclusive ───────────────────────────
  const allSpans = Array.from(blockEl.querySelectorAll<HTMLSpanElement>(":scope > span"));
  const selected: HTMLSpanElement[] = [];
  let inside = false;
  for (const span of allSpans) {
    if (span === startSpan) inside = true;
    if (inside) selected.push(span);
    if (span === endSpan) break;
  }

  if (selected.length === 0) return;

  // ── Toggle: all have class → remove; otherwise → add ─────────────────────
  const allHave = selected.every((s) => s.classList.contains(className));
  selected.forEach((s) => {
    if (allHave) s.classList.remove(className);
    else         s.classList.add(className);
  });
}

// ─── Toolbar buttons ───────────────────────────────────────────────────────────

const FORMAT_BUTTONS: { label: string; cls: string; title: string }[] = [
  { label: "B",    cls: "be-bold",      title: "Bold"            },
  { label: "I",    cls: "be-italic",    title: "Italic"          },
  { label: "U",    cls: "be-underline", title: "Underline"       },
  { label: "S",    cls: "be-strike",    title: "Strikethrough"   },
  { label: "</>",  cls: "be-code",      title: "Inline code"     },
  { label: "∑",    cls: "be-equation",  title: "Inline equation" },
];

const HIGHLIGHT_BUTTONS: { color: string; cls: string }[] = [
  { color: "#fef08a", cls: "be-hl-yellow" },
  { color: "#bbf7d0", cls: "be-hl-green"  },
];

const COLOR_BUTTONS: { color: string; cls: string }[] = [
  { color: "#dc2626", cls: "be-color-red"   },
  { color: "#2563eb", cls: "be-color-blue"  },
  { color: "#16a34a", cls: "be-color-green" },
];

// ─── FormatBar ─────────────────────────────────────────────────────────────────

export function FormatBar() {
  const { blocks, blockRefs } = useEditor();
  const [rect, setRect]       = useState<Rect | null>(null);
  const barRef                = useRef<HTMLDivElement>(null);

  const getActiveBlockEl = useCallback((): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const container = sel.getRangeAt(0).commonAncestorContainer;
    for (const el of blockRefs.current.values()) {
      if (el.contains(container)) return el;
    }
    return null;
  }, [blockRefs]);

  const getActiveBlockType = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const container = sel.getRangeAt(0).commonAncestorContainer;
    for (const [id, el] of blockRefs.current) {
      if (el.contains(container)) {
        return blocks.find((b) => b.id === id)?.type ?? null;
      }
    }
    return null;
  }, [blocks, blockRefs]);

  useEffect(() => {
    const onSelect = () => {
      // Small delay so the selection is stable
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setRect(null);
          return;
        }

        const type = getActiveBlockType();
        // Never show for code or equation
        if (type === "code" || type === "equation" || type === null) {
          setRect(null);
          return;
        }

        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (r.width === 0) { setRect(null); return; }

        setRect({
          top:   r.top  + window.scrollY - 44, // 44px = bar height + gap
          left:  r.left + window.scrollX + r.width / 2,
          width: r.width,
        });
      });
    };

    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, [getActiveBlockType]);

  // Hide on mousedown outside the bar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setRect(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!rect) return null;

  return (
    <div
      ref={barRef}
      className="fb-bar"
      style={{ top: rect.top, left: rect.left }}
      // Prevent mousedown from collapsing the selection
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Format buttons */}
      <div className="fb-group">
        {FORMAT_BUTTONS.map(({ label, cls, title }) => (
          <button
            key={cls}
            className="fb-btn"
            title={title}
            onMouseDown={(e) => {
              e.preventDefault();
              const el = getActiveBlockEl();
              if (el) applyFormat(el, cls);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="fb-divider" />

      {/* Highlight */}
      <div className="fb-group">
        {HIGHLIGHT_BUTTONS.map(({ color, cls }) => (
          <button
            key={cls}
            className="fb-dot"
            title={`Highlight ${color}`}
            style={{ background: color }}
            onMouseDown={(e) => {
              e.preventDefault();
              const el = getActiveBlockEl();
              if (el) applyFormat(el, cls);
            }}
          />
        ))}
      </div>

      <div className="fb-divider" />

      {/* Text color */}
      <div className="fb-group">
        {COLOR_BUTTONS.map(({ color, cls }) => (
          <button
            key={cls}
            className="fb-dot fb-dot--ring"
            title={`Color ${color}`}
            style={{ background: color }}
            onMouseDown={(e) => {
              e.preventDefault();
              const el = getActiveBlockEl();
              if (el) applyFormat(el, cls);
            }}
          />
        ))}
      </div>
    </div>
  );
}