import React, { useLayoutEffect, useRef } from "react";
import type { AnyBlock } from "@reiwuzen/blocky";
import { useEditor } from "./useEditor";
import { nodesToHtml } from "./utils";

type Props = {
  block: AnyBlock;
  placeholder?: string;
  className?: string;
};

export function Block({ block, placeholder, className }: Props) {
  const { editable, blockRefs, hydratedBlocks, pendingHtml } = useEditor();
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = divRef.current;
    if (!el) return;

    blockRefs.current.set(block.id, el);

    if (!hydratedBlocks.current.has(block.id)) {
      // pendingHtml carries the live DOM tail extracted during an Enter split —
      // use it directly instead of re-serializing through the node model.
      const html = pendingHtml.current.get(block.id);
      if (html !== undefined) {
        el.innerHTML = html;
        pendingHtml.current.delete(block.id);
      } else {
        el.innerHTML = nodesToHtml(block.content);
      }
      hydratedBlocks.current.add(block.id);
    }

    return () => { blockRefs.current.delete(block.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={divRef}
      className={`be-content ${className ? ` ${className}` : ""}`}
      contentEditable={editable}
      
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ""}
    />
  );
}