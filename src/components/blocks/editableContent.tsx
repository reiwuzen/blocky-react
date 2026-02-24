import React, { useRef, useMemo } from 'react';
import { AnyBlock, Node } from '@reiwuzen/blocky';
import { useBlockKeyboard } from '../../hooks/useBlockKeyboard';

type Props = {
  block: AnyBlock;
  className?: string;
  placeholder?: string;
  editable: boolean;
  onFocus: (id: string) => void;
  blockRefs: React.RefObject<Map<string, HTMLSpanElement>>;
};

/**
 * The inner span is wrapped in a memo that NEVER re-renders after mount.
 * React.memo(() => true) tells React "props didn't change, skip re-render".
 * This means the DOM is 100% owned by the browser after first paint.
 * Keyboard handlers stay fresh via a forwarded ref (handlerRef).
 */
export function EditableContent(props: Props) {
  const { block, className, placeholder, editable, onFocus, blockRefs } = props;

  // Always-current handler refs — updated every render of the outer component,
  // but the inner memo'd span only reads them via ref so it never re-renders.
  const keyDownRef = useRef<React.KeyboardEventHandler<HTMLSpanElement>>(() => {});
  const focusRef   = useRef<() => void>(() => {});

  // Re-run useBlockKeyboard every render so it captures fresh store state,
  // but expose it only through the ref so the inner span stays static.
  const handleKeyDown = useBlockKeyboard({ block, onFocus, blockRefs });
  keyDownRef.current  = handleKeyDown;
  focusRef.current    = () => onFocus(block.id);

  const initialHtml = useMemo(
    () => nodesToHtml(block.content as Node[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // computed once at mount from the seed blocks
  );

  return (
    <StaticSpan
      blockId={block.id}
      className={className ?? ''}
      placeholder={placeholder ?? ''}
      editable={editable}
      initialHtml={initialHtml}
      blockRefs={blockRefs}
      keyDownRef={keyDownRef}
      focusRef={focusRef}
    />
  );
}

// ─── Inner span — never re-renders after mount ────────────────────────────────

type StaticSpanProps = {
  blockId: string;
  className: string;
  placeholder: string;
  editable: boolean;
  initialHtml: string;
  blockRefs: React.RefObject<Map<string, HTMLSpanElement>>;
  keyDownRef: React.RefObject<React.KeyboardEventHandler<HTMLSpanElement>>;
  focusRef: React.RefObject<() => void>;
};

const StaticSpan = React.memo(
  function StaticSpan({
    blockId, className, placeholder, editable,
    initialHtml, blockRefs, keyDownRef, focusRef,
  }: StaticSpanProps) {
    return (
      <span
        data-block-id={blockId}
        className={`blocky-block-content ${className}`}
        data-placeholder={placeholder}
        contentEditable={editable}
        suppressContentEditableWarning
        ref={(el) => {
          if (!el) return;
          blockRefs.current.set(blockId, el);
          // innerHTML is set exactly once — when the node first enters the DOM
          if (el.dataset.hydrated) return;
          el.innerHTML = initialHtml;
          el.dataset.hydrated = '1';
        }}
        onKeyDown={(e) => keyDownRef.current(e)}
        onFocus={() => focusRef.current()}
      />
    );
  },
  () => true // never re-render — DOM belongs to the browser
);

// ─── nodes → HTML (hydration only) ────────────────────────────────────────────

export function nodesToHtml(nodes: Node[]): string {
  return nodes.map((n) => {
    if (n.type === 'code')     return `<code>${esc(n.text)}</code>`;
    if (n.type === 'equation') return `<span class="blocky-equation">${esc(n.latex)}</span>`;

    let inner = esc(n.text);
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

// ─── DOM → Node[] (on save) ───────────────────────────────────────────────────

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