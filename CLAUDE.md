# CLAUDE.md — agents-skills

This repository is a catalog of installable **Agent Skills**. Each skill is a self-contained
folder under [`skills/`](skills/) holding a `SKILL.md` (the procedure + its `name`/`description`
frontmatter) and any `references/` docs or `scripts/` it bundles.

If you are an agent (Claude Code or any other) and the user has pointed you at this repo, your
job is to help them **install skills from it**, following the protocol below.

## Available skills

| Skill | Folder | Summary |
| ----- | ------ | ------- |
| `issues-to-prs` | [`skills/issues-to-prs`](skills/issues-to-prs) | Batch of bugs → researched GitHub issues → reviewed, self-corrected stacked PRs. |
| `issue-summary` | [`skills/issue-summary`](skills/issue-summary) | Tight 2-sentence TL;DR of a tracker issue (what / cause / effect / should-be). |

Treat `skills/` as the source of truth — if a folder there isn't in this table, it's still
installable. Run `node install.mjs --list` to enumerate skills programmatically.

## Install protocol (when the user names a skill)

When the user hands you this repo and mentions a skill — e.g. *"install issue-summary"*,
*"add issues-to-prs to this project"*, or just names a skill — do this:

1. **Resolve the skill.** Match the name to a folder under `skills/`. If it's ambiguous or not
   found, list the available skills (`node install.mjs --list`) and ask which one.
2. **Confirm the target with the user before writing anything.** Ask where to install it:
   - **User scope** — all of the user's projects.
   - **Project scope** — only the current project/repo.
   - **Custom directory** — an explicit path (for another tool/IDE).
   Propose a sensible default (user scope) but **do not install until the user confirms.**
3. **Install** by copying the whole skill folder into the chosen skills directory (see targets
   below). Prefer the bundled script; fall back to a manual copy if you can't run it.
4. **Verify & report.** Confirm `SKILL.md` (and any `references/`/`scripts/`) landed at the
   destination, then tell the user the path and how to use it (it auto-loads by description, or
   can be invoked as a slash command like `/issue-summary`). Suggest restarting the agent/IDE if
   it caches its skills list.

Never install silently or pick a destination on the user's behalf without the confirmation in
step 2. Installing only ever **copies files into a skills directory** — it doesn't modify the
user's existing skills unless they pass `--force` to overwrite a same-named one.

## Install targets (general — works across agents, IDEs, and projects)

Skills are discovered from a skills directory. The common ones:

| Scope | Path | Use when |
| ----- | ---- | -------- |
| **User** (Claude Code, all projects) | `~/.claude/skills/<skill>` | The user wants it everywhere. |
| **Project** (Claude Code, shared in repo) | `<project>/.claude/skills/<skill>` | Scoped to one repo; committable for the team. |
| **Custom / other tool** | `<path>/<skill>` | Another agent or IDE that loads skills from a specific folder. |

On Windows, `~` is `%USERPROFILE%` (e.g. `C:\Users\<you>\.claude\skills`).

## How to install

### Preferred: the bundled installer (cross-platform Node, no deps)

```bash
node install.mjs --list                      # show installable skills
node install.mjs issue-summary --user        # -> ~/.claude/skills/issue-summary
node install.mjs issues-to-prs --project     # -> <cwd>/.claude/skills/issues-to-prs
node install.mjs issue-summary --dir /path/to/skills   # any tool/IDE
node install.mjs all --user                  # install everything
node install.mjs issue-summary --user --force  # overwrite an existing copy
```

### Fallback: manual copy (when you can't run scripts)

Copy the skill folder verbatim into the target skills directory:

```bash
# user scope
cp -r skills/issue-summary ~/.claude/skills/

# project scope
mkdir -p .claude/skills && cp -r skills/issue-summary .claude/skills/
```

PowerShell:

```powershell
Copy-Item -Recurse skills\issue-summary "$HOME\.claude\skills\"
```

Keep the folder structure intact — `references/` and `scripts/` must travel with `SKILL.md`,
since `SKILL.md` links to them by relative path.
