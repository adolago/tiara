## 2026-01-14 - Vanilla JS Loading State Pattern
**Learning:** For lightweight browser PoCs, manual DOM manipulation for loading states is repetitive.
**Action:** Adopt a `setLoading(btn, boolean)` helper that toggles `aria-busy` and `disabled`. Use CSS `[aria-busy="true"] { opacity: 0.7; cursor: wait; }` for consistent visual feedback without class toggling.

## 2026-01-14 - Vanilla JS SVG Spinner Injection
**Learning:** Replacing icon SVGs with spinner SVGs during loading states provides better feedback than just opacity changes.
**Action:** Enhance `setLoading` to swap SVGs dynamically while preserving original icon structure for restoration.
