import React, { useRef, useLayoutEffect, useCallback, useRef as useRefAlias } from 'react';
import { Block, blockInsertAt, blockReplaceRange, flatToSelection } from '@reiwuzen/blocky';
import { useEditorActions } from '../../hooks/useEditor';

type Props = { block: Block<"code">; onFocus: (id: string) => void; };

export function CodeBlock({ block, onFocus }: Props) {
  const ref         = useRef<HTMLElement>(null);
  const lastContent = useRef('');
  const { updateBlock } = useEditorActions();

  useLayoutEffect(() => {
    if (!ref.current) return;
    const text = block.content[0].text;
    if (text === lastContent.current) return;
    lastContent.current = text;
    ref.current.textContent = text;
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const sel    = window.getSelection();
    const flat   = sel?.anchorOffset ?? 0;
    const text   = ref.current.textContent ?? '';
    const char   = text[flat - 1] ?? '';
    if (!char) return;

    const hasSelection = sel && !sel.isCollapsed;
    if (hasSelection) {
      const start = Math.min(sel!.anchorOffset, sel!.focusOffset);
      const end   = Math.max(sel!.anchorOffset, sel!.focusOffset);
      blockReplaceRange(block, 0, start, 0, end, { type: "code", text: char }).match(
        (b) => { lastContent.current = ''; updateBlock(b); },
        () => {}
      );
      return;
    }

    blockInsertAt(block, 0, flat - 1, { type: "code", text: char }).match(
      (b) => { lastContent.current = ''; updateBlock(b); },
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