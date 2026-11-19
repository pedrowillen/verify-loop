// Run: node --test plugins/verify-loop/hooks/hooks.test.js
// Black-box tests: pipe the hook payload Claude Code sends into each script and check what comes out.
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const run = (script, payload, env = {}) => {
  const r = spawnSync('bash', [path.join(__dirname, script)], {
    input: JSON.stringify(payload),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
};

// ---- trim-test-output.sh ----

const trim = (command, tool_name = 'Bash') => {
  const out = run('trim-test-output.sh', { tool_name, tool_input: { command } });
  return out ? JSON.parse(out).hookSpecificOutput.updatedInput.command : null;
};

test('plain test runners are trimmed to the last 100 lines, keeping the exit code', () => {
  for (const c of [
    'npm test',
    'npm run test',
    'npx vitest run',
    'npx jest --ci',
    'npx playwright test',
    'ng test --watch=false',
    'pytest -x tests/',
    'go test ./...',
    'cargo test',
    './mvnw verify',
    'mvn test',
    './gradlew test',
    'php artisan test',
    'docker exec app php artisan test',
    'lune run test',
  ]) assert.strictEqual(trim(c), `set -o pipefail; ${c} 2>&1 | tail -n 100`, c);
});

test('compound commands and other commands are left alone', () => {
  for (const c of [
    'npm test | grep fail',
    'npm test && echo ok',
    'npm test; rm -rf dist',
    'npm test > out.txt',
    'npm test $(whoami)',
    'npm test `whoami`',
    'npm install',
    'ls',
  ]) assert.strictEqual(trim(c), null, c);
});

test('only the Bash tool is rewritten', () => {
  assert.strictEqual(trim('npm test', 'Edit'), null);
});

// Known gaps, not trimmed yet. Moving one of these to the list above should come with a regex change.
test('not trimmed yet: rspec, rails, yarn/pnpm, npm run test:*, PowerShell', { todo: true }, () => {
  for (const c of ['bundle exec rspec', 'bin/rails test', 'yarn test', 'pnpm test', 'npm run test:unit'])
    assert.ok(trim(c), c);
  assert.ok(trim('npm test', 'PowerShell'), 'PowerShell');
});

// ---- verify-gate.sh ----

const fwd = (p) => p.replace(/\\/g, '/');

// Writes a transcript, runs the gate on a commit, returns the new gate.log line (or null).
const gate = (entries, command = 'git commit -m "x"') => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-gate-'));
  const transcript = path.join(dir, 'session.jsonl');
  fs.writeFileSync(transcript, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  run('verify-gate.sh', {
    session_id: 's1',
    transcript_path: transcript,
    cwd: 'C:\\projects\\app',
    tool_name: 'Bash',
    tool_input: { command },
  }, { CLAUDE_PLUGIN_DATA: fwd(dir) });
  const log = path.join(dir, 'gate.log');
  const line = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim() : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return line;
};

// Transcript entries in the shapes Claude Code writes them.
const skillCall = (skill) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Skill', input: { skill } }] } });
const slashSkill = (name) => ({ type: 'user', message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>` } });
const toolOutput = (text) => ({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: text }] } });
const found = (line) => line.split(' | ')[1];

test('a commit logs the date, skills found, cwd and session id', () => {
  assert.match(gate([skillCall('verify-loop:verify')]), /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d \| verify \| C:\/projects\/app \| s1$/);
});

test('a commit with no verify or review logs none', () => {
  assert.strictEqual(found(gate([skillCall('verify-loop:setup')])), 'none');
  assert.strictEqual(found(gate([])), 'none');
});

test('skills count whether called by Claude or typed as a slash command', () => {
  assert.strictEqual(found(gate([skillCall('ponytail:ponytail-review')])), 'ponytail-review');
  assert.strictEqual(found(gate([slashSkill('ponytail:ponytail-review')])), 'ponytail-review');
  assert.strictEqual(found(gate([skillCall('code-review')])), 'code-review');
});

test('several skills are listed once each, sorted', () => {
  const entries = [skillCall('verify-loop:verify'), skillCall('security-review'), skillCall('verify-loop:verify')];
  assert.strictEqual(found(gate(entries)), 'security-review verify');
});

test('skill names quoted inside tool output do not count', () => {
  assert.strictEqual(found(gate([toolOutput('"skill":"verify-loop:verify"')])), 'none');
  assert.strictEqual(found(gate([toolOutput('"content":"<command-message>verify</command-message>"')])), 'none');
});

test('commands that are not commits log nothing', () => {
  assert.strictEqual(gate([skillCall('verify-loop:verify')], 'git status'), null);
});
