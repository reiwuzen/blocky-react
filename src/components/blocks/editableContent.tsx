import React, { useRef } from 'react';
import { AnyBlock, Node } from '@reiwuzen/blocky';
import { useBlockKeyboard } from '../../hooks/useBlockKeyboard';
import { useEditorActions, useBlocks } from '../../hooks/useEditor';

type Props = {
  block: AnyBlock;
  className?: string;
  placeholder?: string;
  editable: boolean;
  onFocus: (id: string) => void;
  // shared refs from BlockList so Editor can serialize on save
  blockRefs: React.MutableRefObject<Map<string, HTMLSpanElement>>;
  hydratedBlocks: React.MutableRefObject<Set<string>>;
};

export function EditableContent({
  block,
  className,
  placeholder,
  editable,
  onFocus,
  blockRefs,
  hydratedBlocks,
}: Props) {
  const { updateBlock } = useEditorActions();
  const blocks          = useBlocks();
  const handleKeyDown   = useBlockKeyboard({ block, onFocus });

  const initialText = getInitialText(block.content as Node[]);

  const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
    const el   = e.currentTarget;
    const text = el.textContent ?? '';
    // Keep store in sync with current plain text so keyboard ops work
    updateBlock({ ...block, content: [{ type: 'text', text }] } as AnyBlock);
  };

  return (
    <span
      data-block-id={block.id}
      className={`blocky-block-content ${className ?? ''}`}
      data-placeholder={placeholder}
      contentEditable={editable}
      suppressContentEditableWarning
      ref={(el) => {
        if (!el) return;
        blockRefs.current.set(block.id, el);
        // Hydrate once — never again
        if (hydratedBlocks.current.has(block.id)) return;
        el.innerHTML = nodesToHtml(block.content as Node[]);
        hydratedBlocks.current.add(block.id);
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocus(block.id)}
    />
  );
}

// ─── Initial plain text (for store sync only) ──────────────────────────────────

function getInitialText(nodes: Node[]): string {
  return nodes.map((n) => {
    if (n.type === 'text')     return n.text;
    if (n.type === 'code')     return n.text;
    if (n.type === 'equation') return n.latex;
    return '';
  }).join('');
}

// ─── nodes → HTML string (hydration only, runs once per block) ────────────────

export function nodesToHtml(nodes: Node[]): string {
  return nodes.map((n) => {
    if (n.type === 'code')     return `<code><span>${esc(n.text)}</span></code>`;
    if (n.type === 'equation') return `<span class="blocky-equation">${esc(n.latex)}</span>`;

    let inner = `<span>${esc(n.text)}</span>`;
    if (n.bold)          inner = `<strong>${inner}</strong>`;
    if (n.italic)        inner = `<em>${inner}</em>`;
    if (n.underline)     inner = `<u>${inner}</u>`;
    if (n.strikethrough) inner = `<s>${inner}</s>`;
    if (n.highlighted)   inner = `<mark class="blocky-highlight-${n.highlighted}">${inner}</mark>`;
    if (n.color)         inner = `<span class="blocky-color-${n.color}">${inner}</span>`;
    if (n.link)          inner = `<a href="${n.link}">${inner}</a>`;
    return inner;
  }).join('');
}

// ─── DOM → Node[] (used on save) ──────────────────────────────────────────────

export function domToNodes(el: HTMLElement): Node[] {
  const nodes: Node[] = [];

  const walk = (node: ChildNode, formats: any = {}) => {
    if (node.nodeType === window.Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text) return;
      nodes.push({ type: 'text', text, ...formats } as Node);
      return;
    }
    if (!(node instanceof HTMLElement)) return;

    const tag      = node.tagName.toLowerCase();
    const inherited = { ...formats };

    if (tag === 'strong' || tag === 'b') inherited.bold          = true;
    if (tag === 'em'     || tag === 'i') inherited.italic        = true;
    if (tag === 'u')                      inherited.underline     = true;
    if (tag === 's')                      inherited.strikethrough = true;
    if (tag === 'a')                      inherited.link          = node.getAttribute('href') ?? undefined;
    if (tag === 'mark') {
      inherited.highlighted = node.className.includes('green') ? 'green' : 'yellow';
    }
    if (tag === 'code') {
      nodes.push({ type: 'code', text: node.innerText });
      return;
    }
    if (tag === 'span' && node.classList.contains('blocky-equation')) {
      nodes.push({ type: 'equation', latex: node.innerText });
      return;
    }

    node.childNodes.forEach((child) => walk(child, inherited));
  };

  el.childNodes.forEach((child) => walk(child));

  // Merge adjacent text nodes with identical formatting
  const merged: Node[] = [];
  for (const node of nodes) {
    const prev = merged[merged.length - 1];
    if (
      prev && node.type === 'text' && prev.type === 'text' &&
      JSON.stringify({ ...prev, text: '' }) === JSON.stringify({ ...node, text: '' })
    ) {
      (prev as any).text += (node as any).text;
    } else {
      merged.push({ ...node });
    }
  }

  return merged.length > 0 ? merged : [{ type: 'text', text: '' }];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}