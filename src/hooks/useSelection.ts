import { useCallback } from 'react';
import { AnyBlock, flatToSelection, NodeSelection } from '@reiwuzen/blocky';

/**
 * Returns a function that reads window.getSelection() and converts
 * the flat browser offsets to a NodeSelection for the given block.
 */
export function useSelection(block: AnyBlock) {
  return useCallback((): NodeSelection | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

    const start = Math.min(sel.anchorOffset, sel.focusOffset);
    const end   = Math.max(sel.anchorOffset, sel.focusOffset);

    const result = flatToSelection(block, start, end);
    return result.ok ? result.value : null;
  }, [block]);
}