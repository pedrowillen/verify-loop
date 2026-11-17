#!/usr/bin/env node
// verify-loop status line: model, context used, and a hint when /clear is worth it.
// Setup copies this file to ~/.claude/verify-loop/statusline.js; Claude Code pipes session JSON on stdin.
const fs = require('fs');
const path = require('path');
const os = require('os');

const GATE_LOG = path.join(os.homedir(), '.claude', 'plugins', 'data', 'verify-loop-verify-loop', 'gate.log');

function line(input, { compactAt, committed, now = Date.now() }) {
  const model = input.model?.display_name || 'Claude';
  const pct = input.context_window?.used_percentage;
  if (pct == null) return model;

  const used = Math.round(pct);
  const filled = Math.min(10, Math.round(used / 10));
  const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
  let out = `${model} · ctx ${bar} ${used}%` + (compactAt ? ` (compact at ${compactAt}%)` : '');

  // Cold cache: the next message re-reads the whole context at full price.
  const pc = input.prompt_cache;
  const cold = pc?.caching_observed && pc.expires_at && now > pc.expires_at * 1000;

  const soon = (compactAt || 80) - 10;
  if (used >= soon) out += ' · context almost full: /clear if the next task is unrelated';
  else if (cold && used >= 20) out += ' · cache cold: next message re-reads all context, /clear is cheaper for a new task';
  else if (committed && used >= 20) out += ' · committed: good moment to /clear before the next task';
  return out;
}

// A commit in this session shows up as a gate log line ending with the session id.
function committedIn(sessionId) {
  if (!sessionId) return false;
  try {
    return fs.readFileSync(GATE_LOG, 'utf8').split('\n').some((l) => l.endsWith(`| ${sessionId}`));
  } catch {
    return false;
  }
}

module.exports = { line };

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    let input = {};
    try { input = JSON.parse(raw); } catch {}
    const compactAt = Number(process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE) || 0;
    process.stdout.write(line(input, { compactAt, committed: committedIn(input.session_id) }));
  });
}
