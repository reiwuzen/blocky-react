import React, { useState } from 'react';
import { AnyBlock } from '@reiwuzen/blocky';
import { ParagraphBlock } from './blocks/paragraphBlock';
import { HeadingBlock } from './blocks/headingBlock';
import { ListBlock } from './blocks/listBlock';
import { CodeBlock } from './blocks/codeBlock';
import { EquationBlock } from './blocks/equationBlock';
import { DragHandle } from './drag/DragHandle';
import { BlockTypeSwitcher } from './toolbar/BlockTypeSwitcher';
import { FormatToolbar } from './toolbar/FormatToolbar';

type Props = {
  block: AnyBlock;
  isActive: boolean;
  onFocus: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (dragId: string, dropId: string) => void;
};

export function Block({ block, isActive, onFocus, onDragStart, onDrop }: Props) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [isDragOver,   setIsDragOver]   = useState(false);

  return (
    <div
      className={`blocky-block-row ${isDragOver ? 'blocky-drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dragId = e.dataTransfer.getData('text/plain');
        if (dragId !== block.id) onDrop(dragId, block.id);
      }}
    >
      {/* Left gutter */}
      <div className="blocky-gutter">
        <DragHandle blockId={block.id} onDragStart={onDragStart} />
        <button
          className="blocky-type-btn"
          onMouseDown={(e) => { e.preventDefault(); setShowSwitcher((v) => !v); }}
          title="Change block type"
        >
          ⊞
        </button>
      </div>

      {/* Block content */}
      <div className="blocky-block-content">
        {renderBlock(block, onFocus)}
        {isActive && <FormatToolbar block={block} />}
        {showSwitcher && (
          <BlockTypeSwitcher block={block} onClose={() => setShowSwitcher(false)} />
        )}
      </div>
    </div>
  );
}

function renderBlock(block: AnyBlock, onFocus: (id: string) => void) {
  switch (block.type) {
    case "paragraph": return <ParagraphBlock block={block} onFocus={onFocus} />;
    case "heading1":
    case "heading2":
    case "heading3":  return <HeadingBlock block={block as any} onFocus={onFocus} />;
    case "bullet":
    case "number":
    case "todo":      return <ListBlock block={block as any} onFocus={onFocus} />;
    case "code":      return <CodeBlock block={block} onFocus={onFocus} />;
    case "equation":  return <EquationBlock block={block} onFocus={onFocus} />;
  }
}