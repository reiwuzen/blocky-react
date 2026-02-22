import React from "react";
import { Block, BlockType } from "@reiwuzen/blocky";
import { RichBlock } from "./richBlock";

type HeadingType = "heading1" | "heading2" | "heading3";
type Props = { block: Block<HeadingType>; onFocus: (id: string) => void };

const tagMap: Record<HeadingType, string> = {
  heading1: "blocky-h1",
  heading2: "blocky-h2",
  heading3: "blocky-h3",
};

const placeholderMap: Record<HeadingType, string> = {
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
};

export function HeadingBlock({ block, onFocus }: Props) {
  return (
    <RichBlock
      block={block}
      className={tagMap[block.type as HeadingType]}
      placeholder={placeholderMap[block.type as HeadingType]}
      onFocus={onFocus}
    />
  );
}
