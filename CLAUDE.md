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
3. **Install** with the chosen tool (see "How to install" below). Prefer `npx skills`; fall
   back to the bundled script, then a manual copy, depending on what's available.
4. **Verify & report.** Confirm the skill landed (its `SKILL.md` plus any `references/`/`scripts/`),
   then tell the user where it went and how to use it (it auto-loads by description, or can be
   invoked as a slash command like `/issue-summary`). Suggest restarting the agent/IDE if it
   caches its skills list.

Never install silently or pick a destination on the user's behalf without the confirmation in
step 2. Installing only ever **adds files to a skills directory** — it doesn't modify the user's
existing skills (a same-named skill is left alone unless the user opts into overwriting).

## How to install

Pick the first option that's available in the environment.

### 1. Preferred: `npx skills` (vercel-labs/skills)

The [`skills` CLI](https://github.com/vercel-labs/skills) installs into **70+ agents/IDEs**
(Claude Code, Cursor, Copilot, Windsurf, Cline, Continue, …), each with the correct paths, and
supports symlink-or-copy, project/global scope, plus `update`/`remove`. It discovers skills from
this repo's top-level `skills/` directory automatically.

```bash
# install a specific skill (project scope is the default)
npx skills add Aborii/agents-skills --skill issue-summary

# choose the target agent explicitly (e.g. Claude Code), or all agents
npx skills add Aborii/agents-skills --skill issue-summary -a claude-code
npx skills add Aborii/agents-skills --skill issue-summary --agent '*'

# global (all the user's projects) instead of project scope
npx skills add Aborii/agents-skills --skill issue-summary -g

# every skill in the repo
npx skills add Aborii/agents-skills --skill '*'

# non-interactive copy instead of the default symlink (CI / no-symlink envs)
npx skills add Aborii/agents-skills --skill issue-summary --copy -y

# try a skill without installing it (pipes a prompt into the agent)
npx skills use Aborii/agents-skills@issue-summary | claude
```

Map step 2's confirmed scope to the flags: **project** → default, **user/global** → `-g`,
and pass `-a <agent>` for the user's tool. This repo is **private**, so the user's machine must
be authenticated to GitHub for the clone to succeed.

### 2. Fallback: the bundled installer (zero-dependency Node, offline, no telemetry)

Use when `npx`/network/telemetry is undesirable. Targets Claude Code's skills dirs (or any path):

```bash
node install.mjs --list                       # show installable skills
node install.mjs issue-summary --user         # -> ~/.claude/skills/issue-summary
node install.mjs issues-to-prs --project      # -> <cwd>/.claude/skills/issues-to-prs
node install.mjs issue-summary --dir <path>   # any tool/IDE skills folder
node install.mjs all --user                   # install everything
node install.mjs issue-summary --user --force # overwrite an existing copy
```

### 3. Last resort: manual copy

```bash
cp -r skills/issue-summary ~/.claude/skills/                            # user scope
mkdir -p .claude/skills && cp -r skills/issue-summary .claude/skills/   # project scope
```

```powershell
Copy-Item -Recurse skills\issue-summary "$HOME\.claude\skills\"         # PowerShell
```

Keep the folder structure intact — `references/` and `scripts/` must travel with `SKILL.md`,
since `SKILL.md` links to them by relative path. On Windows, `~` is `%USERPROFILE%`
(e.g. `C:\Users\<you>\.claude\skills`).
