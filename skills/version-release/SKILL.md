---
name: version-release
description: >-
  Cut a versioned release of a repo end-to-end: pick a version bump, merge the
  integration branch into the release branch, tag it, publish a GitHub
  release with generated notes, and open a pinned release-announcement issue
  (closing the prior one). Use this whenever the user asks to "make/cut/create
  a release", "release a new version", "publish a release", "tag a release", "bump
  the version and release", "ship vX", or types /version-release — even if they
  don't spell out every step. This is the AI-agent equivalent of a `pnpm release`
  script and handles the real-world gotchas (blocking commit hooks, merge vs
  rebase signing issues, stale tags, conflicts) that a naive `git tag && gh release`
  would get wrong.
---

# version-release

Perform a safe, repeatable versioned release of a single repository. You drive
`git` and `gh` directly; this skill is the playbook so you don't have to
rediscover the edge cases each time.

The default model is: bump the version on the **integration branch** (`dev`),
merge that into the **release branch** (`main`) with a merge commit, tag the
merge commit, and publish a GitHub release. Branch names and the bump are
configurable per run — confirm them, don't assume.

## When you're invoked

Figure out three things first, asking the user only what you can't infer:

1. **Which repo.** Default to the current working directory if it's a git repo
   with a `package.json`. In a multi-repo workspace, confirm which one (or which
   ones — you can release several in sequence, one full pass each).
2. **The version bump.** If the user already said (e.g. "patch release",
   "major"), use it. Otherwise ask: **patch / minor / major / custom**, showing
   the resulting number for each (read `version` from `package.json`). For a
   monorepo or non-`package.json` project, ask where the version lives.
3. **Branch names.** Default `dev` → `main`. Confirm if the repo uses different
   names (`develop`, `master`, `release`, etc.). If the repo has no separate
   integration branch and releases straight off one branch, skip the merge and
   just bump → tag → release on that branch.

## The flow

Run these in order. Stop and surface the problem if any preflight check fails —
do not paper over it.

### 1. Preflight (all read-only)

- `gh auth status` — must be authenticated, else stop and tell the user to run
  `gh auth login`.
- `git remote get-url origin` — confirm there's a remote.
- `git status --porcelain` — the working tree **must be clean**. Uncommitted
  changes are the user's call; don't stash or commit them as part of a release.
