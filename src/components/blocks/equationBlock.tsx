import React, { useRef, useEffect, useCallback } from 'react';
import { Block, blockInsertAt } from '@reiwuzen/blocky';
import { useEditorActions } from '../../hooks/useEditor';

type Props = { block: Block<"equation">; onFocus: (id: string) => void; };

export function EquationBlock({ block, onFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { updateBlock } = useEditorActions();

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = block.content[0].latex;
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const latex  = ref.current.textContent ?? '';
    const offset = window.getSelection()?.anchorOffset ?? latex.length;
    blockInsertAt(block, 0, offset, { type: "equation", latex }).match(
      (b) => updateBlock(b),
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