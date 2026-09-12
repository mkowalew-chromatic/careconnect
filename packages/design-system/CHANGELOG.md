# @careconnect/design-system

## 0.3.3

### Patch Changes

- a25de7e: Figma ↔ Storybook bridge: every story shows its Figma frame in a new Design tab (links kept in `src/figma/links.json`), design tokens are exported to `src/figma/tokens.json` (W3C DTCG, `npm run tokens:export`) for Figma variable import, and new `Foundations/Tokens` sheets document colors, type, spacing, radius and elevation. Workflow in docs/FIGMA.md.
- f714324: Fix two design tokens that broke their scales: `--cc-text-sm` is now 0.875rem (was 1.375rem, larger than `--cc-text-base`) and `--cc-space-4` is 1rem (was 6rem). Small text and every component that uses the 16px spacing step tighten up accordingly.

## 0.3.2

### Patch Changes

- 01a3cdb: Release and deploy each unit independently. The API, EHR, Portal and design system now have their own versions, changelogs, `@careconnect/<name>@<version>` tags and GitHub Releases, and the three deployable units ship as separate artifacts (`careconnect-<unit>-<version>-<sha>.tar.gz`) through a per-unit staging → production pipeline. Frontends are published as atomic symlinked release directories with instant rollback; API deploys touch only the API's own paths. Deploying one unit no longer restarts or rebuilds the others.

## 0.3.1

### Patch Changes

- 4ccb63e: Update `--cc-text-sm` typography token (0.875rem → 1.375rem), affecting small text sizing across components that consume it.

## 0.3.0

### Minor Changes

- 3705c81: Add `appVersion` and `designSystemVersion` props to `LoginScreen`, rendered as a small footer line when provided. Also export a `DESIGN_SYSTEM_VERSION` constant from the package root so consumers don't need to hardcode the design system's own version.

## 0.2.2

### Patch Changes

- 3e6c304: Add `tslib` as an explicit dependency. `echarts-for-react` (used internally by the chart components) imports it via a compiled helper but never declared it as a dependency itself, so consumers whose own dependency tree didn't happen to hoist a `tslib` from elsewhere would fail to resolve it at build time.

## 0.2.1

### Patch Changes

- 7edf6c2: Fix missing design tokens/reset in published CSS; externalize runtime dependencies from the build to reduce bundle size and avoid duplicate copies in consumers.

## 0.2.0

### Minor Changes

- 3733419: Initial extraction of the CareConnect design system as a standalone, independently-versioned package.
