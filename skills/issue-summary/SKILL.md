---
name: issue-summary
description: Produce a tight, 2-sentence TL;DR of a GitHub (or other tracker) issue covering what the issue is, the cause, the effect, and what it should be. Use this whenever the user pastes an issue URL/number or asks to "summarize this issue", "what's this issue about", "tldr this issue/bug", "explain this ticket", or hands over any bug report and wants the gist fast — even if they don't say the word "skill". Prefer this over a long structured write-up when the user wants brevity.
---

# Issue TL;DR

Turn a tracked issue (GitHub issue/PR, or pasted issue text) into a compact summary the user can read in seconds. The goal is a developer's mental model of the bug, not a transcription of the issue body.

## Output format

Default to exactly **two lines**, each a single sentence, paired this way:

```
**What/cause:** <what the issue is> — <the root cause, in plain terms>.
**Effect/should-be:** <the user-visible / system effect> — <what the correct behavior should be instead>.
```

Why this pairing: the *cause* only makes sense next to *what* it's causing, and the *fix* only makes sense next to the *effect* it's meant to prevent. Keeping them paired makes the two sentences self-contained.

Keep it genuinely short — aim for ~2 sentences total, not two dense paragraphs. Strip file paths, line numbers, ticket boilerplate, and priority labels unless the user asks for them; those add length without adding understanding. Translate jargon from the issue into a clear cause-and-effect story.

### Example

Input: an issue where two media rows sharing a download URL get co-mutated because two helpers match by URL/filename instead of primary key.

Output:
```
**What/cause:** When two media files in an album share the same download URL, two code paths (the source-missing handler and the corrupted-media delete) match rows by URL/filename instead of by primary key, so they can't tell the duplicates apart.
**Effect/should-be:** This makes them flip or delete *both* siblings — wrongly marking a valid copy as undownloaded or deleting a file that's still on disk — when instead they should match by the precise primary key first.
```

## How to fetch the issue

- **GitHub URL or `#number`**: use the `gh` CLI. From a URL, derive `--repo <owner>/<repo>`; from a bare `#n`, use the current repo. Pull only what you need:
  ```bash
  gh issue view <number> --repo <owner>/<repo> --json title,body,state,labels,comments
  ```
  If `gh issue view` fails (it might be a PR), retry with `gh pr view`.
- **Pasted text**: just read what the user pasted; no fetch needed.
- If the issue body is thin, skim the comments for the actual cause/fix before writing — sometimes the diagnosis lives in a comment, not the description.

## Notes

- If the issue genuinely has no identified cause yet (it's just a symptom report), say so in the cause slot rather than inventing one — e.g. "cause not yet diagnosed in the issue."
- If the user asks for more depth ("give me the full breakdown", "expand"), switch to a longer structured form: Problem → Cause → Impact → Proposed fix, keeping the affected files/lines. The 2-line form is the default, not the only mode.
- Don't open or modify code to verify the issue's claims unless the user asks — this skill summarizes the issue as written.
