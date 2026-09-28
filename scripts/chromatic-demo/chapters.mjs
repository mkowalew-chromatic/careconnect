// The Chromatic demo storylines. Each storyline is a sequence of chapters told
// to one audience:
//
//   local-storybook     "Before you push" — frontend developers running
//                       Storybook on their laptop: the same visual, a11y and
//                       interaction checks CI runs, before the PR exists.
//   design-system       "From first build to every PR" — platform and
//                       engineering leads: coverage, cost, what gets caught.
//   design-handoff      "Figma to production" — UX design and frontend teams
//                       shipping one feature together; every chapter has a
//                       designer's and an engineer's lens.
//   agentic-ui          "The agent opened a PR" — teams adopting AI coding
//                       agents for UI work; each chapter is an agent-authored
//                       PR and a characteristic way agent output goes wrong.
//
// Every chapter has a Chromatic maturity `level` (see LEVELS) and a customer
// `outcome`; each storyline has `outcomes` with what a customer would measure.
// A storyline's `order` climbs the levels from beginner to advanced, and
// run.mjs refuses one that goes back down.
//
// Each chapter is one small, realistic change that run.mjs commits to its own
// branch off main and opens as a draft PR. Chapters never stack — every PR is
// diffed against main alone, so each one shows exactly one Chromatic feature —
// but they are opened in order and cross-linked, so a presenter can walk
// through them as one story. See docs/CHROMATIC-DEMO.md.
//
// `apply` edits the working tree through replaceOnce/replaceAll, which throw
// when the text they expect is gone. If a chapter breaks after a refactor,
// update its anchors here; `node scripts/chromatic-demo/run.mjs --dry-run`
// checks every chapter without touching git.

import { readFileSync, writeFileSync } from 'node:fs';

function edit(file, transform) {
  const before = readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`${file}: edit changed nothing`);
  writeFileSync(file, after);
}

function replaceOnce(file, from, to) {
  edit(file, (text) => {
    const count = text.split(from).length - 1;
    if (count !== 1) {
      throw new Error(`${file}: expected exactly one match for ${JSON.stringify(from)}, found ${count}`);
    }
    return text.split(from).join(to);
  });
}

function replaceAll(file, from, to) {
  edit(file, (text) => {
    if (!text.includes(from)) throw new Error(`${file}: no match for ${JSON.stringify(from)}`);
    return text.split(from).join(to);
  });
}

const DS = 'packages/design-system/src/components';

// The Chromatic maturity ladder the storylines climb, beginner to advanced.
export const LEVELS = {
  1: { name: 'Catch changes', summary: 'Visual tests on every PR against an accepted baseline' },
  2: { name: 'Review together', summary: 'Design and product sign off in UI Review, as a PR check' },
  3: { name: 'Test behavior', summary: 'Accessibility and interaction tests on the same stories' },
  4: { name: 'Scale', summary: 'Themes, viewports and browsers; TurboSnap; required on every PR; agents at volume' },
};

