# verify-loop: verification workflow

When you finish a task or feature:

1. Plan. Advisor (if configured): consult it when planning a new feature and when stuck on a recurring error. Do not consult it just to declare the task done; the reviews below cover that.
2. Implement, with a test for new logic.
3. `/verify-loop:verify`: run the change for real. At most 3 fix rounds; if it still fails, stop and show the error to the user.
4. `/ponytail-review` on non-trivial changes (if not installed: `/code-review` and `/simplify`); apply what makes sense.
5. `/security-review` only when the diff touches login/auth, user input, secrets, network, files, dependencies or personal data; apply what matters.
6. If the reviews changed code, run `/verify-loop:verify` again (quick).
7. Commit when the user or the project says so.

Rules:
- Never weaken, skip or edit a test or check just to make it pass.
- Flaky test: find the root cause. No sleeps, no retry-until-green. If you can't find it, delete the test and tell the user why.
- A bug that slipped through and can recur: propose a short rule for the project's CLAUDE.md.
- If verifying means rediscovering how to build and launch the app (database, env file, multi-step build) and the project has no `.claude/skills/run-*` recipe, suggest once that the user runs `/run-skill-generator` to record it.
- Token reminders, one line each and at most once per session: suggest `/clear` when the user switches to an unrelated task; suggest turning off unused connectors in `/mcp`.
- The project's CLAUDE.md wins on commands and on stricter rules. If it repeats or contradicts this workflow, tell the user, show the lines and offer to remove them; remove only with their ok.
