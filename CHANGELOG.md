# Changelog

## 0.3.0

- Compact instructions now come from a PreCompact hook; setup no longer edits `~/.claude/CLAUDE.md` and offers to remove the old block.
- Commit gate runs only on `git commit` (hook `if` filter) instead of on every shell command.
- Status line: new "cache cold" hint when the prompt cache has expired, refreshed every 60 seconds.
- Setup: blocks secret files (`.env`, `secrets/`, keys), turns on plugin auto-update, turns off idle compaction, and offers to hold cross-session messages.
- New `/verify-loop:enforce` skill: per-project Stop hook for the fast check, plus an optional formatter hook.
- Rules and `/verify-loop:verify` suggest `/run-skill-generator` when launching the app takes digging.
- After an update, Claude tells you the new version once, and the installed status line refreshes by itself.

## 0.2.0

- Setup: auto-compact at 70%, blocked heavy folders, and a status line with context used and `/clear` hints.

## 0.1.0

- Workflow rules, `/verify-loop:verify`, commit gate (observe mode), test-output trimmer and `/verify-loop:setup`.
