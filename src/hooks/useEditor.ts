import { useContext, useMemo } from 'react';
import { useStore } from 'zustand';
import { EditorContext } from '../components/editor';
import type { EditorStore } from '../store/editor-store';
import { shallow } from 'zustand/shallow';

export function useEditor<T>(selector: (state: EditorStore) => T): T {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditor must be used inside <Editor />');
  return useStore(store, selector);
}

export function useBlocks()        { return useEditor((s) => s.blocks); }
export function useActiveBlockId() { return useEditor((s) => s.activeBlockId); }
export function useEditorActions() {
  const setBlocks = useEditor(s => s.setBlocks)
  const updateBlock = useEditor(s=> s.updateBlock)
  const insertBlockAfter = useEditor(s=>s.insertAfter)
  const removeBlock = useEditor(s=>s.removeBlock)
  const duplicateBlock = useEditor(s=>s.duplicate)
  const moveBlock = useEditor(s=>s.move)
  const setActiveBlockId = useEditor(s=>s.setActiveBlockId)
  return useMemo(() => ({
    setBlocks,
    updateBlock,
    insertBlockAfter,
    removeBlock,
    duplicateBlock,
    moveBlock,
    setActiveBlockId
  }), [
    setBlocks,
    updateBlock,
    insertBlockAfter,
    removeBlock,
    duplicateBlock,
    moveBlock,
    setActiveBlockId
  ])
}