// ─── Main component ────────────────────────────────────────────────────────────
export { Editor } from './components/editor';
export type { EditorProps } from './components/editor';

// ─── Composable parts ──────────────────────────────────────────────────────────
export { BlockList } from './components/blockList';
export { Block } from './components/block';
export { ParagraphBlock } from './components/blocks/paragraphBlock';
export { HeadingBlock } from './components/blocks/headingBlock';
export { ListBlock } from './components/blocks/listBlock';
export { CodeBlock } from './components/blocks/codeBlock';
export { EquationBlock } from './components/blocks/equationBlock';
export { FormatToolbar } from './components/toolbar/FormatToolbar';
export { BlockTypeSwitcher } from './components/toolbar/BlockTypeSwitcher';
export { DragHandle } from './components/drag/DragHandle';

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export { useEditor, useBlocks, useActiveBlockId, useEditorActions } from './hooks/useEditor';
export { useSelection } from './hooks/useSelection';
export { useBlockKeyboard } from './hooks/useBlockKeyboard';