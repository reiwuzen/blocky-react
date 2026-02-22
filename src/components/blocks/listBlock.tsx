import React from "react";
import { Block } from "@reiwuzen/blocky";
import { RichBlock } from "./richBlock";
import { useEditorActions } from "../../hooks/useEditor";
import { toggleTodo } from "@reiwuzen/blocky";

type ListType = "bullet" | "number" | "todo";
type Props = { block: Block<ListType>; onFocus: (id: string) => void };

export function ListBlock({ block, onFocus }: Props) {
  const { updateBlock } = useEditorActions();
  const depth = block.meta.depth ?? 0;

  return (
    <div
      className={`blocky-list blocky-${block.type}`}
      style={{ paddingLeft: `${depth * 24}px` }}
    >
      {block.type === "todo" && (
        <input
          type="checkbox"
          className="blocky-todo-checkbox"
          checked={!!(block as Block<"todo">).meta.checked}
          onChange={() => {
            toggleTodo(block as Block<"todo">).match(
              (b) => updateBlock(b as unknown as Block<ListType>),
              () => {},
            );
          }}
        />
      )}
      {block.type === "bullet" && (
        <span className="blocky-bullet-marker">•</span>
      )}
      {block.type === "number" && (
        <span className="blocky-number-marker">1.</span>
      )}
      <RichBlock
        block={block}
        className="blocky-list-content"
        onFocus={onFocus}
      />
    </div>
  );
}
