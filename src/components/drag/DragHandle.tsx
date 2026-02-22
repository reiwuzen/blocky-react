import React, { useRef } from 'react';
import { useEditorActions } from '../../hooks/useEditor';

type Props = {
  blockId: string;
  onDragStart: (id: string) => void;
};

export function DragHandle({ blockId, onDragStart }: Props) {
  return (
    <div
      className="blocky-drag-handle"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', blockId);
        onDragStart(blockId);
      }}
      title="Drag to reorder"
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
        <circle cx="2" cy="2"  r="1.5" />
        <circle cx="8" cy="2"  r="1.5" />
        <circle cx="2" cy="8"  r="1.5" />
        <circle cx="8" cy="8"  r="1.5" />
        <circle cx="2" cy="14" r="1.5" />
        <circle cx="8" cy="14" r="1.5" />
      </svg>
    </div>
  );
}