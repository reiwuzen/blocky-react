import React, { createContext, useEffect, useMemo, useRef } from 'react';
import { AnyBlock, createBlock } from '@reiwuzen/blocky';
import { createEditorStore, EditorStoreInstance } from '../store/editor-store';
import { BlockList } from './blockList';

// ─── Context ───────────────────────────────────────────────────────────────────

export const EditorContext = createContext<EditorStoreInstance | null>(null);

// ─── Props ─────────────────────────────────────────────────────────────────────

export type EditorProps = {
  /** Controlled mode — pass blocks + onChange to own the state externally */
  blocks?: AnyBlock[];
  onChange?: (blocks: AnyBlock[]) => void;

  /** Uncontrolled mode — initial blocks only */
  initialBlocks?: AnyBlock[];

  /** Whether the editor is editable */
  editable?: boolean;

  /** Additional className on the root element */
  className?: string;

  /** Placeholder shown when editor is empty */
  placeholder?: string;
};

// ─── Editor ────────────────────────────────────────────────────────────────────

export function Editor({
  blocks: controlledBlocks,
  onChange,
  initialBlocks,
  editable = true,
  className,
  placeholder = "Start writing...",
}: EditorProps) {

  const store = useMemo(
    () => createEditorStore({ initialBlocks, onChange }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Sync controlled blocks into store when they change externally
  const prevControlled = useRef<AnyBlock[] | undefined>(undefined);
  useEffect(() => {
    if (!controlledBlocks) return;
    if (controlledBlocks === prevControlled.current) return;
    prevControlled.current = controlledBlocks;
    store.getState().setBlocks(controlledBlocks);
  }, [controlledBlocks, store]);

  // Seed with one empty paragraph if nothing provided
  useEffect(() => {
    const state = store.getState();
    if (state.blocks.length === 0) {
      createBlock("paragraph").match(
        (b) => state.setBlocks([b]),
        () => {}
      );
    }
  }, [store]);

  return (
    <EditorContext.Provider value={store}>
      <div
        className={`blocky-editor ${!editable ? 'blocky-editor--readonly' : ''} ${className ?? ''}`}
        data-placeholder={placeholder}
      >
        <BlockList />
      </div>
    </EditorContext.Provider>
  );
}