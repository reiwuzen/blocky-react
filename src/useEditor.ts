import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  indentBlock,
  outdentBlock,
  type AnyBlock,
  type BlockType,
} from "@reiwuzen/blocky";
import {
  createBlock,
  insertBlockAfter,
  createBlockAfter,
  deleteBlock,
  toggleTodo,
  changeBlockType,
  applyMarkdownTransform,
  applyEnterTransform,
} from "@reiwuzen/blocky";
import { domToNodes, nodesToHtml, placeCursorAtChar } from "./utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BlockMenuMode = "add" | "more";
export type BlockMenuState = { mode: BlockMenuMode; blockId: string } | null;

/** Written before setBlocks, consumed by useCaretRestore after commit */
type PendingCaret = { blockId: string; charOffset: number };

export type EditorStore = {
  blocks: AnyBlock[];
  editable: boolean;
  blockMenu: BlockMenuState;

  // Refs shared with Block
  blockRefs: React.RefObject<Map<string, HTMLDivElement>>;
  hydratedBlocks: React.RefObject<Set<string>>;
  pendingHtml: React.RefObject<Map<string, string>>;
  pendingCaret: React.RefObject<PendingCaret | null>;

  // Block actions
  addBlockAfter: (afterId: string, type?: BlockType) => void;
  removeBlock: (id: string) => void;
  mergeWithPrev: (id: string) => void;
  handleToggleTodo: (id: string) => void;
  handleDrop: (dragId: string, dropId: string) => void;
  handleChangeType: (blockId: string, type: BlockType) => void;
  handleIndent: (blockId: string) => void;
  handleOutdent: (blockId: string) => void;
  handleEnter: (blockId: string) => void;
  splitBlockAtCursor: (blockId: string) => void;
  formatBlock: (blockId: string) => boolean;
  selectAll: () => void;

  // Menu actions
  openMenu: (blockId: string, mode: BlockMenuMode) => void;
  closeMenu: () => void;

  // Serialization
  serialize: () => AnyBlock[];
};

// ─── Context ───────────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorStore | null>(null);

