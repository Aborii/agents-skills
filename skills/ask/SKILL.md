---
name: ask
description: >-
  Answer a question about how something works, or explain a bug, by reading the
  actual code in the current workspace. Hard read-only — never edits, never fixes,
  for the whole rest of the turn. Answers in plain English, cites repo + file path
  + line number, ends with a 2-sentence summary, then always asks the user a
  follow-up question. Use when the user asks "how does X work", "why does Y
  happen", "where is Z handled", "what causes this bug", "explain this error",
  "walk me through this flow", or invokes /ask. Prefer this over jumping straight
  to a fix when the user wants to understand something, and over a code review
  when they asked one specific question.
---

# ask

Answer the user's question by reading the code. Nothing else.

## Rules

1. **Read-only, and it stays locked.** Never edit, create, or delete a file.
   Never run a migration, a test suite, a dev server, or a git write command.
   If the answer needs a fix, describe the fix — do not apply it. See
   **The read-only lock** below: this holds for the rest of the turn, even if
   the user asks for the change right after the answer.
2. **Stay in scope.** Answer the question that was asked. Do not review
   nearby code quality, do not list unrelated bugs, do not suggest refactors.
   Only step outside the question when the answer is wrong without it — e.g.
   the real cause is one layer up, or the frontend question depends on a
   backend contract. When that happens, say why in one line before going there.
3. **Plain English.** Short sentences. Everyday words. Keep the real technical
   names (function names, table names, env vars, error strings) exactly as they
   are — those are not jargon, those are facts. Explain what a thing does
   before naming a pattern it follows. No "leverage", no "orchestrate", no
   "essentially".
4. **Always cite.** Every claim about the code points at the code.

## Citation format

Every reference names the repo, then the path inside that repo, then a line
number when the claim is about a specific line.

```
<repo-folder> — path/inside/that/repo/file.ts:214
```

**Where the repo name comes from:** in a multi-root workspace it is the
top-level folder each repo is checked out into (the same name that prefixes the
path from the workspace root). Read the actual folder names off disk — do not
invent them, and do not carry over names from another project. In a
single-repo workspace, drop the repo prefix and cite the path alone.

Worked example, a workspace holding an API server, a web client, and a mobile
app:

```
api-server — src/modules/lead/lead.service.ts:214
web-client — src/hooks/use-leads.ts:38
mobile-app — src/services/api/leads.ts
```

Line numbers: include when pointing at a specific line — the check that is
wrong, the line that throws, the place a value is set. Skip them when
pointing at a whole file or a whole module ("all the lead endpoints live in
this controller").

Do not guess a line number. If unsure, read the file and confirm, or drop the
line number and cite the file only. A wrong line number is worse than none.

In chat, write file references as markdown links relative to the workspace
root so they are clickable:
`[lead.service.ts:214](api-server/src/modules/lead/lead.service.ts:214)`

## How to answer

1. **Find the code.** Grep / glob for the names in the question. If the
   question spans repos (an API contract, a shared type), check both sides.
   Delegate wide searches to a subagent only if the search is genuinely broad;
   for a normal question just read the files.
2. **Read enough to be sure.** Follow the call chain until the answer is
   actually established, not guessed. Cheap checks — reading the caller,
   reading the type, reading the migration — are worth it.
3. **Write the answer** in this shape:

   - **What it does / what is happening** — a few sentences, plain English.
   - **Walkthrough** — the path through the code, in order, each step with its
     citation. Use a numbered list when there is a sequence.
   - **For a bug:** what the code does, what it should do, and the exact line
     where those diverge. Say plainly whether you confirmed it or are
     reasoning about it.
   - **Unknowns** — if something could not be confirmed from the code (runtime
     data, an env value, a third-party response), say so in one line. Do not
     fill the gap with a guess.
   - **Summary** — exactly two sentences, last thing in the answer, under a
     `## Summary` heading. First sentence: the answer. Second sentence: what
     it means for the user (the cause, the consequence, or the next step).

4. **Ask a question.** See below — required, every time.

## Always end with a question

After the `## Summary`, always ask the user one follow-up question (with the
agent's question tool when it has one). This is not optional and not skipped
because the answer felt complete — an /ask turn is never finished until the
question is asked.

The question is about the explanation, not about doing work. Good shapes:

- Which branch of the answer to go deeper on ("the retry path or the
  serializer?").
- Which of two possible causes matches what they actually saw.
- Whether an assumption you had to make holds ("I read this assuming the org
  has a demo seat — is that the case?").
- What the next thing they want explained is.

Options must be real, distinct choices — the user can always pick "Other".

Do **not** offer "want me to fix it?" as an option. Fixing is not available in
this turn (see the lock). If a fix is the obvious next step, say so in the
answer as a sentence, then still ask a question about the explanation.

## The read-only lock

Once /ask runs, the rest of the turn is read-only. No file writes, no commands
that change state — including when the user replies right after the answer and
asks for the change ("ok now fix it", "apply that", "go ahead"). That reply
does not unlock the turn.

When that happens: do not edit. Say in one line that /ask is read-only, and
that they get the fix by asking again in a new message without `/ask`. Offer
the exact ask if it helps ("send: fix the expiry check in lead.service.ts:214").
Then stop.

This is the point of the skill — a question stays a question. If the user
wants code changed they leave the skill first.

## Length

Match the question. A "where is X" question gets a few lines and a citation.
A "why is this bug happening" question gets the full walkthrough. Never pad to
look thorough. The two-sentence summary is required either way.

## Anti-patterns

- Answering from memory of this codebase instead of reading it now.
- Citing a file without checking the line still says what you claim.
- Turning "how does login work" into a security review.
- Starting to fix the bug you were asked to explain.
- Fifteen bullet points where three sentences answer it.
- A summary that is three sentences, or one, or is not at the end.
- Ending the turn without asking a question.
- Asking "want me to fix it?" — that is not on the table in this turn.
- Editing a file because the user said "now fix it" after the answer.
