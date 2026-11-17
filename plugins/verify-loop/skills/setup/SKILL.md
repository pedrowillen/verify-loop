---
name: setup
description: One-time setup of verify-loop's recommended Claude Code settings (models, advisor, subagent model, idle token savers). Run it yourself with /verify-loop:setup after installing the plugin.
disable-model-invocation: true
---

# verify-loop setup

Merge the recommended settings into the user's `~/.claude/settings.json`. A plugin can't set these by itself, so this skill does it with the user's approval. Change nothing until the user says ok.

## 1. Read and back up
- Read `~/.claude/settings.json` (it may not exist; then start from `{}`).
- Before any write, copy it to `~/.claude/settings.json.bak-verify-loop`.
- Never touch keys outside the list below. Keep everything else exactly as it is.

## 2. Ask the user (one question each, recommended option first)
- **Model pairing** (main model + advisor). Ask about their plan and how complex the project is, and say that complexity matters more than the plan:
  - Max/Ultra plan or a complex project: main `opus` + advisor `fable`.
  - Pro plan or a simpler project: main `sonnet` + advisor `opus`.
  - Or keep their current models, or turn the advisor off.
  Warn about Fable before they pick it: on some plans Fable usage is billed to usage credits (the `/model` picker shows "Requires usage credits" on the Fable row); Claude Code asks for consent once via `/model fable`, and after that there is no further warning and no spending cap. The advisor must rank at or above the main model.
- **Effort for the main model**: `medium` (recommended) or keep current.
- **Compact instructions**: whether to add a `# Compact instructions` section to `~/.claude/CLAUDE.md` (recommended).

## 3. Proposed changes
| Key | Value | Why |
|---|---|---|
| `model` | the chosen alias | main (executor) model |
| `modelSettings.<canonical id of the main model>.effortLevel` | `medium` | a top-level `effortLevel` in user settings is ignored by newer models; use the canonical id, e.g. `claude-opus-5-5` |
| `advisorModel` | `opus`, `fable` or remove the key | stronger model consulted at decision points |
| `env.CLAUDE_CODE_SUBAGENT_MODEL` | `sonnet` | subagents don't inherit the expensive main model |
| `promptSuggestionEnabled` | `false` | no background request after every reply |
| `awaySummaryEnabled` | `false` | no automatic recap while idle |

Show the user a before/after of only these keys, then write after their ok. Validate that the file is still valid JSON.

## 4. Compact instructions (if accepted)
Append this to `~/.claude/CLAUDE.md` (create the file if missing), between the markers, replacing any older block with the same markers:

```
<!-- verify-loop:compact -->
# Compact instructions

When compacting, keep: the user's decisions and approvals, changed files (with paths), errors and failing test output, what was verified and what is left, and the next steps. Drop tool output that is already resolved.
<!-- /verify-loop:compact -->
```

## 5. Check for duplicates
Warn the user (don't fix silently) if any of these exist, because they would run twice next to the plugin:
- hooks in `settings.json` that call a `verify-gate` or `trim-test-output` script;
- a personal `~/.claude/skills/verify/` skill;
- the same workflow rules already in `~/.claude/CLAUDE.md`.

## 6. Finish
Tell the user the changes apply to new sessions, and list the manual steps from the README: language servers for code intelligence (optional), and accepting Fable's consent with `/model fable` if they chose the Fable advisor (then switch back with `/model <main model>`).
