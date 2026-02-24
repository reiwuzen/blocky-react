export function getCursorPosition(blockEl: HTMLElement): { nodeIndex: number; offset: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  // Cursor must be inside this block
  if (!blockEl.contains(range.startContainer)) return null;

  const spans = Array.from(blockEl.childNodes) as HTMLElement[];
  let { startContainer, startOffset } = range;

  // If cursor landed directly on the div (not inside a span),
  // startOffset is a child index rather than a text offset
  if (startContainer === blockEl) {
    const span = spans[startOffset] ?? spans[spans.length - 1];
    return {
      nodeIndex: Math.min(startOffset, spans.length - 1),
      offset: span ? (span.textContent?.length ?? 0) : 0,
    };
  }

  // startContainer is either the span itself or its text node
  const spanEl =
    startContainer.nodeType === Node.TEXT_NODE
      ? startContainer.parentElement   // text node → its parent span
      : startContainer as HTMLElement; // already the span

  const nodeIndex = spans.indexOf(spanEl as HTMLElement);
  if (nodeIndex === -1) return null;

  return { nodeIndex, offset: startOffset };
}