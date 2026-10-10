---
"@careconnect/design-system": minor
"@careconnect/ehr": patch
"@careconnect/portal": patch
---

Upgrade the web apps and the design system to React 19 (19.2.3, the version Expo SDK 57 bundles, so web and a future React Native app share one copy). The design system's `react` / `react-dom` peer range is now `^19.0.0`; consumers on React 18 must upgrade. No component API changes. `useId()` values now render as `_r_N_` instead of `:rN:`.
