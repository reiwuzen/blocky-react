import React, { useRef, useMemo } from "react";
import { AnyBlock, Node } from "@reiwuzen/blocky";
import { useBlockKeyboard } from "../../hooks/useBlockKeyboard";

type Props = {
  block: AnyBlock;
  className?: string;
  placeholder?: string;
  editable: boolean;
  onFocus: (id: string) => void;
  blockRefs: React.RefObject<Map<string, HTMLSpanElement>>;
  hydratedBlocks: React.RefObject<Set<string>>
};

/**
 * The inner span is wrapped in a memo that NEVER re-renders after mount.
 * React.memo(() => true) tells React "props didn't change, skip re-render".
 * This means the DOM is 100% owned by the browser after first paint.
 * Keyboard handlers stay fresh via a forwarded ref (handlerRef).
 */
export function EditableContent({
  block,
  className,
  editable,
  blockRefs,
}: Props) {
  return (
    <div
      className={`blocky-content ${className ?? ""}`}
      contentEditable={editable}
      suppressContentEditableWarning
      ref={(el) => {
        if (!el) return;
        blockRefs.current.set(block.id, el);
      }}
    >
      {block.content.map((node, i) => {
        const { classString, dataAttrs } = nodeToAttrs(node);

        return (
          <span
            key={i}
            className={classString}
            {...parseDataAttrs(dataAttrs)}
          >
            {node.type === "equation"
              ? node.latex
              : node.text}
          </span>
        );
      })}
    </div>
  );
}



export function nodeToAttrs(n: Node): {
  classString: string;
  dataAttrs: string;
} {
  const classes: string[] = [];
  const data: string[] = [];

  // Type-based classes
  if (n.type === "code") classes.push("blocky-code");
  if (n.type === "equation") classes.push("blocky-equation");

  if (n.type === "text") {
    if (n.bold) classes.push("blocky-bold");
    if (n.italic) classes.push("blocky-italic");
    if (n.underline) classes.push("blocky-underline");
    if (n.strikethrough) classes.push("blocky-strike");
    if (n.highlighted) classes.push(`blocky-highlight-${n.highlighted}`);
    if (n.color) classes.push(`blocky-color-${n.color}`);
    if (n.link) {
      data.push(`data-link="${escAttr(n.link)}"`);
    }
  }

  // Data attributes (never trust raw injection)

  if (n.type === "equation") {
    data.push(`data-latex="${escAttr(n.latex)}"`);
  }

  return {
    classString: classes.join(" "),
    dataAttrs: data.join(" "),
  };
}

// ─── nodes → HTML (hydration only) ────────────────────────────────────────────

export function nodesToHtml(nodes: Node[]): string {
  return nodes
    .map((n) => {
      // Equation node
      if (n.type === "equation") {
        return `<span class="blocky-equation">${esc(n.latex)}</span>`;
      }

      // Code node (treated as formatted text span)
      if (n.type === "code") {
        return `<span class="blocky-code">${esc(n.text)}</span>`;
      }

      // Default text node
      if (n.type === "text") {
        const classes: string[] = [];

        if (n.bold) classes.push("blocky-bold");
        if (n.italic) classes.push("blocky-italic");
        if (n.underline) classes.push("blocky-underline");
        if (n.strikethrough) classes.push("blocky-strike");
        if (n.highlighted) classes.push(`blocky-highlight-${n.highlighted}`);
        if (n.color) classes.push(`blocky-color-${n.color}`);
        if (n.link) classes.push("blocky-link");

        // Store link safely as data attribute instead of raw href
        const linkAttr = n.link ? ` data-link="${escAttr(n.link)}"` : "";

        const classAttr =
          classes.length > 0 ? ` class="${classes.join(" ")}"` : "";

        return `<span${classAttr}${linkAttr}>${esc(n.text)}</span>`;
      }

      return "";
    })
    .join("");
}

// ─── DOM → Node[] (on save) ───────────────────────────────────────────────────

export function domToNodes(el: HTMLElement): Node[] {
  const nodes: Node[] = [];

  el.querySelectorAll("span").forEach((span) => {
    const text = span.innerText ?? "";

    const node: any = {
      type: span.classList.contains("blocky-equation")
        ? "equation"
        : span.classList.contains("blocky-code")
        ? "code"
        : "text",
      text,
    };

    if (span.classList.contains("blocky-bold")) node.bold = true;
    if (span.classList.contains("blocky-italic")) node.italic = true;
    if (span.classList.contains("blocky-underline")) node.underline = true;
    if (span.classList.contains("blocky-strike")) node.strikethrough = true;

    if (span.dataset.link) node.link = span.dataset.link;
    if (span.dataset.latex) node.latex = span.dataset.latex;

    nodes.push(node);
  });

  return nodes.length ? nodes : [{ type: "text", text: "" }];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseDataAttrs(dataAttrs: string) {
  const obj: Record<string, string> = {};
  dataAttrs.split(" ").forEach((pair) => {
    if (!pair) return;
    const [k, v] = pair.split("=");
    obj[k] = v?.replace(/"/g, "") ?? "";
  });
  return obj;
}