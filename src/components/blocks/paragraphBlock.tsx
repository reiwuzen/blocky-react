import React from "react";
import { Block } from "@reiwuzen/blocky";
import { RichBlock } from "./richBlock";

type Props = { block: Block<"paragraph">; onFocus: (id: string) => void };

export function ParagraphBlock({ block, onFocus }: Props) {
  return (
    <RichBlock
      block={block}
      className="blocky-paragraph"
      placeholder="Type something..."
      onFocus={onFocus}
    />
  );
}
