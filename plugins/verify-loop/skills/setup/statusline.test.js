// Run: node --test plugins/verify-loop/skills/setup/statusline.test.js
const test = require('node:test');
const assert = require('node:assert');
const { line } = require('./statusline.js');

const at = (pct) => ({ model: { display_name: 'Opus 5.5' }, context_window: { used_percentage: pct } });

test('no messages yet shows only the model', () => {
  assert.strictEqual(line({ model: { display_name: 'Opus 5.5' }, context_window: { used_percentage: null } }, {}), 'Opus 5.5');
});

test('low context, no commit: no hint', () => {
  assert.strictEqual(line(at(12), { compactAt: 70 }), 'Opus 5.5 · ctx ▓░░░░░░░░░ 12% (compact at 70%)');
});

test('near the compact threshold suggests /clear', () => {
  assert.match(line(at(61), { compactAt: 70 }), /context almost full: \/clear/);
  assert.doesNotMatch(line(at(59), { compactAt: 70 }), /almost full/);
});

test('after a commit with some context used suggests /clear', () => {
  assert.match(line(at(30), { compactAt: 70, committed: true }), /committed: good moment to \/clear/);
  assert.doesNotMatch(line(at(10), { compactAt: 70, committed: true }), /committed/);
});

test('without the override, the warning starts at 70%', () => {
  assert.match(line(at(72), {}), /almost full/);
  assert.doesNotMatch(line(at(72), {}), /compact at/);
});
