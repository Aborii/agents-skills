---
name: issues-to-prs
description: >-
  End-to-end pipeline that turns a list of issues or bugs into researched GitHub
  issues and then into reviewed, self-corrected pull requests — one stacked worktree
  branch per item. Use this whenever the user hands over multiple issues or bugs at
  once and wants them taken all the way through, e.g. "here's a list of issues/bugs,
  fix them all", "create issues and PRs for these", "research, file, and fix these",
  "go through these one by one and open PRs". For each item it searches the codebase
  for the root cause and candidate fixes, opens a `gh` issue, then in a stacked git
  worktree branch implements and verifies the fix, opens a PR to the integration
  branch (dev), self-reviews it with inline comments, applies the fixes, replies, and
  resolves the threads — repeating until every item is done. Always works on a
  dedicated worktree branch, never the main checkout, unless told otherwise. Trigger
  even when the user only says "issues" or "bugs" and "PRs" without naming this
  workflow.
---

# issues-to-prs

Turn a **list of bugs** into a chain of **researched issues → fixed, self-reviewed PRs**,
fully automated. This is the project's existing *feature-from-issue* workflow generalized to
a batch of bugs, with two extra front-end steps (research + file the issue) and a stacked
branch model.

Run the whole thing end to end. Don't stop between bugs to ask for confirmation unless a step
is genuinely blocked or needs a real decision (an ambiguous repro, a destructive migration, a
fix that changes a public contract).

## Inputs & the two phases

The user gives you a free-text list of bugs (numbered, bulleted, or prose). Split it into
discrete bug items first. Then run two phases:

- **Phase 1 — Research & file.** For *every* bug: investigate, then open one GitHub issue.
  Do this for all bugs before touching code, so the user has the full issue list up front.
- **Phase 2 — Solve.** Loop over the issues **in order**. Each gets its own stacked worktree
  branch, a PR to `dev`, a self-review, and a fix-and-resolve pass — then move to the next.

## Operating rules (read once, apply throughout)

- **NEVER work in the main checkout — always use a dedicated worktree on its own branch.**
  Every code change in this workflow happens inside a git worktree created for that bug's
  branch (`git worktree add ../<repo>-<slug> -b fix/<slug> <prev>`), never in the user's main
  repo folder and never directly on `dev`/`main`. Do not edit, commit, or run gates against the
  main checkout's working tree. The **only** exception is when the user *explicitly* tells you to
  work in the main folder for a given run; absent that explicit instruction, default to a
  worktree branch every time, no matter how small the fix looks.
- **Honor the repo's conventions over anything here.** Before starting, read the repo's
  `CLAUDE.md` and your saved memory for: the integration/base branch, the exact verification
  gates (typecheck / test / build / lint script names), lint-and-format policy, pre/post-commit
  and pre-push hooks, known-failing baseline tests, and any contract-sync steps. Those are
  authoritative; the commands below are the shape, not the gospel.
- **Base branch = `dev`.** Every PR targets `dev` (confirm with `gh repo view`). If a repo
  has no `dev`, fall back to its default branch and tell the user.
- **Signed commits.** Every commit *you* make is signed with the passphraseless key per the
  user's global git-signing rule (`git -c user.signingkey=... commit`). Never change repo or
  global git config to do it. The user's own manual commits keep their default key.
- **Verify before every commit.** Run the project's gates and make them pass. Never let tests
  hit the network. Maintain the project's coverage bar. A red baseline test that your change
  didn't touch is not your bug — note it and move on, don't "fix" unrelated suites.
- **The issue's "Fix" is a *hypothesis*, never a spec — re-derive it at implementation time.**
  Treat any fix, root cause, file:line, or code snippet in the issue body (whether you or
  someone else wrote it, and even one *this skill* filed in Phase 1) as a starting suggestion
  only. It may be stale, partial, or wrong: the code moves, the line numbers drift, and the
  original analysis may have missed the real cause. Before you write code, **independently
  re-investigate the live codebase** — confirm the symptom still reproduces, read the actual
  code paths *now*, and decide the correct fix from what you find, not from what the issue
  claims. If your investigation contradicts the issue (different root cause, the bug is already
  fixed, the suggested fix would break something, or the line references no longer match), trust
  your fresh findings: implement what's actually correct and **say so in the PR and the issue
  comment**, noting where you diverged from the issue's suggestion and why. The issue points you
  at *roughly where to look*; your at-the-keyboard investigation decides *what to do*.
- **One bug = one issue = one branch = one PR.** Keep each PR's *own* changes scoped to a
  single bug, even though stacked diffs look cumulative (see below).
