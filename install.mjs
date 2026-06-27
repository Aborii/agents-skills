#!/usr/bin/env node
// install.mjs — install one or more skills from this repo into a skills directory.
//
// Cross-platform (Windows / macOS / Linux); needs only Node 16.7+ (for fs.cp). No deps.
//
// Usage:
//   node install.mjs --list                       list installable skills in this repo
//   node install.mjs <skill> [<skill> ...]        install named skill(s)   (default scope: user)
//   node install.mjs all                          install every skill
//   node install.mjs <skill> --user              -> ~/.claude/skills/<skill>      (all projects)
//   node install.mjs <skill> --project           -> <cwd>/.claude/skills/<skill>  (this project)
//   node install.mjs <skill> --dir <path>        -> <path>/<skill>                (any tool/IDE)
//   node install.mjs <skill> --force             overwrite an existing install
//
// Exit codes: 0 ok, 1 error, 2 bad usage.

import { cp, mkdir, readdir, stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = join(REPO_ROOT, 'skills');

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

/** List skill folders (those containing a SKILL.md). */
async function listSkills() {
  if (!(await isDir(SKILLS_ROOT))) return [];
  const entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.isDirectory() && (await exists(join(SKILLS_ROOT, e.name, 'SKILL.md')))) out.push(e.name);
  }
  return out.sort();
}

function parseArgs(argv) {
  const opts = { skills: [], scope: 'user', dir: null, force: false, list: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list' || a === '-l') opts.list = true;
    else if (a === '--user') opts.scope = 'user';
    else if (a === '--project') opts.scope = 'project';
    else if (a === '--force' || a === '-f') opts.force = true;
    else if (a === '--dir') { opts.dir = argv[++i]; opts.scope = 'dir'; }
    else if (a === 'all' || a === '--all') opts.all = true;
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else opts.skills.push(a);
  }
  return opts;
}

function targetBase(opts) {
  if (opts.scope === 'dir') return resolve(opts.dir);
  if (opts.scope === 'project') return join(process.cwd(), '.claude', 'skills');
  return join(homedir(), '.claude', 'skills'); // user
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const available = await listSkills();

  if (opts.list || (opts.skills.length === 0 && !opts.all)) {
    console.log('Installable skills in this repo:');
    for (const s of available) console.log(`  - ${s}`);
    if (!opts.list) {
      console.log('\nUsage: node install.mjs <skill> [--user|--project|--dir <path>] [--force]');
      console.log('       node install.mjs all');
    }
    return;
  }

  if (opts.scope === 'dir' && !opts.dir) { console.error('--dir needs a path'); process.exit(2); }

  let wanted = opts.all ? available : opts.skills;
  const unknown = wanted.filter((s) => !available.includes(s));
  if (unknown.length) {
    console.error(`unknown skill(s): ${unknown.join(', ')}`);
    console.error(`available: ${available.join(', ')}`);
    process.exit(1);
  }

  const base = targetBase(opts);
  await mkdir(base, { recursive: true });
  console.log(`Installing into: ${base}\n`);

  for (const skill of wanted) {
    const src = join(SKILLS_ROOT, skill);
    const dest = join(base, skill);
    if ((await exists(dest)) && !opts.force) {
      console.log(`  ⚠ ${skill}: already exists at ${dest} (use --force to overwrite) — skipped`);
      continue;
    }
    await cp(src, dest, { recursive: true, force: true });
    console.log(`  ✓ ${skill} -> ${dest}`);
  }

  console.log('\nDone. Restart your agent/IDE if it caches the skills list.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
