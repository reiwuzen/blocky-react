import React, { memo, useLayoutEffect, useRef } from "react";
import type { AnyBlock } from "@reiwuzen/blocky";
import { nodesToHtml } from "./utils";

type Props = {
  block: AnyBlock;
  editable: boolean;
  placeholder?: string;
  className?: string;
  blockRefs: React.RefObject<Map<string, HTMLDivElement>>;
  hydratedBlocks: React.RefObject<Set<string>>;
  onFocus: (id: string) => void;
};

// ─── FrozenContent ─────────────────────────────────────────────────────────────
// memo(() => true) means React never re-renders this after mount.
// The browser owns div.content entirely after hydration.



// ─── Block ─────────────────────────────────────────────────────────────────────

export function Block({ block, editable, placeholder, className, blockRefs, hydratedBlocks, onFocus }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = divRef.current;
    if (!el) return;

    // Register into shared map so Editor can read DOM on save
    blockRefs.current.set(block.id, el);

    // Hydrate once — initial block content written to innerHTML, then ignored forever
    if (!hydratedBlocks.current.has(block.id)) {
      el.innerHTML = nodesToHtml(block.content);
      hydratedBlocks.current.add(block.id);
    }

    return () => { blockRefs.current.delete(block.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={divRef}
      className={`be-content${className ? ` ${className}` : ""}`}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ""}
      onFocus={() => onFocus(block.id)}
    />
  );
}