- **Always link the fix back onto the issue — as a comment.** Whenever you work an issue
  (fixing it, or finding it already fixed), post a **comment** on the issue with a short blurb
  about the fix + a link to the delivering **PR** (or commit). Don't edit the issue body. Keep
  `Closes #<n>` in the PR body too (intent + reverse link). (Partial fix of a broader issue →
  `Refs #<n>` not `Closes`, and say so in the comment.)
- **`Closes` does NOT auto-close here — close your own issues by hand after merge.** GitHub
  only auto-closes a `Closes #<n>` issue when the PR merges into the repo's **default** branch.
  These PRs target `dev` (not the default, usually `main`), so the dev merge leaves the issue
  **open**. After your PR merges to `dev`, manually `gh issue close <n> --reason completed`
  for issues **you opened**. For an issue you did *not* open, never hand-close it — leave the
  fix comment noting it's safe to close, and let the owner/maintainer close it.

## The stacked branch model (this is the core mechanic)

Branches are **stacked**: branch *N* is cut from the tip of branch *N-1*; branch 1 is cut from
`origin/dev`. **But every PR still targets `dev`.**

```
issue #1  fix/<slug-1>   base = origin/dev      PR → dev
issue #2  fix/<slug-2>   base = fix/<slug-1>    PR → dev
issue #3  fix/<slug-3>   base = fix/<slug-2>    PR → dev
```

Two consequences you must handle:

1. **A PR's GitHub diff is cumulative** — PR #2 vs `dev` shows bug 1 + bug 2, because bug 1
   isn't merged yet. That's expected. To self-review *only this bug's* changes, diff against
   the **parent branch**, not `dev`:
   `git -C <worktree> diff <parent-ref>...HEAD`. Tell the user the PRs should be **merged
   bottom-up** (issue #1 first) so each later diff collapses to just its own change.
2. **Keep a child up to date with a merge, never a rebase.** If you need a parent's later
   commits in a child branch, `git merge <parent-branch>` into the child. Do **not** rebase:
   the user's global `commit.gpgsign=true` makes `git rebase --continue` fail to sign, which
   wedges the whole stack. Merge sidesteps that.

Each branch lives in its **own git worktree** so the working trees never collide. Worktree
dependency note: a fresh worktree may lack `node_modules`. For typecheck + unit tests, Node
resolving up to the main checkout (or a junction) is usually enough; but a real bundler build
(e.g. the web client's Turbopack `next build`) needs an actual `pnpm install` in the worktree.

## Phase 1 — Research every bug, then file the issues

For each bug, **first investigate, then file**. Good issues come from real findings, not a
paraphrase of the bug report.

1. **Research the root cause and candidate fixes.** Search the codebase: where the symptom
   surfaces, the suspected faulty code path, related tests, and recent changes near it. For a
   batch of independent bugs this parallelizes well — spawn one `Explore` (or `general-purpose`)
   subagent per bug to locate the relevant files and report back, so you're not serializing the
   reading. You stay responsible for the conclusion.

   Produce a short findings note per bug: **summary**, **affected files/paths**, **suspected
   root cause**, **proposed fix(es)** (with trade-offs if more than one), **risks/blast radius**,
   and a **repro** if you can find one.

2. **Open the issue** with `gh issue create`, body from a file (avoids quoting hell):

   ```bash
   gh issue create --title "<concise bug title>" --label bug --body-file <findings.md>
   ```

   Capture the issue number it prints. Record an ordered list of `(bug, issue#, findings)`.
   See [references/gh-recipes.md](references/gh-recipes.md) for an issue-body template.

After this phase you have N issues filed and an ordered work list. Report the issue links to
the user before starting Phase 2.

## Phase 2 — Solve each issue (stacked), in order

For issue *i* (`prev` = the previous bug's branch, or `origin/dev` for the first):

1. **Branch in a worktree, stacked on `prev`.**
   ```bash
   git fetch origin
   git worktree add ../<repo>-<slug> -b fix/<slug> <prev>
   ```
   (`<prev>` = `origin/dev` for i=1, else `fix/<prev-slug>`.) Work inside that worktree.

2. **Re-investigate, *then* implement.** First re-derive the fix against the live code (per the
   "the issue's Fix is a hypothesis" rule above): re-read the real code paths now, confirm the
   root cause and that the symptom still reproduces, and only then implement the fix *your*
   investigation supports — which may differ from what the issue body suggested. Follow project
   conventions. Add or update tests that prove the bug is fixed. Don't reformat untouched code —
   in repos whose baseline isn't Prettier-clean, a blanket `--write` explodes the diff. If you
   diverged from the issue's suggested fix, record why (you'll surface it in the PR + issue
   comment in the steps below).

3. **Verify.** Run the repo's gates (typecheck, full test suite, build, lint). All green
   before committing. If a blocking post-commit hook exists (e.g. a MessageBox popup), disable
   hooks **for that commit only** in the worktree rather than globally.

4. **Commit (signed) + push.** Reference the issue and auto-close it:
   ```bash
   git -c user.signingkey=<key> commit -m "fix: <summary> (#<n>)

   Closes #<n>"
   git push -u origin fix/<slug>
   ```

5. **Open the PR → `dev`** with full detail (problem, root cause, the fix, verification
   results, `Closes #<n>`), body from a file:
   ```bash
   gh pr create --base dev --head fix/<slug> --title "fix: <summary>" --body-file <pr-body.md>
   ```

   The PR body must include `Closes #<n>` (or `Refs #<n>` for a partial fix). Then **comment on
   the issue** with a short fix blurb + the PR link, so the linkage is visible on the issue too:
   ```bash
   gh issue comment <n> --body "Fixed by #<pr> (commit <sha>): <one-line what changed>."
   ```
   Don't edit the issue body. Remember the dev-merge caveat above: `Closes` won't auto-close
   on the `dev` merge, so once the PR lands, `gh issue close <n> --reason completed` for an
   issue **you opened** (and only those).

6. **Self-review (always).** Diff *this bug only* against the parent branch and review it
   skeptically for correctness bugs and obvious cleanups:
   ```bash
   git -C ../<repo>-<slug> diff <prev>...HEAD
   ```
   Post **each** finding as an **inline** PR comment with a concrete suggested fix (see
   [references/gh-recipes.md](references/gh-recipes.md) for the exact `gh api .../comments`
   call and how to get the head sha). If there are no real issues, post **one** short summary
   comment saying the review is clean.

7. **Fix → reply → resolve.** For each finding: apply the fix, re-verify, commit (signed) and
   push. Then reply to its thread noting the fix **with the commit sha**, and resolve the
   thread. The GraphQL/REST for replies and resolves is fiddly, so use the bundled helper:

   ```bash
   node <skill>/scripts/pr-thread.mjs threads <n>                 # list threads: id, file:line, snippet
   node <skill>/scripts/pr-thread.mjs reply   <n> <commentId> @reply.md
   node <skill>/scripts/pr-thread.mjs resolve <threadId>
   ```
   (`<skill>` = this skill's directory. The helper auto-detects owner/repo from the worktree.)

8. **Record** the branch, PR link, commit shas, and findings. Move to issue *i+1*, branching
   off **this** branch.

## Phase 3 — Report

When every bug is done, give the user a table: **bug → issue# → branch → PR link → commit
shas → review findings → verification result.** Then offer next steps (merge the stack
bottom-up, clean up the worktrees with `git worktree remove`, or start a new batch). Do **not**
merge or delete worktrees on your own.

## Gotchas (the ones that actually bite here)

- **Inline-comment lines must be in the PR diff.** `side=RIGHT` line numbers are absolute
  line numbers in the new file; they only post if that line appears in the PR's diff vs `dev`.
  Lines your change touched are in the diff, so comment on those. For a remark about an
  unchanged line, use a normal PR comment instead.
- **Head sha drifts after you push fixes.** Inline comments need the `commit_id` of a commit
  where the path/line exists — grab the current head right before reviewing
  (`gh pr view <n> --json headRefOid -q .headRefOid`).
- **Stale stack.** If you amend bug 1 after bug 2 is branched, bug 2 won't have the change.
  Merge bug 1's branch into bug 2's (not rebase) to propagate.
- **Don't fix the baseline.** Some suites are red on `dev` before you touch anything (e.g.
  known-failing frontend vitest specs). Confirm a failure is yours before chasing it.
- **PR base, not branch base.** A common slip is opening the PR against the parent branch
  because that's what you branched from. The branch base is the parent; the **PR base is
  always `dev`**.

## Bundled resources

- [references/gh-recipes.md](references/gh-recipes.md) — copy-paste `gh` / `gh api` / GraphQL
  commands for every step (issue create, worktree, PR create, head sha, inline comment, list
  threads, reply, resolve), with PowerShell-vs-bash quoting notes.
- [scripts/pr-thread.mjs](scripts/pr-thread.mjs) — Node helper for the self-review loop:
  `threads` / `reply` / `resolve`. Needs an authenticated `gh`; auto-detects the repo.
