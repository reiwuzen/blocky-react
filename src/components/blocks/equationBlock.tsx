import React, { useRef, useLayoutEffect, useCallback } from 'react';
import { Block, blockInsertAt, blockReplaceRange } from '@reiwuzen/blocky';
import { useEditorActions } from '../../hooks/useEditor';

type Props = { block: Block<"equation">; onFocus: (id: string) => void; };

export function EquationBlock({ block, onFocus }: Props) {
  const ref         = useRef<HTMLDivElement>(null);
  const lastContent = useRef('');
  const { updateBlock } = useEditorActions();

  useLayoutEffect(() => {
    if (!ref.current) return;
    const latex = block.content[0].latex;
    if (latex === lastContent.current) return;
    lastContent.current = latex;
    ref.current.textContent = latex;
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const sel   = window.getSelection();
    const flat  = sel?.anchorOffset ?? 0;
    const latex = ref.current.textContent ?? '';
    const char  = latex[flat - 1] ?? '';
    if (!char) return;

    const hasSelection = sel && !sel.isCollapsed;
    if (hasSelection) {
      const start = Math.min(sel!.anchorOffset, sel!.focusOffset);
      const end   = Math.max(sel!.anchorOffset, sel!.focusOffset);
      blockReplaceRange(block, 0, start, 0, end, { type: "equation", latex: char }).match(
        (b) => { lastContent.current = ''; updateBlock(b); },
        () => {}
      );
      return;
    }

    blockInsertAt(block, 0, flat - 1, { type: "equation", latex: char }).match(
      (b) => { lastContent.current = ''; updateBlock(b); },
      () => {}
    );
  }, [block, updateBlock]);

  return (
    <div className="blocky-equation-block">
      <span className="blocky-equation-label">$</span>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="blocky-equation-content"
        onInput={handleInput}
        onFocus={() => onFocus(block.id)}
      />
      <span className="blocky-equation-label">$</span>
    </div>
  );
}