---
name: setup
description: One-time setup of verify-loop's recommended Claude Code settings (models, advisor, subagent model, auto-compact, blocked folders and secrets, status line, plugin auto-update, idle token savers). Run it yourself with /verify-loop:setup after installing the plugin, and again after an update.
disable-model-invocation: true
---

# verify-loop setup

Merge the recommended settings into the user's `~/.claude/settings.json`. A plugin can't set these by itself, so this skill does it with the user's approval. Change nothing until the user says ok. On a re-run, keys that already have the recommended value need no question; ask only about what is new or different.

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
- **Blocked folders** (multi-select, first five checked by default): `node_modules`, `dist`, `.next`, `coverage`, lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`). Offer `build` and `target` unchecked and say why: Gradle and Maven keep test reports there, and the verify loop may need to read them.
- **Block secret files** (recommended): `.env`, `.env.*` (except `.env.example`), `secrets/`, `*.pem`, `*.key`. Say that this blocks Claude's file tools, not a shell command like `cat`.
- **Status line** (recommended). If `statusLine` already exists and is not verify-loop's, show the current one and ask before replacing it.
- **Plugin auto-update** (recommended): Claude Code leaves auto-update off for third-party marketplaces, so without it the user never gets fixes.
- **Idle compaction off** (recommended): Claude Code otherwise compacts a long conversation while the user is away, which spends tokens.
- **Hold cross-session messages** (not recommended by default): a message from another session wakes an idle session and re-sends its whole context. Only for people who don't coordinate several sessions; holding breaks session-to-session handoffs.

## 3. Proposed changes
| Key | Value | Why |
|---|---|---|
| `model` | the chosen alias | main (executor) model |
| `modelSettings.<canonical id of the main model>.effortLevel` | `medium` | a top-level `effortLevel` in user settings is ignored by newer models; use the canonical id, e.g. `claude-opus-5-5` |
| `advisorModel` | `opus`, `fable` or remove the key | stronger model consulted at decision points |
| `env.CLAUDE_CODE_SUBAGENT_MODEL` | `sonnet` | subagents don't inherit the expensive main model |
| `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `"70"` | compacts at 70% of the context window, while the conversation is still sharp; a smaller context also makes every later turn cheaper |
| `permissions.deny` (folders) | `Read(**/node_modules/**)`, `Read(**/dist/**)`, `Read(**/.next/**)`, `Read(**/coverage/**)`, `Read(**/package-lock.json)`, `Read(**/yarn.lock)`, `Read(**/pnpm-lock.yaml)`; `Read(**/build/**)`, `Read(**/target/**)` only if picked | Claude never reads huge generated files by mistake; Read rules also cover Grep and Glob |
| `permissions.deny` (secrets) | `Read(**/.env)`, `Read(**/.env.*)`, `Read(!.env.example)`, `Read(**/secrets/**)`, `Read(**/*.pem)`, `Read(**/*.key)` | keeps secrets out of the context; the `!` entry must come after `Read(**/.env.*)` |
| `statusLine` | `{"type": "command", "command": "node ~/.claude/verify-loop/statusline.js", "refreshInterval": 60}` | context used and when `/clear` is worth it; the refresh keeps the cache hint current while idle (see step 4) |
| `extraKnownMarketplaces.verify-loop.autoUpdate` | `true` (if the entry is missing, also set `"source": {"source": "github", "repo": "pedrowillen/verify-loop"}`) | Claude Code updates the plugin in the background; the next session loads the new version |
| `idleCompaction` | `false` | no compaction while the user is away |
| `crossSessionInbound` | `"hold"` only if picked | messages from other sessions are shown, not delivered |
| `promptSuggestionEnabled` | `false` | no background request after every reply |
| `awaySummaryEnabled` | `false` | no automatic recap while idle |

For `permissions.deny`, append to the existing list and skip entries already there. Show the user a before/after of only these keys, then write after their ok. Validate that the file is still valid JSON.

## 4. Status line (if accepted)
Copy `statusline.js` from this skill's base directory to `~/.claude/verify-loop/statusline.js` (overwrite an older copy). Test it before writing `statusLine`:
`echo '{"model":{"display_name":"Test"},"context_window":{"used_percentage":65}}' | node ~/.claude/verify-loop/statusline.js`
It should print a line with `65%`. If it fails, skip the status line and tell the user why. After this, the plugin keeps the copy in sync with each new version by itself.

The line shows the model, a context bar and, when it is worth it, a `/clear` hint: when context is within 10 points of the compact threshold, when the prompt cache went cold (the next message re-reads everything), or when a commit happened in the session (from the commit gate log) and at least 20% is used.

## 5. Check for duplicates and leftovers
Warn the user (don't fix silently) if any of these exist, and offer to remove them with their ok:
- hooks in `settings.json` that call a `verify-gate` or `trim-test-output` script (they would run twice);
- a personal `~/.claude/skills/verify/` skill (it replaces Claude Code's bundled `/verify` and duplicates `/verify-loop:verify`);
- the same workflow rules already in `~/.claude/CLAUDE.md`;
- a `<!-- verify-loop:compact -->` block or a `# Compact instructions` section in `~/.claude/CLAUDE.md`: the plugin now sends compact instructions itself through a PreCompact hook.

## 6. Finish
Tell the user the changes apply to new sessions, and list the manual steps from the README: language servers for code intelligence (optional), `/verify-loop:enforce` in projects that should block unchecked turns (optional), and accepting Fable's consent with `/model fable` if they chose the Fable advisor (then switch back with `/model <main model>`).
