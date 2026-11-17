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

test('expired prompt cache suggests /clear, and beats the commit hint', () => {
  const now = 1_000_000_000_000;
  const withCache = (expiresInSec) => ({ ...at(30), prompt_cache: { caching_observed: true, expires_at: now / 1000 + expiresInSec } });
  assert.match(line(withCache(-1), { compactAt: 70, committed: true, now }), /cache cold/);
  assert.doesNotMatch(line(withCache(60), { compactAt: 70, now }), /cache cold/);
  assert.doesNotMatch(line({ ...at(30), prompt_cache: { caching_observed: false, expires_at: null } }, { compactAt: 70, now }), /cache cold/);
});

test('without the override, the warning starts at 70%', () => {
  assert.match(line(at(72), {}), /almost full/);
  assert.doesNotMatch(line(at(72), {}), /compact at/);
});
