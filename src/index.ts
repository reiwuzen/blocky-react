// ─── Main component ────────────────────────────────────────────────────────────
export { Editor } from './components/editor';
export type { EditorProps } from './components/editor';

// ─── Composable parts ──────────────────────────────────────────────────────────
export { BlockList } from './components/blockList';
export { Block } from './components/block';
export { EditableContent } from './components/blocks/editableContent';
export { FormatToolbar } from './components/toolbar/FormatToolbar';
export { BlockTypeSwitcher } from './components/toolbar/BlockTypeSwitcher';
export { DragHandle } from './components/drag/DragHandle';

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export { useEditor, useBlocks, useActiveBlockId, useEditorActions } from './hooks/useEditor';
export { useSelection } from './hooks/useSelection';
export { useBlockKeyboard } from './hooks/useBlockKeyboard';

// ─── Utils ─────────────────────────────────────────────────────────────────────
export { nodesToHtml, domToNodes } from './components/blocks/editableContent';