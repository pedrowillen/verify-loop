---
name: setup
description: One-time setup of verify-loop's recommended Claude Code settings (models, advisor, subagent model, auto-compact, blocked folders, status line, idle token savers). Run it yourself with /verify-loop:setup after installing the plugin.
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
- **Blocked folders** (multi-select, first five checked by default): `node_modules`, `dist`, `.next`, `coverage`, lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`). Offer `build` and `target` unchecked and say why: Gradle and Maven keep test reports there, and the verify loop may need to read them.
- **Status line**: whether to install verify-loop's status line (recommended). If `statusLine` already exists, show the current one and ask before replacing it.

## 3. Proposed changes
| Key | Value | Why |
|---|---|---|
| `model` | the chosen alias | main (executor) model |
| `modelSettings.<canonical id of the main model>.effortLevel` | `medium` | a top-level `effortLevel` in user settings is ignored by newer models; use the canonical id, e.g. `claude-opus-5-5` |
| `advisorModel` | `opus`, `fable` or remove the key | stronger model consulted at decision points |
| `env.CLAUDE_CODE_SUBAGENT_MODEL` | `sonnet` | subagents don't inherit the expensive main model |
| `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `"70"` | compacts at 70% of the context window, while the conversation is still sharp; a smaller context also makes every later turn cheaper |
| `permissions.deny` | add `Read(**/node_modules/**)`, `Read(**/dist/**)`, `Read(**/.next/**)`, `Read(**/coverage/**)`, `Read(**/package-lock.json)`, `Read(**/yarn.lock)`, `Read(**/pnpm-lock.yaml)` (only the folders chosen; `Read(**/build/**)`, `Read(**/target/**)` if picked) | Claude never reads huge generated files by mistake; Read rules also cover Grep and Glob. Append to the existing list, skip entries already there |
| `statusLine` | `{"type": "command", "command": "node ~/.claude/verify-loop/statusline.js"}` | shows context used and when `/clear` is worth it (see step 5) |
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

## 5. Status line (if accepted)
Copy `statusline.js` from this skill's base directory to `~/.claude/verify-loop/statusline.js` (overwrite an older copy). Test it before writing `statusLine`:
`echo '{"model":{"display_name":"Test"},"context_window":{"used_percentage":65}}' | node ~/.claude/verify-loop/statusline.js`
It should print a line with `65%`. If it fails, skip the status line and tell the user why.

The line shows the model, a context bar and, when it is worth it, a `/clear` hint: when context is within 10 points of the compact threshold, or when a commit happened in the session (from the commit gate log) and at least 20% is used.

## 6. Check for duplicates
Warn the user (don't fix silently) if any of these exist, because they would run twice next to the plugin:
- hooks in `settings.json` that call a `verify-gate` or `trim-test-output` script;
- a personal `~/.claude/skills/verify/` skill;
- the same workflow rules already in `~/.claude/CLAUDE.md`.

## 7. Finish
Tell the user the changes apply to new sessions, and list the manual steps from the README: language servers for code intelligence (optional), and accepting Fable's consent with `/model fable` if they chose the Fable advisor (then switch back with `/model <main model>`).
