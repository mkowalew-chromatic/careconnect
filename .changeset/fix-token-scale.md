---
"@careconnect/design-system": patch
---

Fix two design tokens that broke their scales: `--cc-text-sm` is now 0.875rem (was 1.375rem, larger than `--cc-text-base`) and `--cc-space-4` is 1rem (was 6rem). Small text and every component that uses the 16px spacing step tighten up accordingly.
