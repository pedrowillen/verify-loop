---
name: enforce
description: Turn the current project's fast check into a hard gate - a Stop hook that sends Claude back to work while the check fails, plus an optional formatter hook after each edit. Run it yourself with /verify-loop:enforce inside a project.
disable-model-invocation: true
---

# verify-loop enforce

Write hooks into the current project's settings so its check runs every time, not only when Claude remembers. This follows the Stop-hook and formatter-hook patterns from Claude Code's best practices. Change nothing until the user says ok.

## 1. Find the fast check
Look in the project (CLAUDE.md, `package.json` scripts, `Makefile`, `mvnw`/`gradlew`, `pyproject.toml`, `Cargo.toml`, `go.mod`...) for a check that finishes in seconds: a typecheck (`tsc --noEmit`, `mypy`, `cargo check`, `go vet`) or a lint. Not the full test suite: the Stop hook runs at the end of every turn. Never invent a command the project doesn't have. Run it once and time it; if it takes over ~60 seconds, say so and suggest a narrower one.

## 2. Ask the user
- **Where to write**: `.claude/settings.local.json` (only you, recommended) or `.claude/settings.json` (committed, applies to everyone in the repo).
- **The check command** found in step 1 (let them edit it).
- **Formatter after each edit** (optional): only if the project already has one configured (Prettier, Black, gofmt, rustfmt, Spotless...).

## 3. Hooks to merge
Read the chosen file (start from `{}` if missing), keep everything in it, and add:

Stop hook. Inside a git repo it skips turns that leave no changes (new untracked files count as changes), and sends the check's output back to Claude on failure (exit 2). Claude Code ends the turn anyway after 8 blocks in a row. Known limit, tell the user: a turn that edits and commits leaves a clean tree, so the check is skipped for it; the commit gate log still shows whether verification ran.
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "git rev-parse --git-dir >/dev/null 2>&1 && [ -z \"$(git status --porcelain)\" ] && exit 0; <CHECK> 1>&2 || exit 2",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

Formatter hook, if accepted (reads the edited path with Node, so it works without `jq`):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(node -e \"let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).tool_input?.file_path||''))\") && [ -n \"$f\" ] && <FORMATTER> \"$f\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```
Replace `<CHECK>` and `<FORMATTER>` with the project's commands, for example `npx tsc --noEmit` and `npx prettier --write --ignore-unknown`. Append to existing `Stop`/`PostToolUse` arrays instead of replacing them. Show the final file and write after the user's ok. Validate it is still valid JSON.

## 4. Finish
Tell the user the hooks apply to new sessions (or run `/hooks` to review them), and how to undo: remove the entries from that file.
