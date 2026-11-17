---
name: verify
description: Run the change for real before reviewing or committing it - the project's own checks (format, lint, tests, build) plus a smoke test of the changed area in the running app. Use when finishing a task or feature, before /ponytail-review and before any commit, or when asked to "verify", "test it" or "run it".
---

# Verify

1. **Find the project's commands**, in this order: verify instructions in the project's CLAUDE.md or a recorded recipe in the project's `.claude/skills/` (such as `run-*` from `/run-skill-generator`; if present, follow it); then `package.json` scripts, `Makefile`, `mvnw`/`gradlew`, `composer.json`, `pyproject.toml`, `Cargo.toml`, etc. Never invent a command the project doesn't have.
2. **Cheap checks first**: format/lint, then tests, then build. Run only what exists. If the project has a single gate command (e.g. `check`, `verify`), use it.
3. **Smoke test the changed area** (skip it when the change has nothing runnable, e.g. docs only):
   - Web: start the dev server and open the page in a browser. Read it as text; take a screenshot only for visual problems.
   - Backend/API: start the service and call the changed endpoint.
   - CLI/script: run it with a real input.
   - Mobile/desktop/game: if it can't run from here, tell the user exactly what to test by hand.
   - Launching took real digging and there is no recipe yet: suggest `/run-skill-generator` once, so the next run follows a recorded recipe.
4. **Failed?** Fix the cause and repeat. At most 3 rounds; then stop and show the error to the user.
5. **Short report**: what ran, what passed or failed, and what was not verified.

Never weaken, skip or edit a test just to make it pass. No sleeps or retries for flaky tests.
