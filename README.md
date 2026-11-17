# verify-loop

[Português (Brasil)](README.pt-BR.md)

A Claude Code plugin that gives Claude a **verification loop** and **token-saving defaults**: run the change for real before reviewing it, cap fix rounds, log unverified commits, and trim noisy test output.

> **Credits.** This project is based on practices published by **Anthropic** and the **Claude Code team**, mainly the post [How the Claude Code team thinks about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) and the official guides on [managing costs](https://code.claude.com/docs/en/costs), the [advisor tool](https://code.claude.com/docs/en/advisor) and [code intelligence plugins](https://code.claude.com/docs/en/plugins/code-intelligence). It is an independent community project, **not affiliated with or endorsed by Anthropic**.

## What you get

| Piece | What it does | Token cost |
|---|---|---|
| Workflow rules | Injected at session start: plan → implement → verify → review → re-verify → commit. Max 3 fix rounds, no weakening tests, no retry-until-green on flaky tests. | ~400 tokens per session |
| `/verify-loop:verify` skill | Finds the project's own commands, runs cheap checks first (lint, tests, build), then smoke-tests the changed area in the running app. | Only when used |
| Compact instructions | A PreCompact hook tells compaction to keep decisions, changed files, failing output and next steps. No edit to your `CLAUDE.md`. | ~60 tokens per compaction |
| Commit gate (observe mode) | Runs only on `git commit` and logs which verify/review skills ran in the session; `none` marks an unverified commit. Never blocks. | Zero |
| Test-output trimmer | Rewrites plain test commands (`npm test`, `./mvnw verify`, `pytest`, `go test`, ...) to show only the last 100 lines, keeping the exit code. | Saves tokens |
| `/verify-loop:setup` skill | Merges the recommended settings, with a backup and your approval. Run it again after an update to pick up new ones. | Once |
| `/verify-loop:enforce` skill | Optional, per project: a Stop hook that sends Claude back to work while the project's fast check (typecheck or lint) fails, and an optional formatter after each edit. | The check's output, only when it fails |

### Recommended settings (applied by `/verify-loop:setup`)

- **Main model and advisor** picked for your project, see [Which models to use](#which-models-to-use). The main model runs at **medium** effort.
- **Subagents** on Sonnet, so broad searches don't run on the expensive model.
- **Prompt suggestions** and **session recap** off: both send requests while you are idle.
- **Auto-compact at 70%** of the context window, while the conversation is still sharp. A smaller context also makes every later turn cheaper.
- **Blocked folders**: Claude can't read `node_modules`, `dist`, `.next`, `coverage` or lockfiles (also blocks Grep and Glob there). `build` and `target` are optional, because Gradle and Maven keep test reports in them.
- **Blocked secrets**: `.env`, `.env.*` (except `.env.example`), `secrets/`, `*.pem` and `*.key`. This covers Claude's file tools, not shell commands like `cat`.
- **Plugin auto-update**: Claude Code leaves it off for third-party marketplaces; setup turns it on for verify-loop. See [Updates](#updates).
- **Idle compaction** off, so a long conversation isn't compacted while you're away.
- Optional: **hold cross-session messages**, so a message from another session doesn't wake an idle one and re-send its whole context. Leave it off if you coordinate several sessions.
- **Status line** with the context used and a hint for when `/clear` is worth it:

  ```
  Opus 5.5 · ctx ▓▓▓░░░░░░░ 31% (compact at 70%) · committed: good moment to /clear before the next task
  Opus 5.5 · ctx ▓▓▓░░░░░░░ 34% (compact at 70%) · cache cold: next message re-reads all context, /clear is cheaper for a new task
  Opus 5.5 · ctx ▓▓▓▓▓▓░░░░ 64% (compact at 70%) · context almost full: /clear if the next task is unrelated
  ```

  The hint shows up after a commit in the session (with at least 20% used), when the prompt cache has expired, or within 10 points of the compact threshold.

## Which models to use

The main model does almost all the work; the [advisor](https://code.claude.com/docs/en/advisor) is a stronger model it consults at decision points (planning, recurring errors). Our recommendation:

| Your situation | Main model | Advisor |
|---|---|---|
| **Max or Ultra plan**, or a complex project (large codebase, architecture work, hard bugs) | Opus 5.5, medium effort | Fable 5.2 |
| **Pro plan**, or a simpler project (small app, scripts, routine features) | Sonnet 5.5, medium effort | Opus 5.5 |

**Project complexity matters more than the plan.** A Max subscriber building a small script is better off with the Pro row, and a Pro subscriber on a hard codebase can move up to Opus 5.5 + Fable 5.2 if their limits allow it.

Both pairings are accepted by Claude Code: the advisor must rank at or above the main model. Before choosing Fable, read [Advisor and Fable billing](#advisor-and-fable-billing): on some plans it is billed to usage credits. `/verify-loop:setup` asks which row fits you.

## Install

In a Claude Code session (terminal, desktop app or VS Code):

```
/plugin marketplace add pedrowillen/verify-loop
/plugin install verify-loop@verify-loop
```

Then run the one-time setup:

```
/verify-loop:setup
```

Start a new session afterwards. In the desktop app you can also use **+ → Add plugins** after adding the marketplace.

### Requirements

- **Claude Code** with plugin support.
- **bash** for the hooks (on Windows: [Git for Windows](https://git-scm.com/download/win), which Claude Code already uses).
- **Node.js** for the test-output trimmer.
- Optional: [ponytail](https://github.com/DietrichGebert/ponytail) for `/ponytail-review`. Without it the rules fall back to `/code-review` and `/simplify`.

## The workflow

1. **Plan.** Consult the advisor when planning a new feature and when an error keeps recurring. Not to declare done: the reviews cover that.
2. **Implement**, with a test for new logic.
3. **`/verify-loop:verify`**: run the change for real. At most 3 fix rounds, then stop and ask.
4. **`/ponytail-review`** on non-trivial changes.
5. **`/security-review`** only when the diff touches auth, user input, secrets, network, files, dependencies or personal data.
6. **Re-verify** if the reviews changed code.
7. **Commit.**

If launching the app takes digging (database, env file, multi-step build), run Claude Code's bundled `/run-skill-generator` once per project: it records the recipe in `.claude/skills/run-<name>/`, and verification follows it instead of rediscovering it every session.

Your project's `CLAUDE.md` wins on commands and stricter rules. If it duplicates or contradicts this workflow, Claude points out the lines and offers to remove them.

## Commit gate log

The gate writes to `~/.claude/plugins/data/verify-loop-verify-loop/gate.log`:

```
2026-11-17 18:02:11 | ponytail-review security-review verify | C:/projects/app | <session id>
2026-11-17 19:40:05 | none | C:/projects/app | <session id>
```

Use it for a week or two to see how often commits go out unverified. Known limit: it counts any review in the session, even if edits came after it.

## Optional: code intelligence

Language servers let Claude navigate by symbol and see type errors right after each edit, instead of grepping and reading many files. Install the server binary, then the official plugin:

| Language | Binary | Plugin |
|---|---|---|
| TypeScript / JavaScript | `npm install -g typescript-language-server typescript` | `typescript-lsp@claude-plugins-official` |
| Java | [Eclipse JDT.LS](https://download.eclipse.org/jdtls/milestones/) + JDK 17+ | `jdtls-lsp@claude-plugins-official` |
| Others | see the [official table](https://code.claude.com/docs/en/plugins/code-intelligence) | |

**Java on Windows:** the plugin runs a command named `jdtls`, and the bundled `jdtls.bat` ends with `pause`, which hangs. Extract JDT.LS (for example to `%USERPROFILE%\.local\share\jdtls`) and put this `jdtls.cmd` in a folder on your `PATH` (requires Python):

```bat
@echo off
python "%USERPROFILE%\.local\share\jdtls\bin\jdtls" %*
```

## Advisor and Fable billing

On some plans, Fable usage (including Fable as the advisor) is billed to **usage credits**. When that applies, the Fable row in the `/model` picker says "Requires usage credits", and Claude Code asks for consent once, via `/model fable`; after that there is no further warning and no spending cap. If you see that label and don't want extra charges, use Opus 5.5 as the advisor instead. Watch the usage-credits row in `/usage`, and set a monthly limit in claude.ai → Settings → Usage.

Each advisor call re-reads the whole conversation without cache, so short sessions (`/clear` between unrelated tasks) also make the advisor cheaper.

## Updates

With auto-update on (setup does it, or `/plugin` → **Marketplaces** → verify-loop → **Enable auto-update**), Claude Code checks for a new version in the background after a session starts. The new version loads in the next session, or right away with `/reload-plugins`. To update by hand: `/plugin` → **Installed** → verify-loop → **Update now**.

On the first session after an update, Claude tells you the new version in one line and points to the [changelog](CHANGELOG.md). Run `/verify-loop:setup` again to pick up new settings; it only asks about what changed. The status line copy updates by itself.

## Uninstall

```
/plugin uninstall verify-loop@verify-loop
```

Setup keeps a backup at `~/.claude/settings.json.bak-verify-loop`. The status line script lives in `~/.claude/verify-loop/`; remove it and the `statusLine` key to turn it off. Version 0.2.0 wrote compact instructions between `<!-- verify-loop:compact -->` markers in `~/.claude/CLAUDE.md`; you can delete that block, the plugin now sends them itself.

## License

[MIT](LICENSE)
