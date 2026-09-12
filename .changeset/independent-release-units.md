---
"@careconnect/api": patch
"@careconnect/ehr": patch
"@careconnect/portal": patch
"@careconnect/design-system": patch
---

Release and deploy each unit independently. The API, EHR, Portal and design system now have their own versions, changelogs, `@careconnect/<name>@<version>` tags and GitHub Releases, and the three deployable units ship as separate artifacts (`careconnect-<unit>-<version>-<sha>.tar.gz`) through a per-unit staging → production pipeline. Frontends are published as atomic symlinked release directories with instant rollback; API deploys touch only the API's own paths. Deploying one unit no longer restarts or rebuilds the others.
