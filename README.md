# agents-skills

A collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) **Agent Skills** — self-contained, model-invoked workflows that Claude loads on demand when a task matches the skill's description.

Each skill lives in its own folder under [`skills/`](skills/) and follows the standard layout: a `SKILL.md` with YAML frontmatter (`name` + `description`) plus the procedure, and any supporting `references/` docs or `scripts/` it bundles.

## Skills

| Skill | What it does | Trigger it when… |
| ----- | ------------ | ---------------- |
| [`issues-to-prs`](skills/issues-to-prs) | End-to-end pipeline: turns a batch of bugs into researched GitHub issues, then into reviewed, self-corrected PRs — one stacked git-worktree branch per item. | You hand over a list of issues/bugs and want them taken all the way through ("fix these all", "create issues and PRs for these"). |
| [`issue-summary`](skills/issue-summary) | Produces a tight, 2-sentence TL;DR of a tracker issue (what / cause / effect / should-be). | You paste an issue URL or number and want the gist fast ("tldr this issue", "what's this ticket about"). |

## Repository layout

```
agents-skills/
├── README.md
├── CLAUDE.md            # agent instructions: how to install a skill on request
├── LICENSE
├── install.mjs          # cross-platform installer (Node, no deps)
└── skills/
    ├── issues-to-prs/
    │   ├── SKILL.md              # the workflow
    │   ├── references/
    │   │   └── gh-recipes.md     # copy-paste gh / gh api / GraphQL commands
    │   └── scripts/
    │       └── pr-thread.mjs     # Node helper: list / reply / resolve PR review threads
    └── issue-summary/
        └── SKILL.md
```

## Installing a skill

### With the bundled installer (recommended)

A cross-platform Node installer (no dependencies) copies a skill into the right directory:

```bash
git clone https://github.com/Aborii/agents-skills.git
cd agents-skills

node install.mjs --list                     # show installable skills
node install.mjs issue-summary --user       # ~/.claude/skills/ (all projects)
node install.mjs issues-to-prs --project    # ./.claude/skills/ (this project)
node install.mjs issue-summary --dir <path> # any other tool/IDE skills folder
node install.mjs all --user                 # install everything
```

### Hand it to an agent

This repo ships a [`CLAUDE.md`](CLAUDE.md) so you can just point an agent at the repo and say
*"install issue-summary"*. The agent will resolve the skill, **confirm where to install it**
(user / project / custom dir), copy it in, and verify — without touching your other skills.

### Manual copy

Skills are picked up from a skills directory; copying the folder works too:

```bash
cp -r skills/issue-summary ~/.claude/skills/        # personal (all projects)
mkdir -p .claude/skills && cp -r skills/issue-summary .claude/skills/  # project
```

Claude Code discovers the skill from its `SKILL.md` frontmatter automatically — no registration step. You can also invoke one explicitly as a slash command, e.g. `/issue-summary`.

## Authoring conventions

- One skill per folder; the folder name matches the `name:` in `SKILL.md`.
- `SKILL.md` frontmatter has exactly `name` and `description`. The description is what Claude matches against, so it lists concrete trigger phrases.
- Keep heavy detail in `references/` and executable helpers in `scripts/`; the `SKILL.md` links to them so they load only when needed.

## License

[MIT](LICENSE)
