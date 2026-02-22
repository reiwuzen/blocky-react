import React from 'react';
import { AnyBlock, BlockType, changeBlockType } from '@reiwuzen/blocky';
import { useEditorActions } from '../../hooks/useEditor';

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: "paragraph", label: "Text" },
  { type: "heading1",  label: "H1" },
  { type: "heading2",  label: "H2" },
  { type: "heading3",  label: "H3" },
  { type: "bullet",    label: "Bullet" },
  { type: "number",    label: "Number" },
  { type: "todo",      label: "Todo" },
  { type: "code",      label: "Code" },
  { type: "equation",  label: "Equation" },
];

type Props = {
  block: AnyBlock;
  onClose: () => void;
};

export function BlockTypeSwitcher({ block, onClose }: Props) {
  const { updateBlock } = useEditorActions();

  return (
    <div className="blocky-type-switcher">
      {BLOCK_TYPES.map(({ type, label }) => (
        <button
          key={type}
          className={`blocky-type-option ${block.type === type ? 'blocky-type-option--active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault(); // don't steal focus
            changeBlockType(block, type).match(
              (b) => { updateBlock(b as AnyBlock); onClose(); },
              () => {}
            );
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}