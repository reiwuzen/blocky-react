import React, { useRef, useEffect, useCallback } from "react";
import {
  AnyBlock,
  Node,
  flatToPosition,
  blockInsertAt,
  blockDeleteLastChar,
} from "@reiwuzen/blocky";
import { useEditorActions } from "../../hooks/useEditor";
import { useBlockKeyboard } from "../../hooks/useBlockKeyboard";
import { useBlocks } from "../../hooks/useEditor";

type RichBlockProps = {
  block: AnyBlock;
  className?: string;
  placeholder?: string;
  onFocus: (id: string) => void;
};

/**
 * Shared contentEditable renderer for all rich blocks.
 * Handles input, keyboard, and syncs DOM → engine.
 */
export function RichBlock({
  block,
  className,
  placeholder,
  onFocus,
}: RichBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { updateBlock } = useEditorActions();
  const blocks = useBlocks();
  const handleKeyDown = useBlockKeyboard({
    block,
    blocks,
    onUpdate: updateBlock,
    onFocus,
  });

  // Hydrate DOM from block content
  useEffect(() => {
    if (!ref.current) return;
    const nodes = block.content as Node[];
    ref.current.innerHTML = nodes
      .map((n) => {
        if (n.type === "code") return `<code>${escHtml(n.text)}</code>`;
        if (n.type === "equation")
          return `<span class="blocky-equation">${escHtml(n.latex)}</span>`;
        // text node — apply inline styles
        let html = escHtml(n.text);
        if (n.link) html = `<a href="${n.link}">${html}</a>`;
        if (n.bold) html = `<strong>${html}</strong>`;
        if (n.italic) html = `<em>${html}</em>`;
        if (n.underline) html = `<u>${html}</u>`;
        if (n.strikethrough) html = `<s>${html}</s>`;
        if (n.highlighted)
          html = `<mark class="blocky-highlight-${n.highlighted}">${html}</mark>`;
        if (n.color)
          html = `<span class="blocky-color-${n.color}">${html}</span>`;
        return html;
      })
      .join("");
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const text = ref.current.innerText ?? "";
    const flat = window.getSelection()?.anchorOffset ?? text.length;

    flatToPosition(block, flat).match(
      ({ nodeIndex, offset }) => {
        blockInsertAt(block, nodeIndex, offset, { type: "text", text }).match(
          (updated) => updateBlock(updated),
          () => {},
        );
      },
      () => {},
    );
  }, [block, updateBlock]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`blocky-block ${className ?? ""}`}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocus(block.id)}
    />
  );
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
