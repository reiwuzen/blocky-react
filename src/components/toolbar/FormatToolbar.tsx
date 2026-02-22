import React, { useEffect, useRef, useState } from 'react';
import { AnyBlock, Node, toggleBold, toggleItalic, toggleUnderline, toggleStrikethrough, toggleHighlight, toggleColor, setLink, flatToSelection } from '@reiwuzen/blocky';
import { useEditorActions } from '../../hooks/useEditor';

type Props = { block: AnyBlock };

export function FormatToolbar({ block }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { updateBlock } = useEditorActions();

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect  = range.getBoundingClientRect();
      setPos({
        top:  rect.top  + window.scrollY - 44,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  if (!pos) return null;

  const applyFormat = (fn: (nodes: Node[], sel: any) => any) => {
    const sel = window.getSelection();
    if (!sel) return;
    const start = Math.min(sel.anchorOffset, sel.focusOffset);
    const end   = Math.max(sel.anchorOffset, sel.focusOffset);
    flatToSelection(block, start, end).match(
      (nodeSel) => fn(block.content as Node[], nodeSel).match(
        (content: Node[]) => updateBlock({ ...block, content } as AnyBlock),
        () => {}
      ),
      () => {}
    );
  };

  return (
    <div
      ref={ref}
      className="blocky-format-toolbar"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()} // don't lose selection
    >
      <button className="blocky-toolbar-btn" onMouseDown={() => applyFormat(toggleBold)}>B</button>
      <button className="blocky-toolbar-btn blocky-toolbar-btn--italic" onMouseDown={() => applyFormat(toggleItalic)}>I</button>
      <button className="blocky-toolbar-btn blocky-toolbar-btn--underline" onMouseDown={() => applyFormat(toggleUnderline)}>U</button>
      <button className="blocky-toolbar-btn blocky-toolbar-btn--strike" onMouseDown={() => applyFormat(toggleStrikethrough)}>S</button>
      <div className="blocky-toolbar-divider" />
      <button className="blocky-toolbar-btn blocky-toolbar-btn--highlight" onMouseDown={() => applyFormat((n, s) => toggleHighlight(n, s, "yellow"))}>H</button>
      <button className="blocky-toolbar-btn blocky-toolbar-btn--red" onMouseDown={() => applyFormat((n, s) => toggleColor(n, s, "red"))}>A</button>
      <button className="blocky-toolbar-btn blocky-toolbar-btn--blue" onMouseDown={() => applyFormat((n, s) => toggleColor(n, s, "blue"))}>A</button>
    </div>
  );
}