// "Before you push": a frontend developer checks out the branch and runs
// Storybook locally. Every chapter is still a PR (so the CI check tells the
// same story), but the demo happens in Storybook on the presenter's laptop.
const localStorybook = [
  {
    slug: 'local-visual-test',
    feature: 'Visual Tests addon',
    level: 1,
    outcome: "Developers see every visual change a component edit causes before they push, not after CI reports it.",
    lens: 'Local Storybook · before the PR',
    title: 'Input: thicker field borders for the intake forms',
    commit: 'Use a 2px border on text inputs',
    story: `Front-desk staff say form fields are hard to see on the intake
tablets, so a developer thickens the Input border. They check the Input page in
Storybook and it looks right, but Input is used by DatePicker, LoginScreen and
the filter bars too.`,
    show: [
      "Check out the branch (`gh pr checkout <this PR>`), run `npm run storybook` and open http://localhost:6006.",
      "Open the **Visual tests** panel (Chromatic's Storybook addon), sign in once, and click **Run tests**. It builds the local Storybook in the cloud and compares it with the baselines from `main`.",
      "The sidebar marks every story that changed: Input, and every component that uses it. Open one and toggle the diff, all without leaving Storybook.",
      "The **UI Tests** check on this PR shows the same changes, so what you saw locally is what CI reports.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Input/Input.css`,
        'border: 1px solid var(--cc-border);\n  border-radius: var(--cc-radius-md);\n  transition:',
        'border: 2px solid var(--cc-border);\n  border-radius: var(--cc-radius-md);\n  transition:',
      );
    },
  },
  {
    slug: 'local-a11y',
    feature: 'Accessibility panel and Vitest addon',
    level: 3,
    outcome: "Accessibility problems are fixed while the developer is still working on the component, at no extra cost.",
    lens: 'Local Storybook · as you edit',
    title: 'Textarea: soften the hint text',
    commit: 'Soften the Textarea hint color',
    story: `A developer lightens the hint under the Assessment & Plan field so it
competes less with what the clinician types. It looks calmer, and the new grey
fails contrast on white.`,
    show: [
      "In local Storybook, open **Textarea**. The **Accessibility** panel flags a **color-contrast** violation and highlights the hint text in the canvas.",
      "Open the **Testing** widget at the bottom of the sidebar and run the component tests with accessibility on. Vitest runs every story in a real browser and lists the same violation. It's reported, not failing, because `a11y.test` is `'todo'` in `.storybook/preview.ts`.",
      "`npm run test:stories` runs the same tests from the terminal, and the PR's Chromatic build shows it in its **Accessibility** tab.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Textarea/Textarea.css`,
        '.cc-textarea__hint { font-size: var(--cc-text-xs); color: var(--cc-text-muted); }',
        '.cc-textarea__hint { font-size: var(--cc-text-xs); color: #B8C2CC; }',
      );
    },
  },
  {
    slug: 'local-interaction-test',
    feature: 'Interaction tests (Testing widget)',
    level: 3,
    outcome: "Developers catch broken behavior in seconds on their own machine, with the same tests CI runs.",
    lens: 'Local Storybook · no visual diff',
    title: 'Switch: namespace input ids to avoid collisions',
    commit: 'Prefix Switch input ids to avoid collisions',
    story: `The claims form has two switches with the same label, so their
generated ids collide. The developer prefixes the input id, but forgets the
label's htmlFor. The Switch looks exactly the same, and clicking its label no
longer toggles it.`,
    show: [
      "In local Storybook, open `Switch / Toggles From Label`. The **Interactions** panel shows the play function failing: the switch can't be found by its label any more.",
      "Step back and forward through the interaction to show where it breaks. Fix the id in the editor and the story re-runs on save.",
      "Run **all** component tests from the **Testing** widget, or `npm run test:stories` in a terminal. The PR's **UI Tests** check fails on the same story, with no visual changes.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Switch/Switch.tsx`,
        '<input id={inputId} type="checkbox"',
        '<input id={`cc-switch-${inputId}`} type="checkbox"',
      );
    },
  },
  {
    slug: 'local-modes',
    feature: 'Modes in the Visual Tests addon',
    level: 4,
    outcome: "Developers check every theme before pushing without switching themes story by story.",
    lens: 'Local Storybook · every theme at once',
    title: 'Dark theme: flatten elevated surfaces',
    commit: 'Match dark-theme elevated surfaces to the page background',
    story: `A developer flattens the dark theme so elevated surfaces use the page
background. In the light theme, which is what Storybook shows by default,
nothing changes. In the dark theme, cards no longer stand out from the page.`,
    show: [
      "In local Storybook, the Card stories look unchanged. Switch the toolbar theme to **dark** to see the problem by hand, one story at a time.",
      "Instead, click **Run tests** in the **Visual tests** panel. The Card stories are captured in both **light** and **dark** modes (`chromatic.modes`), and only the dark snapshots changed.",
      "The PR's Chromatic build shows the same mode diffs, and in every browser enabled for the project.",
    ],
    apply() {
      replaceOnce('packages/design-system/src/styles/theme-dark.css', '--cc-bg-elevated: #17212B;', '--cc-bg-elevated: #0F1720;');
    },
  },
];

