import React, { useEffect, useRef, useState } from "react";
import type { BlockType } from "@reiwuzen/blocky";
import { useEditor } from "./useEditor";

// ─── Block type catalogue ──────────────────────────────────────────────────────

const BLOCK_GROUPS: { label: string; items: { type: BlockType; icon: string; label: string }[] }[] = [
  {
    label: "Text",
    items: [
      { type: "paragraph", icon: "¶",   label: "Paragraph"     },
      { type: "heading1",  icon: "H1",  label: "Heading 1"     },
      { type: "heading2",  icon: "H2",  label: "Heading 2"     },
      { type: "heading3",  icon: "H3",  label: "Heading 3"     },
    ],
  },
  {
    label: "List",
    items: [
      { type: "bullet", icon: "•",  label: "Bullet list"   },
      { type: "number", icon: "1.", label: "Numbered list" },
      { type: "todo",   icon: "☐",  label: "To-do"         },
    ],
  },
  {
    label: "Inline",
    items: [
      { type: "code",     icon: "</>", label: "Code"     },
      { type: "equation", icon: "∑",   label: "Equation" },
    ],
  },
];

const COLORS = ["default", "red", "blue", "green", "gray"] as const;

// ─── Sub-views ────────────────────────────────────────────────────────────────

function TypePanel({ blockId }: { blockId: string }) {
  const { blocks, handleChangeType, closeMenu } = useEditor();
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return null;

  return (
    <div className="bm-panel">
      {BLOCK_GROUPS.map((group) => (
        <div key={group.label} className="bm-group">
          <div className="bm-group-label">{group.label}</div>
          {group.items.map(({ type, icon, label }) => {
            const active = block.type === type;
            return (
              <button
                key={type}
                className={`bm-type-item${active ? " bm-type-item--active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleChangeType(blockId, type);
                  closeMenu();
                }}
              >
                <span className="bm-type-icon">{icon}</span>
                <span className="bm-type-label">{label}</span>
                {active && <span className="bm-tick">✓</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ColorPanel() {
  // Wire up to your color action here
  return (
    <div className="bm-panel bm-panel--colors">
      {COLORS.map((color) => (
        <button
          key={color}
          className={`bm-color-dot bm-color-dot--${color}`}
          title={color}
          onMouseDown={(e) => e.preventDefault()}
        />
      ))}
    </div>
  );
}

// ─── BlockMenu ─────────────────────────────────────────────────────────────────

export function BlockMenu() {
  const { blockMenu, closeMenu } = useEditor();
  const [activeTab, setActiveTab] = useState<"change" | "color" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset tab when menu opens for a new block
  useEffect(() => {
    if (blockMenu) setActiveTab(null);
  }, [blockMenu?.blockId]);

  // Click-outside
  useEffect(() => {
    if (!blockMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [blockMenu, closeMenu]);

  // Escape
  useEffect(() => {
    if (!blockMenu) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [blockMenu, closeMenu]);

  if (!blockMenu) return null;

  const { blockId } = blockMenu;

  return (
    <div
      ref={menuRef}
      className="bm-menu"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="bm-header">
        <span className="bm-header-title">Block options</span>
        <button className="bm-close" onMouseDown={() => closeMenu()}>✕</button>
      </div>

      {/* Tabs */}
      <div className="bm-tabs">
        {(["change", "color"] as const).map((tab) => (
          <button
            key={tab}
            className={`bm-tab${activeTab === tab ? " bm-tab--active" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setActiveTab((prev) => (prev === tab ? null : tab));
            }}
          >
            {tab === "change" ? "Change type" : "Color"}
          </button>
        ))}
      </div>

      {/* Panel */}
      {activeTab === "change" && <TypePanel blockId={blockId} />}
      {activeTab === "color"  && <ColorPanel />}
    </div>
  );
}