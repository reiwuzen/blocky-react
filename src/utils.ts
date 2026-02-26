import type { Node } from "@reiwuzen/blocky";


type TextNode = Extract<Node,{type:'text'}>
// ─── Escape helpers ────────────────────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Node[] → HTML string (hydration, runs once per block on mount) ────────────

export function nodesToHtml(nodes: Node[]): string {
  const source = nodes.length > 0 ? nodes : [{ type: "text" as const, text: "" }];

  return source.map((n) => {
    if (n.type === "equation") {
      return `<span class="be-equation" data-latex="${escAttr(n.latex)}">${esc(n.latex)}</span>`;
    }

    if (n.type === "code") {
      return `<span class="be-code">${esc(n.text)}</span>`;
    }

    // text node
    const cls: string[] = [];
    if (n.bold)          cls.push("be-bold");
    if (n.italic)        cls.push("be-italic");
    if (n.underline)     cls.push("be-underline");
    if (n.strikethrough) cls.push("be-strike");
    if (n.highlighted)   cls.push(`be-hl-${n.highlighted}`);
    if (n.color)         cls.push(`be-color-${n.color}`);
    if (n.link)          cls.push("be-link");

    const classAttr = cls.length ? ` class="${cls.join(" ")}"` : "";
    const linkAttr  = n.link ? ` data-link="${escAttr(n.link)}"` : "";
    // Empty span: use <br> so the browser places the cursor inside the span,
    // not before it as a bare text node in the parent div.
    const text = n.text === ""
      ? "<br>"
      : esc(n.text).replace(/ {2,}/g, (m) => "&nbsp;".repeat(m.length));

    return `<span${classAttr}${linkAttr}>${text}</span>`;
  }).join("");
}

// ─── DOM → Node[] (serialization, runs on editable true → false) ──────────────

export function domToNodes(el: HTMLElement): Node[] {
  const nodes: Node[] = [];

  // Walk direct childNodes (not just querySelectorAll spans) so we also catch
  // bare Text nodes the browser may have created when the user typed before
  // or after a span in a contenteditable div.
  el.childNodes.forEach((child) => {
    // ── Bare text node created by browser ───────────────────────────────────
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text) nodes.push({ type: "text", text });
      return;
    }

    if (!(child instanceof HTMLElement) || child.tagName !== "SPAN") return;
    const span = child;

    // ── Equation span ────────────────────────────────────────────────────────
    if (span.classList.contains("be-equation")) {
      nodes.push({ type: "equation", latex: span.dataset.latex ?? span.textContent ?? "" });
      return;
    }

    // ── Inline code span ─────────────────────────────────────────────────────
    if (span.classList.contains("be-code")) {
      nodes.push({ type: "code", text: span.textContent ?? "" });
      return;
    }

    // ── Text span — <br> placeholder means the block is empty ────────────────
    const rawText = span.innerHTML === "<br>" ? "" : (span.textContent ?? "");
    const node: TextNode = { type: "text", text: rawText };

    if (span.classList.contains("be-bold"))          node.bold          = true;
    if (span.classList.contains("be-italic"))        node.italic        = true;
    if (span.classList.contains("be-underline"))     node.underline     = true;
    if (span.classList.contains("be-strike"))        node.strikethrough = true;
    if (span.dataset.link)                           node.link          = span.dataset.link;

    span.classList.forEach((c) => {
      if (c.startsWith("be-hl-"))    node.highlighted = c.slice(6) as TextNode["highlighted"];
      if (c.startsWith("be-color-")) node.color       = c.slice(9) as TextNode["color"];
    });

    nodes.push(node);
  });

  return nodes.length > 0 ? nodes : [{ type: "text", text: "" }];
}

// ─── Cursor position (div → span[]) ───────────────────────────────────────────

export function getCursorPosition(blockEl: HTMLElement): { nodeIndex: number; offset: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  if (!blockEl.contains(range.startContainer)) return null;

  const spans = Array.from(blockEl.childNodes) as HTMLElement[];
  const { startContainer, startOffset } = range;

  // Cursor landed directly on the div — startOffset is a child index
  if (startContainer === blockEl) {
    const span = spans[startOffset] ?? spans[spans.length - 1];
    return {
      nodeIndex: Math.min(startOffset, spans.length - 1),
      offset: span ? (span.textContent?.length ?? 0) : 0,
    };
  }

  // startContainer is the text node inside a span, or the span itself
  const spanEl =
    startContainer.nodeType === Node.TEXT_NODE
      ? startContainer.parentElement
      : startContainer as HTMLElement;

  const nodeIndex = spans.indexOf(spanEl as HTMLElement);
  if (nodeIndex === -1) return null;

  return { nodeIndex, offset: startOffset };
}

// ─── Place cursor at a character offset by walking text nodes ─────────────────
// Returns true if placed successfully, false if offset was out of range.

export function placeCursorAtChar(root: HTMLElement, targetChar: number, range: Range): boolean {
  let remaining = targetChar;

  // Walk every text node in document order
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const len = node.length;
    if (remaining <= len) {
      range.setStart(node, remaining);
      range.collapse(true);
      return true;
    }
    remaining -= len;
  }

  // targetChar was beyond all text — place at very end
  if (root.lastChild) {
    const last = root.lastChild;
    if (last.nodeType === Node.TEXT_NODE) {
      range.setStart(last, (last as Text).length);
    } else {
      range.setStart(last, (last as Element).childNodes.length);
    }
    range.collapse(true);
    return true;
  }

  return false;
}

// ─── Arrow key cross-block navigation ─────────────────────────────────────────

/** True if the cursor's top edge sits on the first line of el */
export function isOnFirstLine(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const cursorRect = sel.getRangeAt(0).getBoundingClientRect();
  const elRect     = el.getBoundingClientRect();
  // Zero-rect means the range is collapsed in an empty block — treat as first line
  if (cursorRect.top === 0 && cursorRect.bottom === 0) return true;
  return cursorRect.top < elRect.top + elRect.height / 2;
}

/** True if the cursor's bottom edge sits on the last line of el */
export function isOnLastLine(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const cursorRect = sel.getRangeAt(0).getBoundingClientRect();
  const elRect     = el.getBoundingClientRect();
  if (cursorRect.top === 0 && cursorRect.bottom === 0) return true;
  return cursorRect.bottom > elRect.bottom - elRect.height / 2;
}

/**
 * Focus targetEl and place the caret at the closest position to cursorX.
 * pass 'top' to land on the first line, 'bottom' for the last line.
 */
export function placeCursorByX(
  targetEl: HTMLElement,
  cursorX: number,
  edge: "top" | "bottom"
): void {
  targetEl.focus();
  const rect  = targetEl.getBoundingClientRect();
  const y     = edge === "top" ? rect.top + 2 : rect.bottom - 2;

  let range: Range | null = null;

  if (document.caretRangeFromPoint) {
    // Chrome / Safari
    range = document.caretRangeFromPoint(cursorX, y);
  } else if ("caretPositionFromPoint" in document) {
    // Firefox
    const pos = (document as any).caretPositionFromPoint(cursorX, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }

  // Only accept the range if it actually landed inside the target
  if (range && targetEl.contains(range.startContainer)) {
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    return;
  }

  // Fallback: start/end of target
  const fallback = document.createRange();
  fallback.selectNodeContents(targetEl);
  fallback.collapse(edge === "top");
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(fallback); }
}