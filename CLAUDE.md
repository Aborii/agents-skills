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
| `version-release` | [`skills/version-release`](skills/version-release) | End-to-end versioned release: bump → merge integration into release branch → tag → GitHub release → pinned announcement issue (closes the prior one). |

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

## Adding a new skill to this repo (authoring protocol)

When the user asks you to **add / create / contribute a new skill** to this repo (as opposed to
installing one), follow this. The goal is a skill that's discoverable by `npx skills` and the
bundled installer with zero extra wiring.

1. **Clarify the skill, briefly.** Confirm its purpose and the concrete *trigger phrases* a user
   would say to invoke it. The `description` is what an agent matches against, so these phrases
   matter more than prose. If the user is vague, ask 1–2 sharp questions, then proceed.
2. **Pick a folder name = the skill `name`.** Lowercase `kebab-case`, verb-or-noun, unique
   within `skills/` (check it isn't taken). The folder name **must equal** the `name:` in the
   frontmatter — installers and slash commands key off it.
3. **Scaffold the folder** under `skills/<name>/`:
   - `SKILL.md` — **required.** Frontmatter with exactly `name` and `description`, then the
     procedure. See the template below and mirror the style of the existing skills.
   - `references/` — *optional.* Long, load-on-demand docs (recipes, tables, examples). Link to
     them from `SKILL.md` with **relative** paths so they travel with the skill.
   - `scripts/` — *optional.* Executable helpers. Keep them dependency-free where possible (the
     existing `pr-thread.mjs` uses only Node built-ins and an authenticated `gh`). Reference them
     from `SKILL.md` by relative path.
   Put heavy detail in `references/`/`scripts/`, not inline — `SKILL.md` should stay scannable.
4. **Write a strong `description`.** One line, third-person, listing real trigger phrases and
   when to prefer this skill. This is the single biggest factor in whether the skill actually
   fires. Use the existing skills' descriptions as the quality bar.
5. **Register it in the catalog.** Add a row to the **Available skills** table above (here in
   `CLAUDE.md`) and to the skills table in [`README.md`](README.md). `skills/` stays the source
   of truth, but keep both tables in sync so humans see it. No other manifest to edit —
   `install.mjs` and `npx skills` auto-discover any folder with a `SKILL.md`.
6. **Validate.** Run `node install.mjs --list` and confirm the new skill appears. Optionally do a
   throwaway install to a temp dir to confirm the whole folder copies cleanly:
   `node install.mjs <name> --dir ./.testinstall` then inspect and delete it.
7. **Commit + push.** One skill per commit where practical. Use a clear message
   (`Add <name> skill: <one-line>`). If commit signing is configured for the agent, sign it.
   Then report the new skill's path, its trigger phrases, and the install command
   (`npx skills add Aborii/agents-skills --skill <name>`).

### `SKILL.md` template

```markdown
---
name: <kebab-case-name>            # must equal the folder name
description: <one line: what it does + the trigger phrases a user would say to invoke it,
  and when to prefer it over alternatives. Third person. This is what agents match on.>
---

# <Human Title>

<1–2 sentences on what this skill produces and the mental model.>

## When to use
<the concrete situations / phrasings that should trigger it>

## Steps
1. <do this>
2. <then this>

## Output / format
<what the result should look like, with a short example if helpful>

## Notes & gotchas
<edge cases; link bundled resources by relative path, e.g. [recipes](references/recipes.md)>
```

Conventions to keep the catalog consistent: one skill per folder; folder name == `name`;
frontmatter is exactly `name` + `description`; prefer dependency-free scripts; link bundled
files by relative path; keep the two catalog tables (this file + `README.md`) in sync.
