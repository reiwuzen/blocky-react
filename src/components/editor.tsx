import React, { createContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AnyBlock, createBlock } from '@reiwuzen/blocky';
import { createEditorStore, EditorStoreInstance } from '../store/editor-store';
import { BlockList } from './blockList';
import { domToNodes } from './blocks/editableContent';

export const EditorContext = createContext<EditorStoreInstance | null>(null);

export type EditorProps = {
  /** Seed blocks — hydrated once on mount */
  blocks?: AnyBlock[];

  /**
   * Called with serialized blocks when editable flips true → false.
   * This is your "save" hook.
   */
  onChange?: (blocks: AnyBlock[]) => void;

  editable?: boolean;
  className?: string;
  placeholder?: string;
};

export function Editor({
  blocks: seedBlocks,
  onChange,
  editable = true,
  className,
  placeholder = 'Start writing...',
}: EditorProps) {
  // Shared refs — owned here, passed down to every EditableContent span
  const blockRefs     = useRef<Map<string, HTMLSpanElement>>(new Map());
  const hydratedBlocks = useRef<Set<string>>(new Set());
  const prevEditable  = useRef<boolean>(editable);

  const store = useMemo(
    () => createEditorStore({ initialBlocks: seedBlocks }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Seed store once on mount
  useLayoutEffect(() => {
    const state = store.getState();
    if (seedBlocks && seedBlocks.length > 0) {
      state.setBlocks(seedBlocks);
    } else if (state.blocks.length === 0) {
      createBlock('paragraph').match(
        (b) => state.setBlocks([b]),
        () => {}
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Serialize DOM → blocks when editable flips false (save)
  useEffect(() => {
    const wasEditable = prevEditable.current;
    prevEditable.current = editable;

    if (!wasEditable || editable) return; // only fires on true → false

    const storeBlocks = store.getState().blocks;
    const serialized: AnyBlock[] = storeBlocks.map((block) => {
      const el = blockRefs.current.get(block.id);
      if (!el) return block;

      let content: any[];
      if (block.type === 'code')     content = [{ type: 'code',     text:  el.textContent ?? '' }];
      else if (block.type === 'equation') content = [{ type: 'equation', latex: el.textContent ?? '' }];
      else content = domToNodes(el);

      return { ...block, content } as AnyBlock;
    });

    onChange?.(serialized);
  }, [editable, onChange, store]);

  return (
    <EditorContext.Provider value={store}>
      <div
        className={`blocky-editor ${!editable ? 'blocky-editor--readonly' : ''} ${className ?? ''}`}
        data-placeholder={placeholder}
      >
        <BlockList
          editable={editable}
          blockRefs={blockRefs}
          hydratedBlocks={hydratedBlocks}
        />
      </div>
    </EditorContext.Provider>
  );
}