---
"@careconnect/api": patch
---

The API deploy artifact now installs only the API's own production dependencies (`npm ci --workspace=@careconnect/api`) instead of every workspace's, which keeps the frontends' and the mobile app's packages out of the server artifact.
