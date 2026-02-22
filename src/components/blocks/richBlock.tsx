import React, { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  AnyBlock,
  Node,
  flatToPosition,
  flatToSelection,
  blockInsertAt,
  blockReplaceRange,
} from '@reiwuzen/blocky';
import { useEditorActions, useBlocks } from '../../hooks/useEditor';
import { useBlockKeyboard } from '../../hooks/useBlockKeyboard';

type RichBlockProps = {
  block: AnyBlock;
  className?: string;
  placeholder?: string;
  onFocus: (id: string) => void;
};

export function RichBlock({ block, className, placeholder, onFocus }: RichBlockProps) {
  const ref        = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false); // IME guard
  const { updateBlock } = useEditorActions();
  const blocks     = useBlocks();
  const handleKeyDown = useBlockKeyboard({ block, blocks, onUpdate: updateBlock, onFocus });

  // ── Hydrate DOM from block.content ──────────────────────────────────────────
  // useLayoutEffect so it runs before paint — avoids flash
  // Only update DOM if content actually changed to avoid cursor jumping
  const lastContent = useRef<string>('');
  useLayoutEffect(() => {
    if (!ref.current) return;
    const html = nodesToHtml(block.content as Node[]);
    if (html === lastContent.current) return; // no change — don't touch DOM
    lastContent.current = html;
    ref.current.innerHTML = html;
  }, [block.content]);

  // ── Input handler ────────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    if (!ref.current || isComposing.current) return;

    const sel    = window.getSelection();
    const flat   = sel?.anchorOffset ?? 0;

    // Check if there's a selection — if so, replaceRange, else insertAt
    const hasSelection = sel && !sel.isCollapsed;

    if (hasSelection) {
      const start = Math.min(sel!.anchorOffset, sel!.focusOffset);
      const end   = Math.max(sel!.anchorOffset, sel!.focusOffset);
      const char  = ref.current.innerText.slice(start, start + 1);

      flatToSelection(block, start, end).match(
        ({ startIndex, startOffset, endIndex, endOffset }) => {
          blockReplaceRange(
            block, startIndex, startOffset, endIndex, endOffset,
            { type: "text", text: char }
          ).match(
            (b) => { lastContent.current = ''; updateBlock(b); },
            () => {}
          );
        },
        () => {}
      );
      return;
    }

    // Single cursor — get the character just typed
    const text = ref.current.innerText;
    const char = text[flat - 1] ?? '';
    if (!char) return;

    flatToPosition(block, flat - 1).match(
      ({ nodeIndex, offset }) => {
        blockInsertAt(block, nodeIndex, offset, { type: "text", text: char }).match(
          (b) => { lastContent.current = ''; updateBlock(b); },
          () => {}
        );
      },
      () => {}
    );
  }, [block, updateBlock]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`blocky-block ${className ?? ''}`}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
      onFocus={() => onFocus(block.id)}
    />
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function nodesToHtml(nodes: Node[]): string {
  return nodes.map((n) => {
    if (n.type === "code")     return `<code>${esc(n.text)}</code>`;
    if (n.type === "equation") return `<span class="blocky-equation">${esc(n.latex)}</span>`;
    let html = esc(n.text);
    if (n.link)          html = `<a href="${n.link}">${html}</a>`;
    if (n.bold)          html = `<strong>${html}</strong>`;
    if (n.italic)        html = `<em>${html}</em>`;
    if (n.underline)     html = `<u>${html}</u>`;
    if (n.strikethrough) html = `<s>${html}</s>`;
    if (n.highlighted)   html = `<mark class="blocky-highlight-${n.highlighted}">${html}</mark>`;
    if (n.color)         html = `<span class="blocky-color-${n.color}">${html}</span>`;
    return html;
  }).join('');
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}