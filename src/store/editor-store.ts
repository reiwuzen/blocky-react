import { create } from 'zustand';
import {
  AnyBlock,
  insertBlockAfter,
  deleteBlock,
  duplicateBlock,
  moveBlock,
} from '@reiwuzen/blocky';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type EditorStore = {
  blocks: AnyBlock[];
  activeBlockId: string | null;

  setBlocks: (blocks: AnyBlock[]) => void;
  updateBlock: (block: AnyBlock) => void;
  insertAfter: (afterId: string, type?: AnyBlock["type"]) => string | null;
  removeBlock: (id: string) => string;
  duplicate: (id: string) => void;
  move: (id: string, direction: "up" | "down") => void;
  setActiveBlockId: (id: string | null) => void;
};

export type EditorStoreConfig = {
  initialBlocks?: AnyBlock[];
  onChange?: (blocks: AnyBlock[]) => void;
};

// ─── Factory ───────────────────────────────────────────────────────────────────

export function createEditorStore(config: EditorStoreConfig = {}) {
  return create<EditorStore>((set, get) => ({
    blocks: config.initialBlocks ?? [],
    activeBlockId: null,

    setBlocks: (blocks) => {
      set({ blocks });
      config.onChange?.(blocks);
    },

    updateBlock: (block) => {
      const blocks = get().blocks.map((b) => (b.id === block.id ? block : b));
      set({ blocks });
      config.onChange?.(blocks);
    },

    insertAfter: (afterId, type = "paragraph") => {
      const result = insertBlockAfter(get().blocks, afterId, type);
      if (!result.ok) return null;
      const { blocks, newId } = result.value;
      set({ blocks, activeBlockId: newId });
      config.onChange?.(blocks);
      return newId;
    },

    removeBlock: (id) => {
      const { blocks, prevId } = deleteBlock(get().blocks, id);
      set({ blocks, activeBlockId: prevId });
      config.onChange?.(blocks);
      return prevId;
    },

    duplicate: (id) => {
      const block = get().blocks.find((b) => b.id === id);
      if (!block) return;
      const dup = duplicateBlock(block, crypto.randomUUID());
      const result = insertBlockAfter(get().blocks, id, block.type);
      if (!result.ok) return;
      const blocks = result.value.blocks.map((b) =>
        b.id === result.value.newId ? dup : b
      );
      set({ blocks, activeBlockId: dup.id });
      config.onChange?.(blocks);
    },

    move: (id, direction) => {
      moveBlock(get().blocks, id, direction).match(
        (blocks) => { set({ blocks }); config.onChange?.(blocks); },
        () => {}
      );
    },

    setActiveBlockId: (id) => set({ activeBlockId: id }),
  }));
}

export type EditorStoreInstance = ReturnType<typeof createEditorStore>;