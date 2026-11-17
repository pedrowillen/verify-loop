#!/bin/bash
# Trims test output: rewrites the command to show only the last 100 lines.
# Acts only when the whole command is a plain test runner (no pipe, && or redirection).
input=$(cat)
grep -qE 'npm|npx|pytest|go test|mvn|artisan|lune|ng test|cargo|gradle' <<<"$input" || exit 0
# pipefail: without it, tail would hide the exit code of a failing test. Requires Node.js.
node -e '
const i = JSON.parse(require("fs").readFileSync(0, "utf8"));
const c = (i.tool_input || {}).command || "";
const re = /^(npm (run )?test|npx (vitest|jest|playwright test)|ng test|pytest|go test|cargo test|(\.\/)?mvnw? (test|verify)|(\.\/)?gradlew? test|(docker exec \S+ )?php artisan test|lune run (check|test))( [^;&|<>`$#\\\x00-\x1f]*)?$/;
if (i.tool_name === "Bash" && re.test(c))
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse",
    updatedInput: { ...i.tool_input, command: "set -o pipefail; " + c + " 2>&1 | tail -n 100" } } }));
' <<<"$input"
exit 0
