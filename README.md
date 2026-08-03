# agents-skills

A collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) **Agent Skills** — self-contained, model-invoked workflows that Claude loads on demand when a task matches the skill's description.

Each skill lives in its own folder under [`skills/`](skills/) and follows the standard layout: a `SKILL.md` with YAML frontmatter (`name` + `description`) plus the procedure, and any supporting `references/` docs or `scripts/` it bundles.

## Skills

| Skill | What it does | Trigger it when… |
| ----- | ------------ | ---------------- |
| [`issues-to-prs`](skills/issues-to-prs) | End-to-end pipeline: turns a batch of bugs into researched GitHub issues, then into reviewed, self-corrected PRs — one stacked git-worktree branch per item. | You hand over a list of issues/bugs and want them taken all the way through ("fix these all", "create issues and PRs for these"). |
| [`issue-summary`](skills/issue-summary) | Produces a tight, 2-sentence TL;DR of a tracker issue (what / cause / effect / should-be). | You paste an issue URL or number and want the gist fast ("tldr this issue", "what's this ticket about"). |
| [`version-release`](skills/version-release) | Cuts a versioned release end-to-end: bump on the integration branch, merge into the release branch, tag, publish the GitHub release, and open a pinned release-announcement issue (closing the previous one). Handles the real-world gotchas — blocking hooks, merge-vs-rebase signing, stale tags, conflicts. | You want to ship a release ("cut/make a release", "release a new version", "bump the version and release", "ship vX"). |
| [`ask`](skills/ask) | Answers a question about the code by reading it — plain English, every claim cited as repo + `file:line`, a 2-sentence summary at the end, then a follow-up question. Hard read-only for the whole turn: it explains the fix, it never applies it. | You want to understand something rather than change it ("how does X work", "why does Y happen", "where is Z handled", "what causes this bug"). |
| [`change-plan`](skills/change-plan) | Produces a decision-forcing plan before any code is written: a numbered "What I'll do" list of concrete edits, each with a clickable `file:line` link and grouped into phases, followed by the open decisions that block starting. Every path and symbol must come from a real search, not memory. | You want to see the plan before files get touched ("summarize the plan", "what are you going to do", "plan this change"). |
| [`challenge-idea`](skills/challenge-idea) | Pressure-tests an idea you pitch: sharp clarifying questions first, then a relentless attack on its assumptions, flaws, and risks — zero sugar-coating or validation-seeking. | You want an idea to survive contact with reality before you build it ("poke holes in this", "pressure-test this", "challenge this idea"). |
| [`grilling`](skills/grilling) | Interviews you one question at a time, walking down each branch of the design tree and resolving dependencies between decisions — recommending an answer for each, and reading the codebase instead of asking when it can. | You want a plan or design stress-tested before building ("grill me on this", "interview me about this plan"). |
| [`grill-me`](skills/grill-me) | A slash-command launcher that starts a `grilling` session. Marked `disable-model-invocation`, so it never auto-fires — only `/grill-me` triggers it. | You want to start a grilling session explicitly by name. |
| [`handoff`](skills/handoff) | Compacts the current conversation into a handoff document a fresh agent can pick up from — written to the OS temp dir, with a suggested-skills section, references to existing artifacts instead of duplicating them, and sensitive values redacted. | You're ending a session and want another agent (or a later you) to continue ("write a handoff", "summarize this for the next session"). |

## Repository layout

```
agents-skills/
├── README.md
├── CLAUDE.md            # agent instructions: how to install a skill on request
├── LICENSE
├── install.mjs          # zero-dependency fallback installer (Node, no deps)
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

### Recommended: the `skills` CLI ([vercel-labs/skills](https://github.com/vercel-labs/skills))

Works across **70+ agents/IDEs** (Claude Code, Cursor, Copilot, Windsurf, Cline, Continue, …)
and reads this repo's `skills/` directory directly — no clone needed:

```bash
npx skills add Aborii/agents-skills --skill issue-summary           # project scope (default)
npx skills add Aborii/agents-skills --skill issue-summary -g        # global (all projects)
npx skills add Aborii/agents-skills --skill issue-summary -a claude-code   # target an agent
npx skills add Aborii/agents-skills --skill '*'                     # every skill in the repo
npx skills use Aborii/agents-skills@issue-summary | claude          # try without installing
```

> This repo is **private** — your machine must be authenticated to GitHub for the clone to work.

### Hand it to an agent

This repo ships a [`CLAUDE.md`](CLAUDE.md) so you can just point an agent at the repo and say
*"install issue-summary"*. The agent resolves the skill, **confirms where to install it**
(project / global / agent), installs it (via `npx skills`, falling back to the bundled script or
a manual copy), and verifies — without touching your other skills.

### Fallback: the bundled installer (zero-dependency Node, offline, no telemetry)

For when you'd rather not use `npx`/network. Targets Claude Code's skills dirs (or any path):

```bash
git clone https://github.com/Aborii/agents-skills.git && cd agents-skills
node install.mjs --list                     # show installable skills
node install.mjs issue-summary --user       # ~/.claude/skills/ (all projects)
node install.mjs issues-to-prs --project    # ./.claude/skills/ (this project)
node install.mjs issue-summary --dir <path> # any other tool/IDE skills folder
```

### Last resort: manual copy

```bash
cp -r skills/issue-summary ~/.claude/skills/        # personal (all projects)
mkdir -p .claude/skills && cp -r skills/issue-summary .claude/skills/  # project
```

Claude Code discovers the skill from its `SKILL.md` frontmatter automatically — no registration step. You can also invoke one explicitly as a slash command, e.g. `/issue-summary`.

## Authoring conventions

- One skill per folder; the folder name matches the `name:` in `SKILL.md`.
- `SKILL.md` frontmatter has exactly `name` and `description`. The description is what Claude matches against, so it lists concrete trigger phrases.
- Keep heavy detail in `references/` and executable helpers in `scripts/`; the `SKILL.md` links to them so they load only when needed.

**Adding a new skill?** [`CLAUDE.md`](CLAUDE.md) has a step-by-step authoring protocol (for both
humans and agents) plus a ready-to-fill `SKILL.md` template. In short: scaffold `skills/<name>/`,
write a trigger-rich `description`, add a row to the tables here and in `CLAUDE.md`, then
`node install.mjs --list` to confirm it's discovered.

## License

[MIT](LICENSE)
