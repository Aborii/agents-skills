#!/usr/bin/env node
// pr-thread.mjs — self-review helpers for a PR: list / reply / resolve review threads.
//
// Usage (run from inside the repo or worktree; owner/repo are auto-detected):
//   node pr-thread.mjs threads <pr>                       list review threads as JSON lines
//   node pr-thread.mjs reply   <pr> <commentId> <body>    reply to a review comment (body or @file)
//   node pr-thread.mjs resolve <threadId>                 mark a review thread resolved
//
// Requires an authenticated `gh` (gh auth status). No third-party deps.
//
// `threads` emits one JSON object per line:
//   {"threadId","resolved","outdated","commentId","location","author","snippet"}
// Feed `commentId` to `reply` and `threadId` to `resolve`.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Run gh and return stdout. Throws with gh's stderr/stdout on failure. */
function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Detect owner/name from the current repo (works inside a worktree). */
function repo() {
  const nwo = gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).trim();
  const [owner, name] = nwo.split('/');
  if (!owner || !name) throw new Error(`could not parse repo from "${nwo}"`);
  return { owner, name };
}

/** A body arg that starts with @ is read from that file; otherwise used verbatim. */
function bodyArg(arg) {
  if (arg == null) throw new Error('missing body (pass text or @file)');
  return arg.startsWith('@') ? readFileSync(arg.slice(1), 'utf8') : arg;
}

const THREADS_QUERY = `
query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      reviewThreads(first:100){
        nodes{
          id isResolved isOutdated
          comments(first:1){ nodes{ databaseId path line originalLine body author{login} } }
        }
      }
    }
  }
}`;

function threads(pr) {
  if (!pr) throw new Error('usage: threads <pr>');
  const { owner, name } = repo();
  const out = gh([
    'api', 'graphql',
    '-f', `query=${THREADS_QUERY}`,
    '-f', `owner=${owner}`,
    '-f', `name=${name}`,
    '-F', `number=${pr}`,
  ]);
  const nodes = JSON.parse(out).data.repository.pullRequest.reviewThreads.nodes;
  for (const t of nodes) {
    const c = t.comments.nodes[0] ?? {};
    console.log(JSON.stringify({
      threadId: t.id,
      resolved: t.isResolved,
      outdated: t.isOutdated,
      commentId: c.databaseId ?? null,
      location: `${c.path ?? '?'}:${c.line ?? c.originalLine ?? '?'}`,
      author: c.author?.login ?? null,
      snippet: (c.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
    }));
  }
}

function reply(pr, commentId, body) {
  if (!pr || !commentId) throw new Error('usage: reply <pr> <commentId> <body|@file>');
  const { owner, name } = repo();
  gh([
    'api', `repos/${owner}/${name}/pulls/${pr}/comments/${commentId}/replies`,
    '-f', `body=${bodyArg(body)}`,
  ]);
  console.log(`replied to comment ${commentId} on PR #${pr}`);
}

const RESOLVE_MUTATION =
  'mutation($threadId:ID!){ resolveReviewThread(input:{threadId:$threadId}){ thread{ id isResolved } } }';

function resolve(threadId) {
  if (!threadId) throw new Error('usage: resolve <threadId>');
  gh(['api', 'graphql', '-f', `query=${RESOLVE_MUTATION}`, '-f', `threadId=${threadId}`]);
  console.log(`resolved thread ${threadId}`);
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'threads') threads(rest[0]);
  else if (cmd === 'reply') reply(rest[0], rest[1], rest[2]);
  else if (cmd === 'resolve') resolve(rest[0]);
  else {
    console.error('usage: node pr-thread.mjs <threads|reply|resolve> ...');
    process.exit(2);
  }
} catch (err) {
  // Surface gh's own stderr/stdout when present — that's where the real error is.
  const detail = err.stderr?.toString?.() || err.stdout?.toString?.() || err.message;
  console.error(detail.trim());
  process.exit(1);
}
