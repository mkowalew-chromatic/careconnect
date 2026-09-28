# Chromatic demo storylines

Scripted, self-refreshing demos of Chromatic on this repo. Each **storyline** is
a sequence of short chapters told to one audience; each **chapter** is a small,
realistic PR that shows one Chromatic feature. Every Monday
[`chromatic-demo.yml`](../.github/workflows/chromatic-demo.yml) closes last
week's demo PRs and opens a fresh set off the current `main`, so the demos are
always ready and always reflect today's components.

Find the current set under the
[`chromatic-demo` label](https://github.com/mkowalew-chromatic/careconnect/pulls?q=is%3Apr+is%3Aopen+label%3Achromatic-demo).
Each PR's description carries its part of the story, what to show, its maturity
level, the customer outcome, and links to the other chapters of its storyline.

## Which storyline to use

Pick by who is in the room; each name jumps to its storyline.

| # | Storyline | Audience | Chapters | Shows |
|---|-----------|----------|----------|-------|
| 1 | [**Before you push**](#storyline-1-before-you-push) | Frontend developers | 4 | Visual, accessibility and interaction tests in Storybook on your laptop, before the PR exists |
| 2 | [**From first build to every PR**](#storyline-2-from-first-build-to-every-pr) | Platform and engineering leads | 6 | Coverage, cost and a required check on every PR |
| 3 | [**Figma to production**](#storyline-3-figma-to-production) | UX design and frontend teams | 7 | Design sign-off, design drift, themes and viewports |
| 4 | [**The agent opened a PR**](#storyline-4-the-agent-opened-a-pr) | Teams adopting AI coding agents | 5 | How Chromatic catches the ways agent-written UI goes wrong |

## The maturity model

Within every storyline the chapters climb the same four levels of Chromatic
adoption, from beginner to advanced. Each PR is labeled with its level
(`demo: L1 catch changes` … `demo: L4 scale`), so the PR list can also be
filtered by level: all the L1 chapters make a beginner session, all the L4
chapters an advanced one.

| Level | Name | What the team does with Chromatic |
|-------|------|-----------------------------------|
| L1 | **Catch changes** | Visual tests on every PR against an accepted baseline |
| L2 | **Review together** | Design and product sign off in UI Review, as a PR check |
| L3 | **Test behavior** | Accessibility and interaction tests on the same stories |
| L4 | **Scale** | Themes, viewports and browsers; TurboSnap; required on every PR; agents at volume |

`run.mjs` refuses a storyline whose levels go back down, so the progression
stays true as chapters are added.

## Storyline 1: Before you push

For **frontend developers**: everything Chromatic checks in CI, run from
Storybook on your own laptop while you work. Each chapter is still a PR, but
the demo happens locally: check out the branch (`gh pr checkout <number>`), run
`npm run storybook` and open http://localhost:6006. The PR's Chromatic check
then shows that CI reports the same thing.

| # | Level | Feature | The change | Customer outcome |
|---|-------|---------|------------|------------------|
| 01 | L1 | **Visual Tests addon** | A 2px Input border; **Run tests** in the Visual tests panel shows every component it changes. | Developers see every visual change a component edit causes before they push, not after CI reports it. |
| 02 | L3 | **Accessibility panel and Vitest addon** | A lighter Textarea hint fails contrast, flagged live in the Accessibility panel. | Accessibility problems are fixed while the developer is still working on the component, at no extra cost. |
| 03 | L3 | **Interaction tests (Testing widget)** | A Switch id prefix that misses the label's `htmlFor`; no visual diff. | Developers catch broken behavior in seconds on their own machine, with the same tests CI runs. |
| 04 | L4 | **Modes in the Visual Tests addon** | Flattened dark-theme surfaces; only the dark Card snapshots change. | Developers check every theme before pushing without switching themes story by story. |

What this storyline proves, and what a customer would measure:

- **Problems are found before the PR is opened**: PRs whose first Chromatic build has unexpected changes.
- **Less waiting on CI to learn what changed**: time from first push to a green UI Tests check.
- **One set of stories covers visual, accessibility and behavior**: components with play functions and passing accessibility checks.

The Visual tests panel comes from `@chromatic-com/storybook`, and the Testing
widget from `@storybook/addon-vitest`; both are already in
[`.storybook/main.ts`](../packages/design-system/.storybook/main.ts). The
addon finds the Chromatic project through
[`chromatic.config.json`](../packages/design-system/chromatic.config.json).

## Storyline 2: From first build to every PR

For **platform and engineering leads**: a design-system team's path from its
first visual test to Chromatic as a required check on every PR.

| # | Level | Feature | The change | Customer outcome |
|---|-------|---------|------------|------------------|
| 01 | L1 | **Visual regression testing** | Tighter medium Button padding changes every component that uses Button. | A bad change to a shared component gets caught once, before it reaches every app that uses it. |
| 02 | L2 | **UI Review** | A new `outline` Button variant goes through design sign-off. | Designers sign off before merge, so fewer UI fixes turn into follow-up tickets after release. |
| 03 | L3 | **Accessibility regression testing** | A softer Cancelled badge red fails contrast. | New accessibility problems get caught on the PR that introduces them, even while an older backlog still exists. |
| 04 | L3 | **UI Tests (interaction test)** | `preventDefault()` on the Switch label; no visual diff. | Bugs that don't change how the UI looks still get caught, using the same stories and the same check. |
| 05 | L4 | **TurboSnap** | Wider divider labels; only the Divider stories are captured. | Snapshot usage grows with the size of each change, not with the size of the library. |
| 06 | L4 | **TurboSnap (skipped build)** | An API-only change; 0 snapshots. | Chromatic can be a required check on every PR, and PRs that don't touch the UI don't use any snapshots. |

What this storyline proves, and what a customer would measure:

- **Fewer UI regressions reach the apps**: uI defects reported after release in the consuming apps.
- **Design and engineering agree before merge**: uI rework tickets opened after release.
- **Coverage grows while testing cost stays predictable**: snapshots per PR, and the share of PRs that capture none.

## Storyline 3: Figma to production

For **UX design and frontend teams** together: the Billing team ships a Claims
screen, and every chapter has a designer's lens and an engineer's lens.

| # | Level | Feature | The change | Customer outcome |
|---|-------|---------|------------|------------------|
| 01 | L1 | **Visual regression testing** | Card padding tightened in the shared component. | Differences from the design show up on the PR that caused them, instead of in production. |
| 02 | L1 | **Visual regression (interaction states)** | The Checkbox focus ring is removed. | States like focus and hover stay the way they were designed, without anyone checking them by hand. |
| 03 | L2 | **UI Review** | A Telehealth Badge from the Figma spec, compared with its frame in the Design tab. | Designers approve the real component before merge instead of reviewing screenshots after release. |
| 04 | L3 | **Accessibility regression testing** | Quieter tabs built exactly per spec fail contrast. | Accessibility problems in a design get found before engineers spend time building them. |
| 05 | L3 | **UI Tests (interaction test)** | An inverted guard on the Tabs `onChange`; no visual diff. | Broken behavior gets caught even when the screen looks exactly like the design. |
| 06 | L4 | **Modes (light/dark themes, across browsers)** | A hex value copied from Figma instead of the token. | Each theme and browser gets checked on every PR, without a manual QA pass for each combination. |
| 07 | L4 | **Modes (viewports)** | A small-screen rule change breaks the stats layout on phones. | Layouts get checked at each designed screen size on every PR. |

What this storyline proves, and what a customer would measure:

- **What ships matches what was designed**: design QA issues found after release.
- **Fewer review rounds between design and engineering**: design feedback rounds per feature.
- **Themes, screen sizes and browsers checked without manual QA**: manual QA hours per release.

Chapters 06 and 07 (and *Before you push* 04) rely on Chromatic **modes**, defined in
[`.storybook/modes.ts`](../packages/design-system/.storybook/modes.ts) and
opted into by the Card stories (light, dark) and the LoginScreen stories
(mobile, desktop). The dark theme is the design system's opt-in
`data-theme="dark"` ([`theme-dark.css`](../packages/design-system/src/styles/theme-dark.css)).

## Storyline 4: The agent opened a PR

For **teams adopting AI coding agents for UI work**: a coding agent works
through the Billing backlog and opens PRs. It can discover components and run
story tests through Storybook's MCP server (`@storybook/addon-mcp`, already in
this Storybook); Chromatic is the check a person relies on before merging what
it wrote. Each chapter is a characteristic way agent output goes wrong.

| # | Level | Feature | The agent's PR | Customer outcome |
|---|-------|---------|----------------|------------------|
| 01 | L1 | **Visual regression testing** | "More room" between page buttons, using `--cc-space-7`, a token that does not exist. | When an agent's code looks fine but renders wrong, it's caught before anyone has to spot it. |
| 02 | L2 | **UI Review** | An `xl` Avatar size; the code is fine, the look is a human call. | A person still approves what users will see, as a required check on every agent PR. |
| 03 | L3 | **Accessibility regression testing** | Removes the PasswordInput toggle's `aria-label`; no pixel diff. | Accessibility holds up as agents refactor more of the codebase. |
| 04 | L3 | **UI Tests (interaction test)** | An off-by-one in a Pagination guard; no visual diff. | Agents can run the same tests CI runs, through Storybook's MCP server, and fix their own mistakes. |
| 05 | L4 | **TurboSnap (skipped build)** | Adds Pagination unit tests; 0 snapshots. | Agents can open as many PRs as they need; only the ones that change the UI use snapshots. |

What this storyline proves, and what a customer would measure:

- **Adopt coding agents without lowering the quality bar**: agent PRs reverted or hot-fixed after merge.
- **Reviewers spend their time on what users will see**: reviewer time per agent PR.
- **Agent volume does not inflate testing cost**: snapshots per agent PR.

## How chapters are built

Chapters **do not stack**: every PR is branched from `main` on its own, so each
diff contains exactly one change and shows exactly one feature. The story is in
the order and the narrative, not in the git history.

[`run.mjs`](../scripts/chromatic-demo/run.mjs), for each chapter:

1. closes the previous run's PR for that chapter and deletes its branch;
2. branches `demo/chromatic/<storyline>/<NN>-<chapter>` off `origin/main` and
   applies the chapter's change;
3. pushes it and opens a draft PR labeled `chromatic-demo`;
4. dispatches [`chromatic.yml`](../.github/workflows/chromatic.yml) on the
   branch.

The dispatch is needed because PRs opened with `GITHUB_TOKEN` never trigger
`pull_request` workflows. A dispatched run checks out the branch head, so the
**UI Tests** / **UI Review** statuses still land on the PR's commit. `ci.yml`
does not run on demo PRs, which keeps them quiet.

The interaction-test chapters depend on real play-function stories on `main`:
`TogglesFromLabel` in
[`Switch.stories.tsx`](../packages/design-system/src/components/Switch/Switch.stories.tsx),
`SwitchesOnClick` in
[`Tabs.stories.tsx`](../packages/design-system/src/components/Tabs/Tabs.stories.tsx)
and `NextToLastPage` in
[`Pagination.stories.tsx`](../packages/design-system/src/components/Pagination/Pagination.stories.tsx).

## Keeping it consistent

The demos are a shared team environment, so they are built to be identical for
every presenter, every week:

- **Rebuilt from `main` every Monday.** No hand-maintained demo branches; the
  scripted chapters are the only source.
- **One PR per chapter.** Each run closes the previous PR for a chapter before
  opening the new one, so links and the storyline tables never point at stale
  builds.
- **Breakage fails the PR that caused it.** CI's *Check Chromatic demo chapters
  still apply* step runs the dry run on every PR. If you moved text a chapter
  edits, update that chapter's `apply()` in the same PR.
- **Reset after presenting.** Re-run the workflow for the chapters you reviewed
  live, so the next presenter finds them untouched.

## Running it

- **Automatically:** every Monday 06:00 UTC, all storylines.
- **By hand:** Actions → **Chromatic demo** → *Run workflow*, with a storyline
  and optionally one chapter. This is useful for resetting a chapter after it was reviewed
  live. Or:

  ```bash
  gh workflow run chromatic-demo.yml -f storyline=design-handoff -f chapter=contrast-spec
  ```

- **Check the chapters still apply** after refactoring a component they touch:

  ```bash
  node scripts/chromatic-demo/run.mjs --dry-run
  ```

  This applies every chapter to a scratch worktree and prints the diff stats; a
  chapter whose anchor text has moved fails loudly. Update its `apply()` in
  [`scripts/chromatic-demo/chapters.mjs`](../scripts/chromatic-demo/chapters.mjs).

Accepting, denying or approving in Chromatic during a demo is fine. The next
run opens new PRs with new builds. **Never merge a demo PR**; they are drafts
for that reason.

## One-time setup

- **Chromatic account for each presenter** with access to this project, to
  sign in to the Visual tests panel in *Before you push*. Local builds from
  the panel use snapshots like any other build.
- **Chromatic project settings → Accessibility tests: on.** The accessibility
  chapters show nothing without it.
- **Chromatic project settings → Browsers: Chrome, Firefox, Safari, Edge** for
  the cross-browser part of *Figma to production* 06. This is project-wide: every
  snapshot of every build, not just the demos, is multiplied by the number of
  browsers. Budget for it, or enable extra browsers only ahead of a demo.
- **Chromatic project settings → UI Review: on**, with the GitHub app linked,
  so the UI Review chapters get a UI Review check and review tab.
- **Figma links** in `packages/design-system/src/figma/links.json` for Badge,
  so the Design tab in *Figma to production* 03 shows the frame (see
  [FIGMA.md](FIGMA.md)).
- **Repo Settings → Actions → General → "Allow GitHub Actions to create and
  approve pull requests": on**, or `gh pr create` fails in the workflow.
