import type { Node, } from "@reiwuzen/blocky";

// ─── Escape helpers ────────────────────────────────────────────────────────────
type TextNode = Extract<Node, {type: 'text'}>
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Node[] → HTML string (hydration, runs once per block on mount) ────────────

export function nodesToHtml(nodes: Node[]): string {
  const source = nodes.length > 0 ? nodes : [{ type: "text" as const, text: "" }];

  return source.map((n) => {
    if (n.type === "equation") {
      return `<span class="be-equation" data-latex="${escAttr(n.latex)}">${esc(n.latex)}</span>`;
    }

    if (n.type === "code") {
      return `<span class="be-code">${esc(n.text)}</span>`;
    }

    // text node
    const cls: string[] = [];
    if (n.bold)          cls.push("be-bold");
    if (n.italic)        cls.push("be-italic");
    if (n.underline)     cls.push("be-underline");
    if (n.strikethrough) cls.push("be-strike");
    if (n.highlighted)   cls.push(`be-hl-${n.highlighted}`);
    if (n.color)         cls.push(`be-color-${n.color}`);
    if (n.link)          cls.push("be-link");

    const classAttr = cls.length ? ` class="${cls.join(" ")}"` : "";
    const linkAttr  = n.link ? ` data-link="${escAttr(n.link)}"` : "";
    const text      = esc(n.text).replace(/ {2,}/g, (m) => "&nbsp;".repeat(m.length));

    return `<span${classAttr}${linkAttr}>${text}</span>`;
  }).join("");
}

// ─── DOM → Node[] (serialization, runs on editable true → false) ──────────────

export function domToNodes(el: HTMLElement): Node[] {
  const nodes: Node[] = [];

  el.querySelectorAll<HTMLSpanElement>(":scope > span").forEach((span) => {
    if (span.classList.contains("be-equation")) {
      nodes.push({ type: "equation", latex: span.dataset.latex ?? span.textContent ?? "" });
      return;
    }

    if (span.classList.contains("be-code")) {
      nodes.push({ type: "code", text: span.textContent ?? "" });
      return;
    }

    const node: TextNode = { type: "text", text: span.textContent ?? "" };

    if (span.classList.contains("be-bold"))          node.bold          = true;
    if (span.classList.contains("be-italic"))        node.italic        = true;
    if (span.classList.contains("be-underline"))     node.underline     = true;
    if (span.classList.contains("be-strike"))        node.strikethrough = true;
    if (span.dataset.link)                           node.link          = span.dataset.link;

    span.classList.forEach((c) => {
      if (c.startsWith("be-hl-"))    node.highlighted = c.slice(6) as TextNode["highlighted"];
      if (c.startsWith("be-color-")) node.color       = c.slice(9) as TextNode["color"];
    });

    nodes.push(node);
  });

  return nodes.length > 0 ? nodes : [{ type: "text", text: "" }];
}