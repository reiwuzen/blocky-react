import React, { useCallback, useRef } from 'react';
import { useBlocks, useActiveBlockId, useEditorActions } from '../hooks/useEditor';
import { Block } from './block';

type Props = {
  editable: boolean;
  // expose refs to editor for DOM serialization on save
  blockRefs: React.RefObject<Map<string, HTMLSpanElement>>;
  hydratedBlocks: React.RefObject<Set<string>>;
};

export function BlockList({ editable, blockRefs, hydratedBlocks }: Props) {
  const blocks        = useBlocks();
  const activeBlockId = useActiveBlockId();
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
          editable={editable}
          onFocus={setActiveBlockId}
          onDragStart={setActiveBlockId}
          onDrop={handleDrop}
          blockRefs={blockRefs}
          hydratedBlocks={hydratedBlocks}
        />
      ))}
    </div>
  );
}