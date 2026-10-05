#!/usr/bin/env node
// Opens the Chromatic demo storylines as draft PRs, one per chapter.
// Run by .github/workflows/chromatic-demo.yml; see docs/CHROMATIC-DEMO.md.
//
//   node scripts/chromatic-demo/run.mjs                        every storyline
//   node scripts/chromatic-demo/run.mjs --storyline design-handoff
//   node scripts/chromatic-demo/run.mjs --storyline design-system --chapter ui-test
//   node scripts/chromatic-demo/run.mjs --dry-run              apply the selected chapters
//                                                              to a scratch worktree of HEAD
//                                                              and print the diff; no pushes
//                                                              or GitHub calls
//
// For each chapter: close the previous demo PR, branch off origin/main, apply
// the change, push, open a draft PR labeled `chromatic-demo`, and dispatch
// chromatic.yml on the branch. The dispatch is needed because PRs opened with
// GITHUB_TOKEN never trigger pull_request workflows.

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { LEVELS, storylines } from './chapters.mjs';

const LABEL = 'chromatic-demo';
const BASE = 'main';

const { values: args } = parseArgs({
  options: {
    storyline: { type: 'string', default: 'all' },
    chapter: { type: 'string', default: 'all' },
    'dry-run': { type: 'boolean', default: false },
  },
});

// The storylines are meant to show Chromatic adoption from beginner to
// advanced, so a storyline whose levels go back down is a mistake.
for (const storyline of storylines) {
  storyline.chapters.forEach((chapter, i) => {
    if (!LEVELS[chapter.level] || !chapter.outcome) {
      throw new Error(`${storyline.slug}/${chapter.slug}: needs a level (1-4) and an outcome`);
    }
    const previous = storyline.chapters[i - 1];
    if (previous && chapter.level < previous.level) {
      throw new Error(`${storyline.slug}: ${chapter.slug} (L${chapter.level}) comes after ${previous.slug} (L${previous.level}); order chapters beginner to advanced`);
    }
  });
}

const levelLabel = (level) => `demo: L${level} ${LEVELS[level].name.toLowerCase()}`;
const LEVEL_COLORS = { 1: 'C5E8FF', 2: '8FD0FE', 3: '4FB6FD', 4: '1E7FC9' };

// Every chapter, with its storyline and its demo branch. The branch name is
// the chapter's identity across runs.
const pad = (n) => String(n).padStart(2, '0');
const all = storylines.flatMap((storyline) =>
  storyline.chapters.map((chapter, i) => ({
    storyline,
    chapter,
    number: pad(i + 1),
    branch: `demo/chromatic/${storyline.slug}/${pad(i + 1)}-${chapter.slug}`,
  })),
);

if (args.storyline === 'all' && args.chapter !== 'all') {
  console.error('--chapter needs --storyline.');
  process.exit(1);
}
const selected = all.filter(
  (e) =>
    (args.storyline === 'all' || e.storyline.slug === args.storyline) &&
    (args.chapter === 'all' || e.chapter.slug === args.chapter),
);
if (selected.length === 0) {
  console.error(`Nothing matches --storyline ${args.storyline} --chapter ${args.chapter}. Chapters:`);
  for (const e of all) console.error(`  --storyline ${e.storyline.slug} --chapter ${e.chapter.slug}`);
  process.exit(1);
}

const run = (cmd, cmdArgs, opts = {}) =>
  execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim();
const git = (...a) => run('git', a);
const gh = (...a) => run('gh', a);

const repoRoot = git('rev-parse', '--show-toplevel');
process.chdir(repoRoot);

