// Wraps the current browser text selection in a <mark class="tally-highlight">,
// but only when the selection lies entirely within containerEl and doesn't
// touch a KaTeX-rendered subtree. KaTeX builds a dense internal DOM to render
// math; surrounding part of it in another element corrupts that structure, so
// we skip (no-op) rather than risk breaking the rendered equation.
export function applyHighlightToSelection(containerEl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;

  const range = sel.getRangeAt(0);
  if (!containerEl.contains(range.commonAncestorContainer)) return false;

  const touchesKatex = (node) => {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!el?.closest('.katex');
  };
  if (touchesKatex(range.startContainer) || touchesKatex(range.endContainer)) return false;

  const mark = document.createElement('mark');
  mark.className = 'tally-highlight';
  try {
    range.surroundContents(mark);
  } catch {
    // Selection spans multiple sibling elements; surroundContents can't wrap
    // a range that doesn't nest cleanly in one node, so skip instead of
    // partially corrupting the DOM.
    return false;
  }
  sel.removeAllRanges();
  return true;
}
