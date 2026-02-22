import React, { useCallback } from 'react';
import { useBlocks, useActiveBlockId, useEditorActions } from '../hooks/useEditor';
import { Block } from './block';

export function BlockList() {
  const blocks          = useBlocks();
  const activeBlockId   = useActiveBlockId();
  const { setBlocks, setActiveBlockId } = useEditorActions();

  const handleDrop = useCallback((dragId: string, dropId: string) => {
    const from = blocks.findIndex((b) => b.id === dragId);
    const to   = blocks.findIndex((b) => b.id === dropId);
    if (from === -1 || to === -1) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
  }, [blocks, setBlocks]);

  return (
    <div className="blocky-block-list">
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          isActive={block.id === activeBlockId}
          onFocus={setActiveBlockId}
          onDragStart={setActiveBlockId}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}