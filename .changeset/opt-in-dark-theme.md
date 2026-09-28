---
'@careconnect/design-system': minor
---

Add an opt-in dark theme: set `data-theme="dark"` on `<html>` (or any ancestor) to switch the neutral tokens. Nothing changes for apps that don't set it. Storybook gains a light/dark toolbar switch and named mobile/tablet/desktop viewports, and Chromatic now captures the Card stories in both themes and the LoginScreen stories at mobile and desktop widths.
