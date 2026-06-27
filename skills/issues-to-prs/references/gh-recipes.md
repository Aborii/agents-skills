# gh recipes for issues-to-prs

Copy-paste commands for each step. Replace `<...>` placeholders. These assume `gh` is
installed and authenticated (`gh auth status`).

**Quoting:** prefer `--body-file <path>` / `-F body=@<path>` over inline `--body "..."` for
any multi-line text — it dodges the PowerShell-vs-bash quoting differences entirely. Write the
body to a temp `.md` file first, then pass the file. Examples below use the file form.

---

## Phase 1 — file an issue

Issue body template (`findings.md`):

```markdown
## Summary
<one-paragraph description of the bug and its user-visible symptom>

## Affected code
- `path/to/file.ts:NN` — <what's there>

## Suspected root cause
<why it happens>

## Proposed fix
<the change; list options + trade-offs if more than one>

## Risks / blast radius
<what else this touches; migration/contract concerns>

## Repro
<steps or a failing test, if found>
```

```bash
gh issue create --title "<concise bug title>" --label bug --body-file findings.md
# prints the issue URL; the trailing number is the issue #
```

List/confirm: `gh issue list --label bug --limit 50`

---

## Phase 2 — branch, build, PR

### Stacked worktree

```bash
git fetch origin
# first bug: base on origin/dev; later bugs: base on the previous bug's branch
git worktree add ../<repo>-<slug> -b fix/<slug> <prev-ref>
#   <prev-ref> = origin/dev   (issue #1)
#   <prev-ref> = fix/<prev>   (issue #2+)
```

Propagate a parent's later commits into a child (MERGE, never rebase — rebase breaks signing):

```bash
git -C ../<repo>-<slug> merge fix/<prev>
```

### Commit (signed) + push

```bash
git -C ../<repo>-<slug> -c user.signingkey=<key> commit -m "fix: <summary> (#<n>)

Closes #<n>"
git -C ../<repo>-<slug> push -u origin fix/<slug>
```

If a blocking hook (e.g. post-commit backup MessageBox) gets in the way, disable hooks for the
single commit only — `-c core.hooksPath=/dev/null` on that one `commit` invocation — never
globally.

### Open the PR (base is ALWAYS dev)

PR body template (`pr-body.md`):

```markdown
## Problem
<the bug>

## Root cause
<why>

## Fix
<what changed and why this is the right fix>

## Verification
- typecheck: ✅
- tests: ✅ (<command>)
- build: ✅
- lint: ✅

Closes #<n>
```

```bash
gh pr create --base dev --head fix/<slug> --title "fix: <summary>" --body-file pr-body.md
```

---

## Self-review

### Diff just this bug (not the cumulative PR diff)

```bash
git -C ../<repo>-<slug> diff <prev-ref>...HEAD
```

### Current head sha (needed for inline comment commit_id)

```bash
gh pr view <n> --json headRefOid -q .headRefOid
```

### Post an inline review comment

Write the comment body to `comment.md`, then:

```bash
gh api repos/{owner}/{repo}/pulls/<n>/comments \
  -F body=@comment.md \
  -f commit_id=<head-sha> \
  -f path=<path/from/repo/root> \
  -F line=<line-number> \
  -f side=RIGHT
```

- `-F` = typed field (so `line` is an int), `-f` = string field.
- `line` must appear in the PR diff vs `dev` and is the line number in the **new** file.
- For a multi-line range add `-F start_line=<n> -f start_side=RIGHT`.
- `{owner}/{repo}` placeholders are filled in by `gh` from the current repo automatically.

### Clean review (no findings)

```bash
gh pr comment <n> --body "Self-review: no correctness or cleanup issues found. LGTM."
```

---

## Reply + resolve threads

Use the helper — it wraps the GraphQL/REST below. From the worktree:

```bash
node <skill>/scripts/pr-thread.mjs threads <n>                 # -> {threadId, commentId, location, snippet, resolved}
node <skill>/scripts/pr-thread.mjs reply   <n> <commentId> @reply.md
node <skill>/scripts/pr-thread.mjs resolve <threadId>
```

Raw equivalents, if you ever need them:

Reply to a review comment (REST):

```bash
gh api repos/{owner}/{repo}/pulls/<n>/comments/<commentId>/replies -f body="Fixed in <sha>. <what changed>"
```

List review threads (GraphQL) — get `id` (thread) + `databaseId` (first comment):

```bash
gh api graphql -f query='
query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      reviewThreads(first:100){ nodes{ id isResolved comments(first:1){ nodes{ databaseId path line body } } } }
    }
  }
}' -f owner=<owner> -f name=<repo> -F number=<n>
```

Resolve a thread (GraphQL):

```bash
gh api graphql -f query='
mutation($threadId:ID!){ resolveReviewThread(input:{threadId:$threadId}){ thread{ id isResolved } } }' \
  -f threadId=<threadId>
```