- `git fetch --prune --tags origin`.
- Confirm `origin/<dev>` and `origin/<main>` both exist.
- Compare local `<dev>` to `origin/<dev>`
  (`git rev-list --left-right --count <dev>...origin/<dev>`):
  - **behind only** → fast-forward (`git merge --ff-only origin/<dev>`).
  - **ahead only** (unpushed local commits) → tell the user and confirm before
    including them; a release should ship reviewed, pushed work. (This bites
    often: people think they pushed when they didn't.)
  - **diverged** → stop. The user must reconcile first.

### 2. Gate

If the repo has a typecheck/test script, run it before mutating anything —
typecheck is a cheap, high-value gate (`pnpm typecheck` / `npm run typecheck`
or the repo's equivalent). Run the test suite too if the user wants it or the
repo clearly expects it; if a known-flaky suite fails, report it and let the
user decide rather than silently continuing. Never let tests hit the network.

### 3. Bump the version on `<dev>`

- Edit only the `version` field in `package.json` (a targeted single-line change
  keeps the diff clean — don't reformat the whole file). Compute the new number
  from the chosen bump.
- **Write the release note in the same commit, when the repo keeps them.** A
  repo with `scripts/release-notes.mjs` and a `release-notes/` folder ships a
  plain-English "What's new" note per version. The product shows it in-app,
  and step 5 turns it into the GitHub release body. Skip this bullet for a
  repo without that script.
  1. `node scripts/release-notes.mjs new X.Y.Z` writes the template.
  2. Fill it from what actually merged since the previous tag
     (`git log <prevTag>..<dev> --merges --oneline` and the PR bodies). Follow
     `release-notes/README.md`: a one- or two-sentence summary, then New /
     Improved / Fixed bullets saying what changed *for the person using it*,
     in plain words. PR numbers, file names, endpoints and migrations go under
     `## Technical` only. Leave out work that is merged but not in this release.
  3. `node scripts/release-notes.mjs generate`, then `… check`. `check` rejects
     code, links and PR numbers in the plain-English parts and enforces the
     length caps; fix the note rather than the rule.
  4. Commit the note and the regenerated module with the version bump.
- Commit it: `chore(release): vX.Y.Z`.
- Push `<dev>`.

### 4. Merge `<dev>` → `<main>`

- `git checkout <main>` then bring it up to date with the remote via
  **fast-forward only** (`git merge --ff-only origin/<main>`). If that fails,
  local `<main>` has diverged from `origin/<main>` — stop and have the user
  reconcile. **Never `git reset --hard` `<main>` silently**; you could discard
  commits made directly on the release branch.
- Merge with a merge commit: `git merge --no-ff -m "chore(release): vX.Y.Z" <dev>`.
- **Use merge, never rebase.** Rebasing the integration branch onto the release
  branch rewrites history (wrong for a shared branch) and, with
  `commit.gpgsign=true`, `git rebase --continue` often fails to sign even with
  `-c user.signingkey`. Merge sidesteps both.
- **On conflict: abort and bail.** `git merge --abort`, `git checkout <dev>`,
  then report exactly which files conflicted and ask the user to resolve them
  manually. Do not guess a resolution — release merges that go wrong are painful
  to unwind. (If the release branch has commits the integration branch never
  got, that's the usual cause; surface it.)
- Push `<main>`.

### 5. Tag + GitHub release

- **Check the tag doesn't already exist** before creating it — both locally
  (`git rev-parse -q --verify refs/tags/vX.Y.Z`) and remotely
  (`git ls-remote --tags origin vX.Y.Z`). If it exists, stop and ask.
- Create an annotated tag **on the merge commit**: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
- Push the tag: `git push origin vX.Y.Z`.
- **Verify the tag points at the merge commit** you just pushed
  (`git rev-list -n1 vX.Y.Z` == `git rev-parse origin/<main>`). A tag left over
  from an earlier aborted attempt can point at the wrong (pre-merge) commit and
  silently get pushed — and the GitHub release will then attach to the wrong
  commit. If it's wrong, move it (`git tag -d`, recreate on the right commit,
  `git push --force origin vX.Y.Z`) and recreate the release.
- Create the release: `gh release create vX.Y.Z --target <main> --title "vX.Y.Z" --generate-notes`.
  **When the repo keeps release notes** (step 3), the body comes from the note:
  the plain English first, then *Technical details*, then GitHub's PR list.
  Render it to a file and check it is not empty before passing it:

  ```bash
  node scripts/release-notes.mjs github X.Y.Z > /tmp/release-body.md && test -s /tmp/release-body.md
  gh release create vX.Y.Z --target <main> --title "vX.Y.Z" --notes-file /tmp/release-body.md --generate-notes
  ```

  Use a file, never `<(…)` and never a pipe into `--notes-file -`. Process
  substitution hands a Windows `gh` a `/dev/fd` path it cannot open. A pipe
  publishes an empty body, with no error, when the script fails.
  Capture and report the URL. Note: `gh release edit` does **not** accept
  `--generate-notes`; if you need to regenerate notes, delete and recreate the
  release (`gh release delete vX.Y.Z --yes --cleanup-tag=false`).

### 6. Announce — create a pinned release issue

After the GitHub release exists, open an **issue announcing the release and pin
it**, so the latest release is the first thing visitors see on the repo's Issues
tab. Model it on the repo's prior announcements if there are any (look for a
pinned issue, or one carrying a `release` label).

- **Gather the highlights from what actually shipped** since the previous tag —
  the merged PRs (`git log <prevTag>..<main> --merges --oneline`) and the
  release's generated notes. Group them into a short, skimmable "What's new"
  bullet list. Don't invent entries; only list what merged. When the repo keeps
  release notes, start from the note's plain-English bullets so the
  announcement, the release and the in-app "What's new" say the same thing.
- **Title:** `🎉 <package-name> vX.Y.Z released` (read `name` from `package.json`).
- **Body:** a one-sentence intro, a **What's new in vX.Y.Z** bullet list (emoji
  bullets like the prior announcement read well), the test/suite count if you
  ran the suite, and a **Links** section — the release URL, `docs/` if present,
  and the roadmap epic issue if the repo tracks one. Write the body to a file and
  pass `--body-file` (avoids shell-quoting pain with emoji/backticks).
- **Label:** apply a `release` label so future runs can find the prior
  announcement to unpin. Create it once if missing:
  `gh label create release -c '#0E8A16' -d 'Release announcement' || true`.
- **Create + pin:** `gh issue create --title "…" --body-file <file> --label release`,
  then `gh issue pin <number>`.
- **Unpin *and close* the superseded announcement.** GitHub allows at most **3
  pinned issues**, and you want only the newest release announcement live: find
  the previous release announcement (the prior issue carrying the `release`
  label) and both unpin and close it —
  `gh issue unpin <number>` then
  `gh issue close <number> --reason completed -c "Superseded by vX.Y.Z — see #<new-number>."`.
  Only unpin/close release-announcement issues — never touch unrelated pinned or
  open issues.
- Report the new issue URL.

### 7. Wrap up

- `git checkout <dev>` so the user lands back on the working branch.
- Report: new version, branch tips, tag → commit, the release URL, the
  announcement issue URL, and the results of any gates you ran.

## Hooks: don't let them block or corrupt the release

Repo hooks can sabotage an automated release. Disable hooks **for the release
commits/merges only**, and run the real safety check (typecheck) yourself in
step 2 instead of relying on a `pre-push` hook.

- Disable hooks per-command with either `HUSKY=0` (husky) or
  `git -c core.hooksPath=<empty-dir> ...` (works for any hook manager). Create an
  empty dir once (e.g. `mkdir -p /tmp/nohooks`) and point `core.hooksPath` at it.
- The classic offender: a **`post-commit` hook that pops a blocking dialog**
  (e.g. a DB-backup MessageBox) — it will hang the whole flow waiting for a click.
  `--no-verify` does **not** skip `post-commit`; you must disable hooks via
  `core.hooksPath`/`HUSKY=0`.
- Apply this to the bump commit **and** the merge commit (a `--no-ff` merge
  creates a commit and fires `post-commit` too).

## Commit signing

Respect the repo/user's existing signing setup — don't change global or per-repo
`user.signingkey` / `commit.gpgsign`. If the user has a dedicated key or
convention for agent-made commits, pass it per-command
(`git -c user.signingkey=<KEY> commit ...`) rather than mutating config. If a
signed commit fails with "cannot connect to keyboxd / No Keybox daemon", launch
`gpgconf --launch keyboxd` and `gpg-agent`, then retry — no config change needed.

## Quick reference

```sh
# preflight
gh auth status
git fetch --prune --tags origin
git status --porcelain                 # must be empty
git rev-list --left-right --count dev...origin/dev

# bump on dev (hooks off so blocking post-commit hooks don't fire)
#   ...edit package.json "version"...
# if the repo keeps release notes: write the plain-English note in the same commit
node scripts/release-notes.mjs new 2.1.0      # then fill release-notes/2.1.0.md
node scripts/release-notes.mjs generate && node scripts/release-notes.mjs check
git add -A release-notes
HUSKY=0 git -c core.hooksPath=/tmp/nohooks commit -am "chore(release): v2.1.0"
git push origin dev

# merge dev -> main (merge, never rebase)
git checkout main
git merge --ff-only origin/main
HUSKY=0 git -c core.hooksPath=/tmp/nohooks merge --no-ff -m "chore(release): v2.1.0" dev
git push origin main

# tag (verify it doesn't exist first) + release
git ls-remote --tags origin v2.1.0     # must be empty
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
git rev-list -n1 v2.1.0                 # must equal origin/main tip
gh release create v2.1.0 --target main --title "v2.1.0" --generate-notes
# ...or, with release notes: body from the note, rendered to a checked file
node scripts/release-notes.mjs github 2.1.0 > /tmp/release-body.md && test -s /tmp/release-body.md
gh release create v2.1.0 --target main --title "v2.1.0" --notes-file /tmp/release-body.md --generate-notes

# announce: pinned release issue (highlights from merged PRs since last tag)
git log v2.0.0..main --merges --oneline    # source the "What's new" list
gh label create release -c '#0E8A16' -d 'Release announcement' || true
#   ...write announcement body to /tmp/release-note.md...
gh issue create --title "🎉 <pkg> v2.1.0 released" --body-file /tmp/release-note.md --label release
gh issue pin <new-number>
gh issue unpin <prev-release-announcement-number>   # respect the 3-pin cap
gh issue close <prev-release-announcement-number> --reason completed -c "Superseded by v2.1.0 — see #<new-number>."

git checkout dev
```

## Safety

This skill mutates shared branches and publishes to GitHub. Before the
destructive part (the merge + push + release), show the user the plan
(repo, current → new version, branch flow, tag) and get a go-ahead unless they've
already told you to proceed. A GitHub release is outward-facing — once published
it may be indexed even if later deleted, so get the version and target right
before creating it.
