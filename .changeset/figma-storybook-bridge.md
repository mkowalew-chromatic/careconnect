---
"@careconnect/design-system": patch
---

Figma ↔ Storybook bridge: every story shows its Figma frame in a new Design tab (links kept in `src/figma/links.json`), design tokens are exported to `src/figma/tokens.json` (W3C DTCG, `npm run tokens:export`) for Figma variable import, and new `Foundations/Tokens` sheets document colors, type, spacing, radius and elevation. Workflow in docs/FIGMA.md.
