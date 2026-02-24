import React, { useState } from 'react';
import type { AnyBlock, Block } from '@reiwuzen/blocky';
import { EditableContent } from './blocks/editableContent';
import { DragHandle } from './drag/DragHandle';
import { BlockTypeSwitcher } from './toolbar/BlockTypeSwitcher';
import { FormatToolbar } from './toolbar/FormatToolbar';
import { useEditorActions } from '../hooks/useEditor';

type Props = {
  block: AnyBlock;
  isActive: boolean;
  editable: boolean;
  onFocus: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (dragId: string, dropId: string) => void;
  blockRefs: React.RefObject<Map<string, HTMLSpanElement>>;
  hydratedBlocks: React.RefObject<Set<string>>;
};

export function Block({
  block, isActive, editable, onFocus, onDragStart, onDrop,
  blockRefs, hydratedBlocks,
}: Props) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const { updateBlock } = useEditorActions();

  const { className, placeholder } = blockMeta(block);

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
      {editable && (
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
      )}

      <div className="blocky-block-wrapper">
        {block.type === 'bullet' && <span className="blocky-bullet-marker">•</span>}
        {block.type === 'number' && <span className="blocky-number-marker">1.</span>}
        {block.type === 'todo' && (
          <input
            type="checkbox"
            className="blocky-todo-checkbox"
            checked={!!(block as Block<'todo'>).meta.checked}
            onChange={() => {
              import('@reiwuzen/blocky').then(({ toggleTodo }) => {
                toggleTodo(block as Block<'todo'>).match(
                  (b) => updateBlock(b as AnyBlock),
                  () => {}
                );
              });
            }}
          />
        )}

        <EditableContent
          block={block}
          className={className}
          placeholder={placeholder}
          editable={editable}
          onFocus={onFocus}
          blockRefs={blockRefs}
          hydratedBlocks={hydratedBlocks}
        />

        {editable && isActive && <FormatToolbar block={block} />}
        {editable && showSwitcher && (
          <BlockTypeSwitcher block={block} onClose={() => setShowSwitcher(false)} />
        )}
      </div>
    </div>
  );
}

export function blockMeta(block: AnyBlock): { className: string; placeholder: string } {
  switch (block.type) {
    case 'heading1': return { className: 'blocky-h1', placeholder: 'Heading 1' };
    case 'heading2': return { className: 'blocky-h2', placeholder: 'Heading 2' };
    case 'heading3': return { className: 'blocky-h3', placeholder: 'Heading 3' };
    case 'bullet':   return { className: 'blocky-list-content', placeholder: 'List item' };
    case 'number':   return { className: 'blocky-list-content', placeholder: 'List item' };
    case 'todo':     return { className: 'blocky-list-content', placeholder: 'To-do' };
    case 'code':     return { className: 'blocky-code-content', placeholder: '' };
    case 'equation': return { className: 'blocky-equation-content', placeholder: 'LaTeX' };
    default:         return { className: 'blocky-paragraph', placeholder: 'Type something...' };
  }
}