## 2026-01-14 - Vanilla JS Loading State Pattern
**Learning:** For lightweight browser PoCs, manual DOM manipulation for loading states is repetitive.
**Action:** Adopt a `setLoading(btn, boolean)` helper that toggles `aria-busy` and `disabled`. Use CSS `[aria-busy="true"] { opacity: 0.7; cursor: wait; }` for consistent visual feedback without class toggling.