const designSystem = [
  {
    slug: 'turbosnap-skip',
    feature: 'TurboSnap (skipped build)',
    level: 4,
    outcome: "Chromatic can be a required check on every PR, and PRs that don't touch the UI don't use any snapshots.",
    title: 'API: name the missing resource in appointment 404s',
    commit: 'Name the missing resource in appointment 404 responses',
    story: `The backend team changes an API error message so appointment 404s say
what wasn't found. Chromatic runs on every PR in this repo because it has no
path filter, which lets it be a required check. Nothing in this change is used
by any story.`,
    show: [
      "The **UI Tests** check passes without anyone opening Chromatic.",
      "In the build, TurboSnap found no affected stories and captured **0 snapshots**. Every story carries over from the baseline, so the build costs nothing.",
      "With a path filter, this PR would never get the required check and would stay blocked.",
    ],
    apply() {
      replaceAll('apps/api/src/routes/appointments.ts', "{ error: 'Not found' }", "{ error: 'Appointment not found' }");
    },
  },
  {
    slug: 'turbosnap',
    feature: 'TurboSnap',
    level: 4,
    outcome: "Snapshot usage grows with the size of each change, not with the size of the library.",
    title: 'Divider: open up labeled-divider letter spacing',
    commit: 'Open up the letter spacing of labeled dividers',
    story: `A designer asks for more letter spacing in the uppercase labels on
section dividers. It's a one-line CSS change in one component.`,
    show: [
      "TurboSnap traced the changed CSS file to the stories that use it. Only the **Divider** stories were captured, and the rest were skipped.",
      "Point out the snapshot count in the build (\"N of M captured\"). That's what this PR costs in snapshots.",
      "Accept the change, since it was intended.",
    ],
    apply() {
      replaceOnce(`${DS}/Divider/Divider.css`, 'letter-spacing: 0.04em;', 'letter-spacing: 0.1em;');
    },
  },
  {
    slug: 'visual-regression',
    feature: 'Visual regression testing',
    level: 1,
    outcome: "A bad change to a shared component gets caught once, before it reaches every app that uses it.",
    title: 'Button: tighten medium-size padding',
    commit: 'Tighten medium button padding',
    story: `While tidying up button sizes, a developer reduces the padding on the
default (md) Button so it matches the compact tables. It looks fine on the
Button page they were working on, but Button is used in most other components.`,
    show: [
      "The **UI Tests** check reports changes on Button and on every component that uses it, including Alert, Modal, PageHeader, LoginScreen and the Encounter workspace.",
      "Open one of the diffs with the diff overlay. The cause is a single line of CSS.",
      "**Deny** the changes. This is the kind of regression Chromatic should catch before it reaches the EHR and Portal.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Button/Button.css`,
        '.cc-button--md {\n  padding: var(--cc-space-2) var(--cc-space-4);',
        '.cc-button--md {\n  padding: var(--cc-space-1) var(--cc-space-2);',
      );
    },
  },
  {
    slug: 'accessibility-regression',
    feature: 'Accessibility regression testing',
    level: 3,
    outcome: "New accessibility problems get caught on the PR that introduces them, even while an older backlog still exists.",
    title: 'Badge: soften the cancelled / error red',
    commit: 'Soften the cancelled badge red on the schedule',
    story: `Front-desk staff say the schedule looks alarming on days with a lot of
cancellations, so a developer makes the red on the Cancelled badge lighter.
The visual change is small and looks intentional, so a reviewer would probably
accept it.`,
    show: [
      "The build's **Accessibility** tab shows a new **color-contrast** violation on the Cancelled and Appointment Statuses stories. The new red on the pink background is about 2.1:1, well below the 4.5:1 WCAG AA minimum.",
      "Chromatic compares accessibility results to the baseline, so it reports this new violation and leaves out the ones that already existed.",
      "A reviewer looking only at the visual diff would likely have approved this.",
    ],
    apply() {
      replaceOnce(`${DS}/Badge/Badge.css`, 'background: #FDECEA;\n  color: var(--cc-error);', 'background: #FDECEA;\n  color: #F28B82;');
    },
  },
  {
    slug: 'ui-test',
    feature: 'UI Tests (interaction test)',
    level: 3,
    outcome: "Bugs that don't change how the UI looks still get caught, using the same stories and the same check.",
    title: 'Switch: stop label clicks from bubbling into table rows',
    commit: 'Stop switch label clicks from reaching the enclosing row',
    story: `The Billing team reports that clicking a Switch inside a clickable table
row also opens the row. The fix should have used stopPropagation(), but it uses
preventDefault() instead. The Switch looks exactly the same as before.`,
    show: [
      "There are **no visual changes**. The snapshots are identical.",
      "The **UI Tests** check still fails. The play function in `Switch / Toggles From Label` clicks the label and expects the switch to turn on, and it doesn't.",
      "Open the failed interaction in the build to step through it. The same test also runs in Storybook and in `npm run test:stories`.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Switch/Switch.tsx`,
        "<label htmlFor={inputId} className={clsx('cc-switch', className)}>",
        "<label htmlFor={inputId} className={clsx('cc-switch', className)} onClick={(event) => event.preventDefault()}>",
      );
    },
  },
  {
    slug: 'ui-review',
    feature: 'UI Review',
    level: 2,
    outcome: "Designers sign off before merge, so fewer UI fixes turn into follow-up tickets after release.",
    title: 'Button: add an outline variant for secondary billing actions',
    commit: 'Add an outline Button variant',
    story: `The Billing screens need a less prominent secondary action, so the
design-system team adds an outline Button variant. This change is intended, so
the question is whether it looks right, not whether something broke.`,
    show: [
      "Open the PR in Chromatic's **UI Review** tab. The new Outline story and the updated All Variants story are shown next to main.",
      "Assign a designer and a developer as reviewers. Leave a comment about the border contrast on the new variant, then resolve it.",
      "Approve. The **UI Review** check on the PR turns green.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Button/Button.tsx`,
        "export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';",
        "export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';",
      );
      replaceOnce(
        `${DS}/Button/Button.css`,
        '.cc-button--ghost {',
        `.cc-button--outline {
  background: transparent;
  color: var(--cc-primary);
  box-shadow: inset 0 0 0 1px var(--cc-primary);
}

.cc-button--outline:hover:not(:disabled) {
  background: var(--cc-primary-subtle);
}

.cc-button--ghost {`,
      );
      const stories = `${DS}/Button/Button.stories.tsx`;
      replaceOnce(stories, "options: ['primary', 'secondary', 'ghost',", "options: ['primary', 'secondary', 'outline', 'ghost',");
      replaceOnce(
        stories,
        'export const Ghost: Story = {',
        `export const Outline: Story = {
  args: { children: 'Export Claims', variant: 'outline' },
};

export const Ghost: Story = {`,
      );
      replaceOnce(
        stories,
        '<Button variant="secondary">Secondary</Button>\n',
        '<Button variant="secondary">Secondary</Button>\n      <Button variant="outline">Outline</Button>\n',
      );
    },
  },
];

