import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AnyBlock, Block as BlockType } from "@reiwuzen/blocky";
import { createBlock, createBlockAfter, deleteBlock, toggleTodo } from "@reiwuzen/blocky";
import { Block } from "./block";
import { domToNodes } from "./utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type EditorProps = {
  initialBlocks?: AnyBlock[];
  onChange?: (blocks: AnyBlock[]) => void;
  editable?: boolean;
  className?: string;
  placeholder?: string;
};

// ─── Block type → className + placeholder ─────────────────────────────────────

function blockClassName(type: AnyBlock["type"]): string {
  switch (type) {
    case "heading1": return "be-h1";
    case "heading2": return "be-h2";
    case "heading3": return "be-h3";
    case "code":     return "be-code-block";
    case "equation": return "be-equation-block";
    default:         return "be-paragraph";
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

// ─── Marker span: bullet / number / checkbox ──────────────────────────────────

function Marker({
  block,
  index,
  onToggle,
}: {
  block: AnyBlock;
  index: number;
  onToggle: (id: string) => void;
}) {
  if (block.type === "bullet") {
    const depth = (block as BlockType<"bullet">).meta.depth ?? 0;
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
        checked={!!(block as BlockType<"todo">).meta.checked}
        onChange={() => onToggle(block.id)}
      />
    );
  }
  return null;
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export function Editor({
  initialBlocks,
  onChange,
  editable = true,
  className,
  placeholder = "Start writing…",
}: EditorProps) {
  const [blocks, setBlocks] = useState<AnyBlock[]>(() => {
    if (initialBlocks?.length) return initialBlocks;
    return createBlock("paragraph").match((b) => [b], () => []);
  });

  // Shared refs — block.id → the live div.content DOM node
  const blockRefs      = useRef<Map<string, HTMLDivElement>>(new Map());
  const hydratedBlocks = useRef<Set<string>>(new Set());
  const prevEditable   = useRef(editable);

  // ── Serialize DOM → blocks on editable true → false ───────────────────────

  useEffect(() => {
    const was = prevEditable.current;
    prevEditable.current = editable;
    if (!was || editable) return;

    const serialized: AnyBlock[] = blocks.map((block) => {
      const el = blockRefs.current.get(block.id);
      if (!el) return block;

      const content: AnyBlock["content"] =
        block.type === "code"
          ? [{ type: "code", text: el.textContent ?? "" }]
          : block.type === "equation"
          ? [{ type: "equation", latex: el.querySelector(".be-equation")?.getAttribute("data-latex") ?? el.textContent ?? "" }]
          : domToNodes(el) as AnyBlock["content"];

      return { ...block, content } as AnyBlock;
    });

    onChange?.(serialized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  // ── Block mutations ────────────────────────────────────────────────────────

  const addBlockAfter = useCallback((afterId: string) => {
    setBlocks((prev) =>
      createBlockAfter(prev, afterId, "paragraph").match(
        ({ blocks: next, newId }) => {
          requestAnimationFrame(() => blockRefs.current.get(newId)?.focus());
          return next;
        },
        () => prev
      )
    );
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const { blocks: next, prevId } = deleteBlock(prev, id);
      requestAnimationFrame(() => blockRefs.current.get(prevId)?.focus());
      return next;
    });
  }, []);

  const handleToggleTodo = useCallback((id: string) => {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === id);
      if (!block) return prev;
      return toggleTodo(block).match(
        (updated) => prev.map((b) => (b.id === id ? (updated as AnyBlock) : b)),
        () => prev
      );
    });
  }, []);

  const handleDrop = useCallback((dragId: string, dropId: string) => {
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === dragId);
      const to   = prev.findIndex((b) => b.id === dropId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // ── Keyboard delegation ────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;

    const contentEl = (e.target as HTMLElement).closest<HTMLElement>(".be-content");
    const blockId   = contentEl?.closest<HTMLElement>("[data-block-id]")?.dataset.blockId;
    if (!contentEl || !blockId) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlockAfter(blockId);
      return;
    }

    if (e.key === "Backspace" && (contentEl.textContent ?? "").length === 0) {
      e.preventDefault();
      removeBlock(blockId);
    }
  }, [editable, addBlockAfter, removeBlock]);

  // ── Drag state per-row (local to each row via useState would cause re-renders;
  //    use a data attribute approach instead) ──────────────────────────────────

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
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

  // ── Render ─────────────────────────────────────────────────────────────────

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
                className="be-drag-handle"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", block.id);
                }}
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
                  <circle cx="2" cy="2"  r="1.5" /><circle cx="8" cy="2"  r="1.5" />
                  <circle cx="2" cy="8"  r="1.5" /><circle cx="8" cy="8"  r="1.5" />
                  <circle cx="2" cy="14" r="1.5" /><circle cx="8" cy="14" r="1.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Content wrapper: marker + div.content */}
          <div className="be-content-wrapper">
            <Marker block={block} index={index} onToggle={handleToggleTodo} />

            <Block
              block={block}
              editable={editable}
              placeholder={blockPlaceholder(block.type)}
              className={blockClassName(block.type)}
              blockRefs={blockRefs}
              hydratedBlocks={hydratedBlocks}
              onFocus={() => {}}
            />
          </div>
        </div>
      ))}

      {/* Editor-level empty placeholder */}
      {blocks.length === 0 && (
        <div className="be-empty-placeholder">{placeholder}</div>
      )}
    </div>
  );
}