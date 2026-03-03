import React, { useCallback, forwardRef, useImperativeHandle } from "react";
import type { AnyBlock, Block as BT } from "@reiwuzen/blocky";
import { EditorContext, useEditorStore, useCaretRestore } from "./useEditor";
import type { EditorProviderOptions } from "./useEditor";
import { Block } from "./block";
import { BlockMenu } from "./blockMenu";
import { FormatBar } from "./formatBar";
import { isOnFirstLine, isOnLastLine, placeCursorByX } from "./utils";

/**
 * expose api's of the editor
 */
export type EditorHandle = {
  serialize: () => AnyBlock[];
};
// ─── Helpers ───────────────────────────────────────────────────────────────────

function blockClassName(type: AnyBlock["type"]): string {
  switch (type) {
    case "heading1":  return "be-h1";
    case "heading2":  return "be-h2";
    case "heading3":  return "be-h3";
    case "code":      return "be-code-block";
    case "equation":  return "be-equation-block";
    default:          return "be-paragraph";
  }
}

function blockPlaceholder(type: AnyBlock["type"]): string {
  switch (type) {
    case "heading1":  return "Heading 1";
    case "heading2":  return "Heading 2";
    case "heading3":  return "Heading 3";
    case "bullet":
    case "number":    return "List item";
    case "todo":      return "To-do";
    case "equation":  return "LaTeX";
    default:          return "Write something…";
  }
}

// ─── Marker ────────────────────────────────────────────────────────────────────

function Marker({ block, index }: { block: AnyBlock; index: number }) {
  const { handleToggleTodo,editable } = React.useContext(EditorContext)!;

  if (block.type === "bullet") {
    const depth = (block as BT<"bullet">).meta.depth ?? 0;
    return <span className="be-marker">{"◦•▸"[depth % 3]}</span>;
  }
  if (block.type === "number") {
    return <span className="be-marker be-marker--number">{index + 1}.</span>;
  }
  if (block.type === "todo") {
    return (
      <input
        type="checkbox"
        className="be-marker be-marker--checkbox"
        checked={!!(block as BT<"todo">).meta.checked}
        onChange={() => { if(!editable) return;  handleToggleTodo(block.id)}}
      />
    );
  }
  return null;
}

// ─── Inner editor (has access to context) ─────────────────────────────────────

function EditorInner({ className, placeholder }: { className?: string; placeholder?: string }) {
  useCaretRestore(); // drains pendingCaret after every commit
  const {
    blocks, editable,
    blockMenu, openMenu,
    addBlockAfter, removeBlock, mergeWithPrev,
    splitBlockAtCursor, selectAll,
    handleDrop,
  } = React.useContext(EditorContext)!;


  // Keyboard delegation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;

    // Ctrl/Cmd+A → select all blocks
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectAll();
      return;
    }

    const contentEl = (e.target as HTMLElement).closest<HTMLElement>(".be-content");
    const row       = contentEl?.closest<HTMLElement>("[data-block-id]");
    const blockId   = row?.dataset.blockId;
    if (!contentEl || !blockId) return;

    // ── Arrow up / down — cross-block navigation ─────────────────────────────
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const goingUp = e.key === "ArrowUp";
      const onEdge  = goingUp ? isOnFirstLine(contentEl) : isOnLastLine(contentEl);

      if (onEdge) {
        // Find the adjacent row in the DOM (works regardless of React state order)
        const allRows  = Array.from(
          (row.parentElement as HTMLElement).querySelectorAll<HTMLElement>("[data-block-id]")
        );
        const currIdx  = allRows.indexOf(row);
        const adjacent = allRows[goingUp ? currIdx - 1 : currIdx + 1];
        const adjContent = adjacent?.querySelector<HTMLElement>(".be-content");

        if (adjContent) {
          e.preventDefault();
          // Get current X so the caret lands at the same horizontal position
          const sel = window.getSelection();
          const cursorX = sel && sel.rangeCount > 0
            ? sel.getRangeAt(0).getBoundingClientRect().left
            : contentEl.getBoundingClientRect().left;

          placeCursorByX(adjContent, cursorX, goingUp ? "bottom" : "top");
        }
      }
      // If not on the edge, let the browser handle it normally within the block
      return;
    }

    // ── Enter — split block ──────────────────────────────────────────────────
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      splitBlockAtCursor(blockId);
      return;
    }

    // ── Backspace ────────────────────────────────────────────────────────────
    if (e.key === "Backspace") {
      const isEmpty = (contentEl.textContent ?? "").length === 0;

      if (isEmpty) {
        e.preventDefault();
        removeBlock(blockId);
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      const atStart =
        r.collapsed &&
        r.startOffset === 0 &&
        (r.startContainer === contentEl ||
         r.startContainer === contentEl.firstChild ||
         contentEl.firstChild?.contains(r.startContainer));

      if (atStart) {
        e.preventDefault();
        mergeWithPrev(blockId);
      }
    }
  }, [editable, splitBlockAtCursor, selectAll, removeBlock, mergeWithPrev]);

  const handleDragOver  = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add("be-drag-over");
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).classList.remove("be-drag-over");
  };
  const handleDropRow = useCallback((e: React.DragEvent<HTMLDivElement>, dropId: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove("be-drag-over");
    const dragId = e.dataTransfer.getData("text/plain");
    if (dragId && dragId !== dropId) handleDrop(dragId, dropId);
  }, [handleDrop]);

  return (
    <div
      className={`be-editor${!editable ? " be-editor--readonly" : ""}${className ? ` ${className}` : ""}`}
      onKeyDown={handleKeyDown}
    >
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="be-row"
          data-block-id={block.id}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropRow(e, block.id)}
        >
          {/* Gutter */}
          <div className="be-gutter">
            {editable && (
              <div
                className={`be-drag-handle${blockMenu?.blockId === block.id ? " be-drag-handle--active" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", block.id);
                }}
                onClick={() => openMenu(block.id, "more")}
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
                  <circle cx="2" cy="2"  r="1.5" /><circle cx="8" cy="2"  r="1.5" />
                  <circle cx="2" cy="8"  r="1.5" /><circle cx="8" cy="8"  r="1.5" />
                  <circle cx="2" cy="14" r="1.5" /><circle cx="8" cy="14" r="1.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Content wrapper */}
          <div className="be-content-wrapper" data-meta-depth={block.type==='todo'|| block.type==='bullet' ||block.type==='number' ? block.meta.depth:''}>
            <Marker block={block} index={index} />

            <Block
              block={block}
              placeholder={blockPlaceholder(block.type)}
              className={blockClassName(block.type)}
            />
          </div>

          {/* Block menu — rendered per-row, only shows when blockMenu.blockId matches */}
          {blockMenu?.blockId === block.id && <BlockMenu />}
        </div>
      ))}

      {blocks.length === 0 && (
        <div className="be-empty-placeholder">{placeholder}</div>
      )}

      {/* Format bar — floats above selection, hidden for code/equation */}
      {editable && <FormatBar />}
    </div>
  );
}

// ─── Editor (public) ──────────────────────────────────────────────────────────

export type EditorProps = EditorProviderOptions & {
  className?: string;
  placeholder?: string;
};

export const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ className, placeholder, ...storeOptions }, ref) => {
    const store = useEditorStore(storeOptions);

    useImperativeHandle(ref, () => ({
      serialize: store.serialize,
    }));

    return (
      <EditorContext.Provider value={store}>
        <EditorInner className={className} placeholder={placeholder} />
      </EditorContext.Provider>
    );
  }
);