export function useEditor(): EditorStore {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

/**
 * Call this once inside EditorInner.
 * After every commit it drains pendingCaret and places the cursor precisely.
 * No deps array — must run after every render so it catches the commit
 * that follows setBlocks.
 */
export function useCaretRestore() {
  const { pendingCaret, blockRefs } = useEditor();

  useLayoutEffect(() => {
    const target = pendingCaret.current;
    if (!target) return;
    pendingCaret.current = null; // consume — prevent double-fire

    const el = blockRefs.current.get(target.blockId);
    if (!el) return;

    el.focus();

    const range = document.createRange();
    const placed =
      target.charOffset === Infinity
        ? false // skip straight to fallback → collapse to end
        : placeCursorAtChar(el, target.charOffset, range);

    if (!placed) {
      range.selectNodeContents(el);
      range.collapse(false); // end of block
    }

    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }); // intentionally no dep array
}

// ─── Store hook ────────────────────────────────────────────────────────────────

export type EditorProviderOptions = {
  initialBlocks?: AnyBlock[];
  editable?: boolean;
  onChange?: (blocks: AnyBlock[]) => void;
};

export function useEditorStore({
  initialBlocks,
  editable = true,
  onChange,
}: EditorProviderOptions): EditorStore {
  const [blocks, setBlocks] = useState<AnyBlock[]>(() => {
    if (initialBlocks?.length) return initialBlocks;
    return createBlock("paragraph").match(
      (b) => [b],
      () => [],
    );
  });

  const [blockMenu, setBlockMenuState] = useState<BlockMenuState>(null);

  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hydratedBlocks = useRef<Set<string>>(new Set());
  const pendingHtml = useRef<Map<string, string>>(new Map());
  const pendingCaret = useRef<PendingCaret | null>(null);

  // Always-current mirror of blocks — readable synchronously in callbacks
  // without closing over a stale value.
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const prevEditable = useRef(editable);

  // ── Serialization ──────────────────────────────────────────────────────────

  const serialize = useCallback(
    (): AnyBlock[] =>
      blocksRef.current.map((block) => {
        const el = blockRefs.current.get(block.id);
        if (!el) return block;

        const content: AnyBlock["content"] =
          block.type === "code"
            ? [{ type: "code", text: el.textContent ?? "" }]
            : block.type === "equation"
              ? [
                  {
                    type: "equation",
                    latex:
                      el
                        .querySelector(".be-equation")
                        ?.getAttribute("data-latex") ??
                      el.textContent ??
                      "",
                  },
                ]
              : (domToNodes(el) as AnyBlock["content"]);

        return { ...block, content } as AnyBlock;
      }),
    [],
  ); // blocksRef is a stable ref — no dep needed

  // ── Block actions ─────────────────────────────────────────────────────────
  // Rule: setBlocks receives ONLY pure array calculations.
  //       All DOM reads/mutations happen before setBlocks is called.
  //       Caret intent is written to pendingCaret before setBlocks,
  //       then applied by useCaretRestore after the commit.

  const addBlockAfter = useCallback(
    (afterId: string, type: BlockType = "paragraph") => {
      createBlockAfter(blocksRef.current, afterId, type).match(
        ({ blocks: next, newId }) => {
          pendingCaret.current = { blockId: newId, charOffset: 0 };
          setBlocks(() => next);
        },
        () => {},
      );
    },
    [],
  );

  const removeBlock = useCallback((id: string) => {
    const cur = blocksRef.current;
    if (cur.length <= 1) return;

    // deleteBlock is pure — call it outside setBlocks so we have prevId
    const { blocks: next, prevId } = deleteBlock(cur, id);
    pendingCaret.current = { blockId: prevId, charOffset: Infinity }; // Infinity → end
    setBlocks(() => next);
  }, []);

  const mergeWithPrev = useCallback((id: string) => {
    const cur = blocksRef.current;
    const idx = cur.findIndex((b) => b.id === id);
    if (idx <= 0) return;

    const prevBlock = cur[idx - 1];
    const prevEl = blockRefs.current.get(prevBlock.id);
    const currEl = blockRefs.current.get(id);
    if (!prevEl || !currEl) return;

    // 1. DOM READ
    const junctionCharOffset = prevEl.textContent?.length ?? 0;

    // 2. DOM MUTATION — reparent before React's commit so React never
    //    reconciles against nodes that moved between divs.
    while (currEl.firstChild) prevEl.appendChild(currEl.firstChild);

    // 3. Park caret intent
    pendingCaret.current = {
      blockId: prevBlock.id,
      charOffset: junctionCharOffset,
    };

    // 4. Pure state update — filter only, no DOM access
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleToggleTodo = useCallback((id: string) => {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === id);
      if (!block) return prev;
      return toggleTodo(block).match(
        (updated) => prev.map((b) => (b.id === id ? (updated as AnyBlock) : b)),
        () => prev,
      );
    });
  }, []);

  const handleDrop = useCallback((dragId: string, dropId: string) => {
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === dragId);
      const to = prev.findIndex((b) => b.id === dropId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleChangeType = useCallback((blockId: string, type: BlockType) => {
    const el = blockRefs.current.get(blockId);

    setBlocks((prev) => {
      const block = prev.find((b) => b.id === blockId);
      if (!block) return prev;

      // content → DOM-owned: read the live div correctly per block type
      // (same logic as serialize — atomic blocks must NOT go through domToNodes)
      const liveContent: AnyBlock["content"] = el
        ? block.type === "code"
          ? [{ type: "code", text: el.textContent ?? "" }]
          : block.type === "equation"
            ? [
                {
                  type: "equation",
                  latex:
                    el
                      .querySelector(".be-equation")
                      ?.getAttribute("data-latex") ??
                    el.textContent ??
                    "",
                },
              ]
            : (domToNodes(el) as AnyBlock["content"])
        : block.content;

      const liveBlock = {
        id: block.id,
        type: block.type,
        content: liveContent,
        meta: block.meta,
      } as AnyBlock;

      return changeBlockType(liveBlock, type).match(
        (updated) => {
          if (el) {
            el.innerHTML = nodesToHtml(updated.content);
            // If the div has no text (e.g. was an empty new block) ensure every
            // span has a <br> so the cursor has a valid insertion point.
            if (!el.textContent) {
              el.querySelectorAll<HTMLSpanElement>(":scope > span").forEach(
                (s) => {
                  if (!s.innerHTML) s.innerHTML = "<br>";
                },
              );
              // If there are no spans at all (e.g. empty content array), add one
              if (!el.querySelector(":scope > span")) {
                const span = document.createElement("span");
                span.innerHTML = "<br>";
                el.appendChild(span);
              }
            }
          }
          return prev.map((b) =>
            b.id === blockId ? (updated as AnyBlock) : b,
          );
        },
        () => prev,
      );
    });
  }, []);

  const handleIndent = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === blockId);
      if (!block) return prev;

      return indentBlock(block).match(
        (updated) => prev.map((b) => (b.id === blockId ? updated : b)),
        () => prev,
      );
    });
  }, []);

  const handleOutdent = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === blockId);
      if (!block) return prev;

      return outdentBlock(block).match(
        (updated) => prev.map((b) => (b.id === blockId ? updated : b)),
        () => prev,
      );
    });
  }, []);
  const handleEnter = useCallback((blockId: string) => {
    const el = blockRefs.current.get(blockId);
    if (!el) return;

    const cur = blocksRef.current;
    const block = cur.find((b) => b.id === blockId);
    if (!block) return;

    // read live DOM content
    const liveContent: AnyBlock["content"] = el
        ? block.type === "code"
          ? [{ type: "code", text: el.textContent ?? "" }]
          : block.type === "equation"
            ? [
                {
                  type: "equation",
                  latex:
                    el
                      .querySelector(".be-equation")
                      ?.getAttribute("data-latex") ??
                    el.textContent ??
                    "",
                },
              ]
            : (domToNodes(el) as AnyBlock["content"])
        : block.content;

      const liveBlock = {
        id: block.id,
        type: block.type,
        content: liveContent,
        meta: block.meta,
      } as AnyBlock;

    applyEnterTransform(liveBlock).match(
      ({ block: updated, converted }) => {
        if (converted) {
          setBlocks((prev) => {
            console.log("updated: ", updated);
            return prev.map((b) => (b.id === blockId ? updated : b));
          });

          el.innerHTML = nodesToHtml(updated.content);
          return;
        }

        // fallback → normal split
        splitBlockAtCursor(blockId);
      },
      () => {
        splitBlockAtCursor(blockId);
      },
    );
  }, []);

  const splitBlockAtCursor = useCallback((blockId: string) => {
    const el = blockRefs.current.get(blockId);
    if (!el) return;

    const cur = blocksRef.current;
    const block = cur.find((b) => b.id === blockId);
    if (!block) return;

    // code/equation are atomic — Enter just opens a new empty paragraph after them
    if (block.type === "code" || block.type === "equation") {
      createBlockAfter(cur, blockId, "paragraph").match(
        ({ blocks: next, newId }) => {
          pendingCaret.current = { blockId: newId, charOffset: 0 };
          setBlocks(() => next);
        },
        () => {},
      );
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.startContainer)) return;

    // 1. DOM READ + MUTATION — extract tail before setBlocks
    const tailRange = document.createRange();

    // Normalize text-node boundaries to the span element level so
    // extractContents never partially clones a span and leaves an empty ghost.
    //
    // cursor at offset 0 of textNode  → start = index of its parent span
    // cursor at end of textNode       → start = index of next sibling (skip this span)
    let startContainer: Node = range.startContainer;
    let startOffset: number = range.startOffset;

    if (startContainer.nodeType === Node.TEXT_NODE) {
      const parentSpan = startContainer.parentElement!;
      const spans = Array.from(el.childNodes);
      const spanIdx = spans.indexOf(parentSpan);

      if (startOffset === 0) {
        // cursor at very start of span → include this span in the tail
        startContainer = el;
        startOffset = spanIdx;
      } else if (startOffset === (startContainer as Text).length) {
        // cursor at very end of span → tail starts at the NEXT sibling
        startContainer = el;
        startOffset = spanIdx + 1;
      }
      // mid-span: let extractContents split the text naturally
    }

    tailRange.setStart(startContainer, startOffset);
    tailRange.setEnd(el, el.childNodes.length);

    const tmp = document.createElement("div");
    tmp.appendChild(tailRange.extractContents());

    // Clean up any empty spans extractContents left behind in the source div
    Array.from(el.querySelectorAll<HTMLSpanElement>(":scope > span")).forEach(
      (s) => {
        if (!s.textContent && !s.querySelector("br")) el.removeChild(s);
      },
    );

    // Wrap any bare text nodes that landed directly in tmp
    Array.from(tmp.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const span = document.createElement("span");
        tmp.insertBefore(span, node);
        span.appendChild(node);
      }
    });

    // Remove trailing <br> the browser left in the now-shorter source div
    if (el.lastChild?.nodeName === "BR") el.removeChild(el.lastChild);

    // Empty tail → guarantee a span with <br> so the new block has a cursor target
    const tailHtml = tmp.innerHTML || "<span><br></span>";

    // 2. Park html + caret intent
    createBlock("paragraph").match(
      (newBlock) => {
        pendingHtml.current.set(newBlock.id, tailHtml);
        pendingCaret.current = { blockId: newBlock.id, charOffset: 0 };

        // 3. Pure state update
        insertBlockAfter(
          blocksRef.current,
          blockId,
          newBlock as AnyBlock,
        ).match(
          ({ blocks: next }) => {
            setBlocks(() => next);
          },
          () => {},
        );
      },
      () => {},
    );
  }, []);
  const formatBlock = useCallback((blockId: string): boolean => {
    const el = blockRefs.current.get(blockId);
    if (!el) return false;

    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return false;

    const liveContent: AnyBlock["content"] = el
        ? block.type === "code"
          ? [{ type: "code", text: el.textContent ?? "" }]
          : block.type === "equation"
            ? [
                {
                  type: "equation",
                  latex:
                    el
                      .querySelector(".be-equation")
                      ?.getAttribute("data-latex") ??
                    el.textContent ??
                    "",
                },
              ]
            : (domToNodes(el) as AnyBlock["content"])
        : block.content;

      const liveBlock = {
        id: block.id,
        type: block.type,
        content: liveContent,
        meta: block.meta,
      } as AnyBlock;

    let converted = false;

    applyMarkdownTransform(liveBlock, el.textContent?.length ?? 0).match(
      ({ block: updated, converted: didConvert }) => {
        if (!didConvert) return;

        converted = true;

        setBlocks((prev) => prev.map((b) => (b.id === blockId ? updated : b)));

        el.innerHTML = nodesToHtml(updated.content);
      },
      () => {},
    );

    return converted;
  }, []);

  const selectAll = useCallback(() => {
    const divs = Array.from(blockRefs.current.values());
    if (divs.length === 0) return;
    const range = document.createRange();
    range.setStart(divs[0], 0);
    range.setEnd(
      divs[divs.length - 1],
      divs[divs.length - 1].childNodes.length,
    );
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  // ── Menu ───────────────────────────────────────────────────────────────────

  const openMenu = useCallback(
    (blockId: string, mode: BlockMenuMode) =>
      setBlockMenuState({ blockId, mode }),
    [],
  );
  const closeMenu = useCallback(() => setBlockMenuState(null), []);

  // ── Stable store ───────────────────────────────────────────────────────────

  return useMemo(
    () => ({
      blocks,
      editable,
      blockMenu,
      blockRefs,
      hydratedBlocks,
      pendingHtml,
      pendingCaret,
      addBlockAfter,
      removeBlock,
      mergeWithPrev,
      handleToggleTodo,
      handleDrop,
      handleChangeType,
      handleIndent,
      handleOutdent,
      handleEnter,
      splitBlockAtCursor,
      formatBlock,
      selectAll,
      openMenu,
      closeMenu,
      serialize,
    }),
    [
      blocks,
      editable,
      blockMenu,
      addBlockAfter,
      removeBlock,
      mergeWithPrev,
      handleToggleTodo,
      handleDrop,
      handleChangeType,
      handleIndent,
      handleOutdent,
      handleEnter,
      splitBlockAtCursor,
      formatBlock,
      selectAll,
      openMenu,
      closeMenu,
      serialize,
    ],
  );
}

export { EditorContext };
