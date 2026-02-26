import { Block, BlockType } from "@reiwuzen/blocky";
import { useState } from "react";

export const DEFAULT_PARAGRAPH_CONTENT: Block<"paragraph"> = {
  id: crypto.randomUUID(),
  type: "paragraph",
  meta: {},
  content: [
    {
      type: "text",
      text: "",
    },
  ],
};



export const BLOCK_ITEMS: {
  type: BlockType
   
  icon: string;
  label: string;
  hint?: string;
}[] = [
  {
    type: "paragraph",
    icon: "T",
    label: "Text",
    hint: "Just start writing",
  },
  {
    type: "heading1",
    icon: "H1",
    label: "Heading 1",
    hint: "#",
  },
  {
    type: "heading2",
    icon: "H2",
    label: "Heading 2",
    hint: "##",
  },
  {
    type: "heading3",
    icon: "H3",
    label: "Heading 3",
    hint: "###",
  },
  // {
  //   type: "quote",
  //   icon: "❝",
  //   label: "Quote",
  //   hint: "''",
  // },
  // {
  //   type: "callout",
  //   icon: "💡",
  //   label: "Callout",
  // },
  // {
  //   type: "toggle",
  //   icon: "▸",
  //   label: "Toggle",
  // },
  {
    type: "bullet",
    icon: "•",
    label: "Bullet-list",
    hint: "-",
  },
  {
    type: "number",
    icon: "1.",
    label: "Number-list",
    hint: "1.",
  },
  { type: "todo", icon: "[]", label: "TODO", hint: "[]" },
  {
    type: "code",
    icon: "</>",
    label: "Code",
    hint: "Write or paste code",
  },
  {
    type: "equation",
    icon: "∑",
    label: "Equation",
    hint: "LaTeX math block",
  },
];




