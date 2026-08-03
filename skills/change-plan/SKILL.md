---
name: change-plan
description: Produce a two-part implementation-plan summary before writing code — a numbered "What I'll do" list of concrete edits (each with clickable file:line links, grouped into phases for multi-file work) followed by a short "What I need from you" list of the open decisions that block starting. Use whenever the user asks you to plan a code change, wants to know what you'll do before you touch files, asks you to "summarize the plan / summarize what you want from me / explain what you're going to do", or is discussing a change and hasn't yet approved implementation. Do NOT use once the plan is approved and it's time to actually edit.
---

# change-plan

Generate a tight, decision-forcing plan summary the user can approve at a glance. Two sections, always in this order. Never start editing code from this skill — its job ends at the questions.

## Before writing the plan

Verify, don't guess. Every file path, symbol name, line number, column, or existing-behavior claim in the plan must come from a real Read/Grep/search this session — not memory. A plan built on a guessed field name or stale line ref wastes the user's approval. If a fact is unconfirmed, either confirm it first or mark it explicitly as an assumption to check during implementation.

## Section 1 — "What I'll do"

- Lead with the concrete edits, not background. The user already knows the problem; they want to see the moves.
- **Number** the steps. For anything touching more than ~2 files, group them into named **phases** (`## Phase 1 — Detection`, etc.) so the sequence and dependencies are legible.
- Each step names its **file as a clickable link** (`[name.ts](rel/path.ts)` or `[name.ts:42](rel/path.ts:42)`) and states the change in one line. Show a tiny code/pseudocode block only when the shape of the change isn't obvious from prose.
- Call out the non-obvious consequences inline: a DB migration, a rename's blast radius, a mandatory sync step, a new test file, a gate that must pass. Surface what an approver would otherwise be surprised by.
- Respect the project's own rules (its `CLAUDE.md`): required docs, coverage gates, migration commands, commit/branch conventions. Fold them into the plan as steps, don't ignore them.
- Keep it scannable — fragments over sentences, tables for column/field lists. No filler, no restating the request back.

## Section 2 — "What I need from you"

- A short numbered list of **only the decisions that actually change what you build** — forks in the road, not confirmations you could infer. If a choice has an obvious default, state your recommendation (`*My rec: …*`) so the user can one-word approve.
- Never pad to hit a number. Zero open questions → say the plan is ready to execute and skip the section. One real question → ask one.
- Don't ask "should I proceed?" — the questions themselves are the approval gate. When the user answers, that's the go.

## Tone

Match the session's voice (including caveman mode if active). Technical terms exact. The whole summary should fit on one screen — if it doesn't, the plan is too coarse or too chatty; tighten it.

## After approval

When the user answers the questions / approves, leave this skill: implement the plan, running the project's gates as you go. Don't re-summarize unless asked.
