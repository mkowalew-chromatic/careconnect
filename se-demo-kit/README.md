# New CareConnect SE demo kit

Six new stories; no existing demo chapters are used. All data is synthetic.

Use a separate checkout of CareConnect, Node 24, and the repository's existing Chromatic project. Copy this folder to `se-demo-kit` in that checkout. The catalog site remains outside CareConnect.

1. Create a dedicated baseline branch from a recorded CareConnect commit. Run `node se-demo-kit/install.mjs` once.
2. Add a design-system changeset, then run the repository's build, typecheck, unit tests and story tests. Commit the fixture files, kit and changeset.
3. Push the branch and dispatch the existing Chromatic workflow for it. An authorized human must accept the new-story baseline. Record the exact baseline commit and build URL.
4. For each session, create a NEW `codex/se-run-<scenario>-<session>` branch from that baseline commit. Run `node se-demo-kit/mutate.mjs <scenario>`, commit, push, and dispatch the existing Chromatic workflow once.
5. For UX review, open a new draft PR against the baseline branch. Both branches need builds. Never merge a deliberate-defect PR. A human performs feedback/sign-off; baseline acceptance and UI Review approval are distinct.
6. Restore with `node se-demo-kit/mutate.mjs <scenario> --restore <baseline-commit>`, commit, push, and wait for the normal triggered build (dispatch once only if no trigger exists). Validate restoration.
7. Record baseline/changed/restored URLs, commits, actual outcomes, date, and verifier in the catalog. Keep the initial baseline unchanged. A script or local test alone does not qualify a Chromatic demo as verified.

## Scenarios

- `handoff`: hide a warning in the new patient handoff fixture.
- `confirmation`: disable the confirmation state transition; the play assertion must fail.
- `shared-alert`: change the actual shared Alert padding; two new usage states and existing Alert stories can change.
- `focused-feedback`: change only one story's surrounding spacing for dependency tracing.
- `design-signoff`: change appointment button spacing for stakeholder review.
- `accessible-action`: remove an accessible name; requires accessibility testing enabled in Chromatic.

The mutation script guards anchors and refuses restoration over unrelated edits. It does not commit, push, invoke Chromatic, change baseline approvals, or reset the repository.

Prepare builds before a meeting. The presenter still shows live Storybook and Chromatic, but does not promise capture latency within the 4:30 script. Do not rerun visual-diff builds to chase green. One rerun is permitted only with evidence of infrastructure failure.