if (args['dry-run']) {
  const dir = mkdtempSync(join(tmpdir(), 'chromatic-demo-'));
  git('worktree', 'add', '--detach', dir, 'HEAD');
  const failed = [];
  try {
    process.chdir(dir);
    for (const { storyline, chapter, number } of selected) {
      console.log(`\n=== ${storyline.slug} ${number} ${chapter.slug} (${chapter.feature}) ===`);
      try {
        chapter.apply();
        git('add', '-A');
        console.log(git('--no-pager', 'diff', '--cached', '--stat'));
      } catch (error) {
        console.log(`FAILED: ${error.message}`);
        failed.push(`${storyline.slug}/${chapter.slug}`);
      }
      git('reset', '--hard', '--quiet');
      git('clean', '-fdq');
    }
  } finally {
    process.chdir(repoRoot);
    git('worktree', 'remove', '--force', dir);
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} demo chapter(s) no longer apply: ${failed.join(', ')}`);
    console.error('This change moved text a Chromatic demo chapter edits. Update that chapter\'s apply()');
    console.error('in scripts/chromatic-demo/chapters.mjs to the new code (docs/CHROMATIC-DEMO.md).');
    process.exit(1);
  }
  process.exit(0);
}

if (git('status', '--porcelain')) {
  console.error('Working tree is not clean; commit or stash first.');
  process.exit(1);
}

const repoUrl = gh('repo', 'view', '--json', 'url', '--jq', '.url');

function ladder(level) {
  return Object.entries(LEVELS)
    .map(([n, l]) => (Number(n) === level ? `**L${n} ${l.name}**` : Number(n) < level ? `L${n} ${l.name}` : `_L${n} ${l.name}_`))
    .join(' → ');
}

function body(entry, prs) {
  const { storyline, chapter, number } = entry;
  const siblings = all.filter((e) => e.storyline === storyline);
  const nav = siblings
    .map((e) => {
      const here = e === entry;
      const link = prs.get(e.branch) ? `#${prs.get(e.branch)}` : '—';
      const feature = here ? `**${e.chapter.feature}**` : e.chapter.feature;
      return `| ${here ? '**▶**' : ''} | ${e.number} | L${e.chapter.level} | ${feature} | ${link} |`;
    })
    .join('\n');
  return `> [!NOTE]
> **Chromatic demo. Don't merge this PR.** It was opened by \`chromatic-demo.yml\`,
> and the next demo run closes it. See [docs/CHROMATIC-DEMO.md](${repoUrl}/blob/${BASE}/docs/CHROMATIC-DEMO.md).

**${storyline.title}** · Audience: ${storyline.audience}

## Chapter ${number} of ${pad(siblings.length)}: ${chapter.feature}

**Maturity:** ${ladder(chapter.level)}
${chapter.lens ? `\n_${chapter.lens}_\n` : ''}
${chapter.story}

### What to show

${chapter.show.map((s) => `- ${s}`).join('\n')}

### Customer outcome

${chapter.outcome}

### Chapters in this storyline, from beginner to advanced

|   | # | Level | Feature | PR |
|---|---|-------|---------|----|
${nav}

**Customer outcomes for this storyline:**

${storyline.outcomes.map((o) => `- **${o.outcome}**, measured by ${o.measure.charAt(0).toLowerCase()}${o.measure.slice(1)}`).join('\n')}
`;
}

gh('label', 'create', LABEL, '--force', '--color', 'FC521F', '--description', "Scripted Chromatic demo PR. Don't merge.");
for (const [level, { name, summary }] of Object.entries(LEVELS)) {
  // GitHub rejects label descriptions over 100 characters.
  const description = `${name}: ${summary}`;
  const clipped = description.length > 100 ? `${description.slice(0, 99)}…` : description;
  gh('label', 'create', levelLabel(level), '--force', '--color', LEVEL_COLORS[level], '--description', clipped);
}

// Close last run's PRs for the chapters being reopened, and delete their
// branches. Any other open demo PR stays, and the new PRs link to it.
const open = JSON.parse(gh('pr', 'list', '--label', LABEL, '--state', 'open', '--json', 'number,headRefName', '--limit', '100'));
const selectedBranches = new Set(selected.map((e) => e.branch));
const prs = new Map();
for (const pr of open) {
  if (selectedBranches.has(pr.headRefName)) {
    console.log(`Closing previous demo PR #${pr.number} (${pr.headRefName})`);
    gh('pr', 'close', String(pr.number), '--delete-branch', '--comment', 'Replaced by a newer Chromatic demo run.');
  } else {
    prs.set(pr.headRefName, pr.number);
  }
}

git('fetch', 'origin', BASE);
for (const entry of selected) {
  const { storyline, chapter, number, branch } = entry;
  console.log(`\n=== ${storyline.slug} ${number} ${chapter.slug} → ${branch}`);
  git('checkout', '-B', branch, `origin/${BASE}`);
  chapter.apply();
  git('add', '-A');
  git('commit', '-m', chapter.commit);
  git('push', '--force', 'origin', `HEAD:refs/heads/${branch}`);

  const url = gh(
    'pr', 'create', '--draft', '--base', BASE, '--head', branch,
    '--label', LABEL, '--label', levelLabel(chapter.level),
    '--title', `[Demo · ${storyline.title} ${number} · L${chapter.level}] ${chapter.title}`,
    '--body', body(entry, prs),
  );
  prs.set(branch, Number(url.split('/').pop()));
  console.log(url);

  gh('workflow', 'run', 'chromatic.yml', '--ref', branch);
}

// Each body was written before the later chapters had PR numbers; fill in the
// storyline tables now that they exist.
const touched = new Set(selected.map((e) => e.storyline));
for (const entry of all.filter((e) => touched.has(e.storyline) && prs.has(e.branch))) {
  gh('pr', 'edit', String(prs.get(entry.branch)), '--body', body(entry, prs));
}

git('checkout', '--detach', `origin/${BASE}`);
