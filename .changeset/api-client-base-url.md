---
"@careconnect/api-client": minor
---

Add `configureApiBase(url)` so clients where `/api` doesn't resolve (the React Native app) can target an absolute API origin. The Vite `import.meta.env` read is now optional, so the client also loads under React Native.