// "Figma to production": the Billing team builds a Claims screen. Every chapter
// is still its own PR off main; `lens` says whose problem it is.
const designHandoff = [
  {
    slug: 'design-sign-off',
    feature: 'UI Review',
    level: 2,
    outcome: "Designers approve the real component before merge instead of reviewing screenshots after release.",
    lens: 'Frontend builds · UX signs off',
    title: 'Badge: add the telehealth status from the Claims screen spec',
    commit: 'Add a telehealth Badge variant',
    story: `The Claims screen design in Figma adds a Telehealth status badge. A
frontend engineer builds it as a new Badge variant. Before it merges, the
designer needs to check that it matches, without checking out the branch or
running Storybook.`,
    show: [
      "**Frontend:** the PR has a **UI Review** check, and the new variant is already a Storybook story, so there's no need to paste screenshots into the PR.",
      "**UX design:** open UI Review, select the Telehealth story, and open its **Design** tab to compare it with the Figma frame.",
      "Comment on the badge padding, reply as the engineer, resolve the comment, and approve.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Badge/Badge.tsx`,
        "'prebooked' | 'in-office' | 'completed' | 'cancelled';",
        "'prebooked' | 'in-office' | 'completed' | 'cancelled' | 'telehealth';",
      );
      edit(`${DS}/Badge/Badge.css`, (css) => `${css.trimEnd()}\n.cc-badge--telehealth { background: #E6F4FA; color: #0B5F85; }\n`);
      const stories = `${DS}/Badge/Badge.stories.tsx`;
      replaceOnce(
        stories,
        "export const Cancelled: Story = { args: { children: 'Cancelled', variant: 'cancelled' } };",
        "export const Cancelled: Story = { args: { children: 'Cancelled', variant: 'cancelled' } };\nexport const Telehealth: Story = { args: { children: 'Telehealth', variant: 'telehealth', dot: true } };",
      );
      replaceOnce(
        stories,
        '<Badge variant="cancelled">Cancelled</Badge>\n',
        '<Badge variant="cancelled">Cancelled</Badge>\n      <Badge variant="telehealth" dot>Telehealth</Badge>\n',
      );
    },
  },
  {
    slug: 'design-drift',
    feature: 'Visual regression testing',
    level: 1,
    outcome: "Differences from the design show up on the PR that caused them, instead of in production.",
    lens: 'Frontend changes · UX notices',
    title: 'Card: tighten medium padding to fit the claims grid',
    commit: 'Tighten medium Card padding for denser dashboards',
    story: `To fit four claim summary cards in a row, a frontend engineer reduces
the md Card padding in the shared component instead of in the Claims screen.
The Claims screen now looks right, but every other screen with a Card no longer
matches Figma, and no designer reviewed the PR.`,
    show: [
      "**Frontend:** the Card stories changed, and so did the Encounter workspace. You can see everywhere a shared-component change lands before you merge it.",
      "**UX design:** the difference from the design shows up on this PR, so nobody has to find it later by comparing production to Figma.",
      "**Deny** the change and suggest adjusting the Claims screen layout instead.",
    ],
    apply() {
      replaceOnce(`${DS}/Card/Card.css`, '.cc-card--padding-md { padding: var(--cc-space-4); }', '.cc-card--padding-md { padding: var(--cc-space-2); }');
    },
  },
  {
    slug: 'lost-focus-state',
    feature: 'Visual regression testing (interaction states)',
    level: 1,
    outcome: "States like focus and hover stay the way they were designed, without anyone checking them by hand.",
    lens: 'Frontend changes · UX notices',
    title: 'Checkbox: drop the focus ring that flashes on click',
    commit: 'Remove the checkbox focus ring',
    story: `Someone reports that the checkbox shows a blue ring when they click it, so
a frontend engineer removes the focus ring. The default state doesn't change,
but keyboard users can no longer see which checkbox they're on in the claims
form.`,
    show: [
      "**UX design:** the Checkbox **Focus** story, which uses the pseudo-states addon to show the focused state, no longer has a ring.",
      "**Frontend:** any state that has a story (hover, focus, disabled, loading) gets a snapshot, so changes to those states show up on the PR.",
      "The rule already used `:focus-visible`, so the ring only appeared for keyboard focus. Deny the change.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Checkbox/Checkbox.css`,
        'outline: 2px solid var(--cc-primary-light);\n  outline-offset: 2px;',
        'outline: none;',
      );
    },
  },
  {
    slug: 'dark-mode-literal',
    feature: 'Modes (light and dark themes, across browsers)',
    level: 4,
    outcome: "Each theme and browser gets checked on every PR, without a manual QA pass for each combination.",
    lens: 'Frontend changes · UX notices',
    title: 'Card: match the Claims spec title color',
    commit: 'Set the Card title color from the Claims spec',
    story: `The engineer copies the card title color from the Figma file as a hex
value instead of using the token. In light mode nothing changes. In dark mode,
every card title is dark grey on a dark background.`,
    show: [
      "**UX design:** every Card story is captured in both themes (`chromatic.modes`). The light snapshots are unchanged, and in the dark snapshots the titles are barely visible.",
      "**Frontend:** if more browsers are enabled for the project, each theme is also captured in Chrome, Firefox, Safari and Edge. Switch browsers in the build to show the same diff in each.",
      "Deny. The fix is to use `var(--cc-text)`, which is what makes the component follow the theme.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Card/Card.css`,
        '.cc-card__title {\n  margin: 0;\n  font-size: var(--cc-text-lg);\n  font-weight: 600;\n  color: var(--cc-text);',
        '.cc-card__title {\n  margin: 0;\n  font-size: var(--cc-text-lg);\n  font-weight: 600;\n  color: #1A2332;',
      );
    },
  },
  {
    slug: 'mobile-breakpoint',
    feature: 'Modes (viewports)',
    level: 4,
    outcome: "Layouts get checked at each designed screen size on every PR.",
    lens: 'Frontend changes · UX notices',
    title: 'LoginScreen: keep the trust stats on one row on phones',
    commit: 'Keep the LoginScreen stats on one row on small screens',
    story: `Marketing wants the three stats on the login screen to stay side by side
on phones, so the engineer changes the small-screen rule. Nothing changes on
the desktop screen they tested on. On a 375px phone, the stats are squeezed
into three narrow columns.`,
    show: [
      "**UX design:** the LoginScreen stories are captured at mobile and desktop widths. The desktop snapshots are unchanged, and the mobile snapshots show the squeezed stats.",
      "**Frontend:** every breakpoint in the design is checked on every PR, without anyone resizing a browser.",
      "Deny. The design calls for one column on phones.",
    ],
    apply() {
      replaceOnce(
        `${DS}/LoginScreen/LoginScreen.css`,
        '@media (max-width: 480px) {\n  .cc-login-screen__stats {\n    grid-template-columns: 1fr;',
        '@media (max-width: 480px) {\n  .cc-login-screen__stats {\n    grid-template-columns: repeat(3, 1fr);',
      );
    },
  },
  {
    slug: 'contrast-spec',
    feature: 'Accessibility regression testing',
    level: 3,
    outcome: "Accessibility problems in a design get found before engineers spend time building them.",
    lens: 'UX changes · both catch it',
    title: 'Tabs: quieter inactive tab labels per the new spec',
    commit: 'Lighten inactive tab labels to match the Claims spec',
    story: `This change comes from design. The Claims spec calls for lighter inactive
tab labels, and the engineer builds it exactly as specified. It matches Figma,
and it fails contrast.`,
    show: [
      "**UX design:** matching Figma doesn't guarantee accessibility. The build's **Accessibility** tab shows new **color-contrast** violations on every Tabs story.",
      "**Frontend:** the violations are compared to the baseline, so only the new ones appear and they can be fixed on this PR.",
      "Send it back to design. The fix belongs in the Figma spec and the token.",
    ],
    apply() {
      replaceOnce(`${DS}/Tabs/Tabs.css`, 'font-weight: 500;\n  color: var(--cc-text-secondary);', 'font-weight: 500;\n  color: #B4BDC9;');
    },
  },
  {
    slug: 'looks-right-broken',
    feature: 'UI Tests (interaction test)',
    level: 3,
    outcome: "Broken behavior gets caught even when the screen looks exactly like the design.",
    lens: 'Frontend changes · tests catch it',
    title: 'Tabs: skip redundant onChange calls for the active tab',
    commit: 'Skip onChange when the active tab is clicked again',
    story: `To avoid refetching claims when someone clicks the tab that's already
active, the engineer adds a check before calling onChange. The condition is
reversed. The tabs look exactly as designed, but none of them can be selected.`,
    show: [
      "**UX design:** there are no visual changes. A screenshot review would pass this.",
      "**Frontend:** the **UI Tests** check fails on `Tabs / Switches On Click`. The play function clicks \"Completed\" and the tab never becomes selected.",
      "Step through the failed interaction in the build. The same test also runs in Storybook and in `npm run test:stories`.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Tabs/Tabs.tsx`,
        'onClick={() => onChange(tab.id)}',
        'onClick={() => activeTab !== tab.id || onChange(tab.id)}',
      );
    },
  },
];

