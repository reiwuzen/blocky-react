import React, { useRef, useEffect, useCallback } from 'react';
import { Block, blockInsertAt, blockDeleteLastChar } from '@reiwuzen/blocky';
import { useEditorActions } from '../../hooks/useEditor';

type Props = { block: Block<"code">; onFocus: (id: string) => void; };

export function CodeBlock({ block, onFocus }: Props) {
  const ref = useRef<HTMLPreElement>(null);
  const { updateBlock } = useEditorActions();

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = block.content[0].text;
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const text   = ref.current.textContent ?? '';
    const offset = window.getSelection()?.anchorOffset ?? text.length;
    blockInsertAt(block, 0, offset, { type: "code", text }).match(
      (b) => updateBlock(b),
      () => {}
    );
  }, [block, updateBlock]);

  return (
    <pre className="blocky-code-block">
      <code
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="blocky-code-content"
        data-language={block.meta.language}
        onInput={handleInput}
        onFocus={() => onFocus(block.id)}
      />
    </pre>
  );
}