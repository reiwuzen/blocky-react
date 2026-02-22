import { useCallback } from 'react';
import { KeyboardEvent } from 'react';
import {
  AnyBlock,
  splitBlock,
  mergeBlocks,
  flatToPosition,
  applyMarkdownTransform,
  indentBlock,
  outdentBlock,
} from '@reiwuzen/blocky';
import { useEditorActions } from './useEditor';

type UseBlockKeyboardProps = {
  block: AnyBlock;
  blocks: AnyBlock[];
  onUpdate: (block: AnyBlock) => void;
  onFocus: (id: string) => void;
};

export function useBlockKeyboard({
  block,
  blocks,
  onUpdate,
  onFocus,
}: UseBlockKeyboardProps) {
  const { insertBlockAfter, removeBlock, updateBlock } = useEditorActions();

  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    const sel  = window.getSelection();
    const flat = sel?.anchorOffset ?? 0;

    // ── Enter — split block ──────────────────────────────────────────────────
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      flatToPosition(block, flat).match(
        ({ nodeIndex, offset }) => {
          splitBlock(block, nodeIndex, offset).match(
            ([original, newBlock]) => {
              updateBlock(original);
              // insert new block after current
              const newId = insertBlockAfter(block.id, "paragraph");
              if (newId) {
                updateBlock({ ...newBlock, id: newId });
                onFocus(newId);
              }
            },
            () => {}
          );
        },
        () => {}
      );
      return;
    }

    // ── Backspace at start — merge with previous ─────────────────────────────
    if (e.key === "Backspace" && flat === 0) {
      const index = blocks.findIndex((b) => b.id === block.id);
      if (index === 0) return;
      const prev = blocks[index - 1];
      if (prev.type === "code" || prev.type === "equation") return;

      e.preventDefault();
      mergeBlocks(prev, block).match(
        (merged) => {
          updateBlock(merged);
          removeBlock(block.id);
          onFocus(merged.id);
        },
        () => {}
      );
      return;
    }

    // ── Space — markdown transform ───────────────────────────────────────────
    if (e.key === " ") {
      applyMarkdownTransform(block, flat).match(
        ({ block: transformed, converted }) => {
          if (converted) {
            e.preventDefault();
            updateBlock(transformed);
          }
        },
        () => {}
      );
      return;
    }

    // ── Tab — indent / outdent ───────────────────────────────────────────────
    if (e.key === "Tab") {
      e.preventDefault();
      const fn = e.shiftKey ? outdentBlock : indentBlock;
      fn(block).match(
        (b) => updateBlock(b as AnyBlock),
        () => {}
      );
      return;
    }
  }, [block, blocks, insertBlockAfter, removeBlock, updateBlock, onFocus]);
}