// "The agent opened a PR": a coding agent works through the Billing backlog.
// It can read the component library and run story tests through Storybook's
// MCP server (@storybook/addon-mcp); Chromatic is the check a human relies on
// before merging what it wrote.
const agenticUi = [
  {
    slug: 'agent-adds-tests',
    feature: 'TurboSnap (skipped build)',
    level: 4,
    outcome: "Agents can open as many PRs as they need; only the ones that change the UI use snapshots.",
    lens: 'Agent PR · no UI touched',
    title: 'Pagination: add unit tests for page clamping',
    commit: 'Add Pagination unit tests',
    story: `The ticket says Pagination has no unit tests, so the agent writes some.
Agents open a lot more PRs than people, and most of them don't change anything
users see. Chromatic still runs on all of them.`,
    show: [
      "TurboSnap found that no story uses the test file, so the build captured **0 snapshots** and the check passed.",
      "More agent PRs don't mean more snapshots. Snapshot usage depends on how much UI the agent actually changes.",
    ],
    apply() {
      writeFileSync(
        `${DS}/Pagination/Pagination.test.tsx`,
        `import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Pagination } from './Pagination';

test('disables Previous on the first page', () => {
  render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous' }).disabled).toBe(true);
});

test('requests the next page', () => {
  const onPageChange = vi.fn();
  render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(onPageChange).toHaveBeenCalledWith(3);
});
`,
      );
    },
  },
  {
    slug: 'hallucinated-token',
    feature: 'Visual regression testing',
    level: 1,
    outcome: "When an agent's code looks fine but renders wrong, it's caught before anyone has to spot it.",
    lens: 'Agent PR · plausible code, wrong result',
    title: 'Pagination: give page buttons more breathing room',
    commit: 'Increase spacing between pagination page buttons',
    story: `The ticket says the page numbers feel cramped. The agent follows the
token naming pattern and uses --cc-space-7, which doesn't exist. The CSS is
valid and the diff looks reasonable, but the browser ignores the value and the
gap drops to zero, the opposite of what the ticket asked for.`,
    show: [
      "The diff on GitHub looks like a normal token change. Only the rendered result shows that it made things worse.",
      "Chromatic shows the page buttons touching, in Pagination and anywhere it's used.",
      "Deny, and give the snapshot back to the agent so it can see the problem and try again.",
    ],
    apply() {
      replaceOnce(`${DS}/Pagination/Pagination.css`, '.cc-pagination__pages { display: flex; gap: var(--cc-space-1); }', '.cc-pagination__pages { display: flex; gap: var(--cc-space-7); }');
    },
  },
  {
    slug: 'agent-drops-label',
    feature: 'Accessibility regression testing',
    level: 3,
    outcome: "Accessibility holds up as agents refactor more of the codebase.",
    lens: 'Agent PR · zero pixel diff',
    title: 'PasswordInput: remove redundant toggle attributes',
    commit: 'Remove redundant attributes from the password visibility toggle',
    story: `The ticket asks the agent to clean up PasswordInput. It sees that the
icon already has aria-hidden, decides the button's aria-label is redundant, and
removes it. Nothing changes on screen, but screen reader users now hear an
unlabeled button on the login page.`,
    show: [
      "There are no visual changes, so a visual review would pass this.",
      "The **Accessibility** tab shows a new **button-name** violation on the LoginScreen stories.",
      "Cleanup refactors that remove unused attributes are a common place for accessibility attributes to disappear.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Input/PasswordInput.tsx`,
        "          aria-label={visible ? 'Hide password' : 'Show password'}\n",
        '',
      );
    },
  },
  {
    slug: 'agent-off-by-one',
    feature: 'UI Tests (interaction test)',
    level: 3,
    outcome: "Agents can run the same tests CI runs, through Storybook's MCP server, and fix their own mistakes.",
    lens: 'Agent PR · confident and wrong',
    title: 'Pagination: guard Next against overflowing the last page',
    commit: 'Guard Pagination Next against overflowing the last page',
    story: `The ticket says Next can go past the last page. The agent adds a check
and explains it clearly, but the check is off by one. On page 7 of 8, Next no
longer does anything, and the button still looks enabled.`,
    show: [
      "There are no visual changes. The Next button isn't disabled; it just stops working on the second-to-last page.",
      "The **UI Tests** check fails on `Pagination / Next To Last Page`.",
      "The agent can run the same play function through Storybook's MCP server, so it could have caught this before opening the PR and can use it now to fix it.",
    ],
    apply() {
      replaceOnce(
        `${DS}/Pagination/Pagination.tsx`,
        'onClick={() => onPageChange(page + 1)}',
        'onClick={() => page < totalPages - 1 && onPageChange(page + 1)}',
      );
    },
  },
  {
    slug: 'agent-new-size',
    feature: 'UI Review',
    level: 2,
    outcome: "A person still approves what users will see, as a required check on every agent PR.",
    lens: 'Agent PR · human signs off',
    title: 'Avatar: add an xl size for the patient banner',
    commit: 'Add an xl Avatar size',
    story: `The ticket asks for a bigger avatar in the patient banner. The agent
adds an xl size and a story for it, and nothing else. The code is fine. Whether
the proportions and initials size look right is a decision for a person.`,
    show: [
      "Open **UI Review**. The new Extra Large story is waiting for a reviewer, like any other PR.",
      "Comment on the initials size, then approve. The agent can't approve its own UI Review, so a person always signs off.",
      "The agent writes the change, and people decide whether it ships.",
    ],
    apply() {
      replaceAll(`${DS}/Avatar/Avatar.tsx`, "size?: 'sm' | 'md' | 'lg'", "size?: 'sm' | 'md' | 'lg' | 'xl'");
      edit(`${DS}/Avatar/Avatar.css`, (css) => `${css.trimEnd()}\n\n.cc-avatar--xl {\n  width: 64px;\n  height: 64px;\n  font-size: var(--cc-text-lg);\n}\n`);
      replaceOnce(
        `${DS}/Avatar/Avatar.stories.tsx`,
        "export const Large: Story = { args: { name: 'Bob Johnson', size: 'lg' } };",
        "export const Large: Story = { args: { name: 'Bob Johnson', size: 'lg' } };\nexport const ExtraLarge: Story = { args: { name: 'Carmen Ortiz', size: 'xl' } };",
      );
    },
  },
];

const inOrder = (chapters, slugs) => {
  const bySlug = new Map(chapters.map((c) => [c.slug, c]));
  if (slugs.length !== chapters.length || slugs.some((slug) => !bySlug.has(slug))) {
    throw new Error(`storyline order must list every chapter once: ${slugs.join(', ')}`);
  }
  return slugs.map((slug) => bySlug.get(slug));
};

export const storylines = [
  {
    slug: 'local-storybook',
    title: 'Before you push',
    audience: 'Frontend developers running Storybook locally',
    outcomes: [
      { outcome: 'Problems are found before the PR is opened', measure: 'PRs whose first Chromatic build has unexpected changes' },
      { outcome: 'Less waiting on CI to learn what changed', measure: 'Time from first push to a green UI Tests check' },
      { outcome: 'One set of stories covers visual, accessibility and behavior', measure: 'Components with play functions and passing accessibility checks' },
    ],
    chapters: inOrder(localStorybook, [
      'local-visual-test', 'local-a11y', 'local-interaction-test', 'local-modes',
    ]),
  },
  {
    slug: 'design-system',
    title: 'From first build to every PR',
    audience: 'Platform and engineering leads',
    outcomes: [
      { outcome: 'Fewer UI regressions reach the apps', measure: 'UI defects reported after release in the consuming apps' },
      { outcome: 'Design and engineering agree before merge', measure: 'UI rework tickets opened after release' },
      { outcome: 'Coverage grows while testing cost stays predictable', measure: 'Snapshots per PR, and the share of PRs that capture none' },
    ],
    chapters: inOrder(designSystem, [
      'visual-regression', 'ui-review', 'accessibility-regression', 'ui-test', 'turbosnap', 'turbosnap-skip',
    ]),
  },
  {
    slug: 'design-handoff',
    title: 'Figma to production',
    audience: 'UX design and frontend teams',
    outcomes: [
      { outcome: 'What ships matches what was designed', measure: 'Design QA issues found after release' },
      { outcome: 'Fewer review rounds between design and engineering', measure: 'Design feedback rounds per feature' },
      { outcome: 'Themes, screen sizes and browsers checked without manual QA', measure: 'Manual QA hours per release' },
    ],
    chapters: inOrder(designHandoff, [
      'design-drift', 'lost-focus-state', 'design-sign-off', 'contrast-spec', 'looks-right-broken', 'dark-mode-literal', 'mobile-breakpoint',
    ]),
  },
  {
    slug: 'agentic-ui',
    title: 'The agent opened a PR',
    audience: 'Teams adopting AI coding agents for UI work',
    outcomes: [
      { outcome: 'Adopt coding agents without lowering the quality bar', measure: 'Agent PRs reverted or hot-fixed after merge' },
      { outcome: 'Reviewers spend their time on what users will see', measure: 'Reviewer time per agent PR' },
      { outcome: 'Agent volume does not inflate testing cost', measure: 'Snapshots per agent PR' },
    ],
    chapters: inOrder(agenticUi, [
      'hallucinated-token', 'agent-new-size', 'agent-drops-label', 'agent-off-by-one', 'agent-adds-tests',
    ]),
  },
];
