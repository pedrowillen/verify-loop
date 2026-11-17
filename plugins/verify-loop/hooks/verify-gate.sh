#!/bin/bash
# Commit gate, observe mode: on every `git commit`, logs which verify/review skills ran in the session.
# Never blocks (always exits 0). Log: ${CLAUDE_PLUGIN_DATA}/gate.log, "none" marks an unverified commit.
input=$(cat)
grep -q 'git commit' <<<"$input" || exit 0

field() { grep -o "\"$1\":\"[^\"]*\"" <<<"$input" | head -1 | cut -d'"' -f4 | sed 's#\\\\#/#g'; }
transcript=$(field transcript_path)

# Matches the Skill tool ("skill":"verify-loop:verify") and slash commands as the transcript stores them.
# Requires unescaped quotes so text quoted inside tool output does not count.
names='verify|ponytail-review|security-review|code-review'
pattern="\"skill\":\"([a-z-]+:)?($names)\"|\"content\":\"<command-message>([a-z-]+:)?($names)</command-message>"
found=$(grep -o -E "$pattern" "$transcript" 2>/dev/null | grep -o -E "$names" | sort -u | tr '\n' ' ' | sed 's/ $//')

# shortcut: counts any review in the session, even if edits followed it, and the transcript is written
# with a delay; fine for observe mode, revisit before adding an enforce mode.
log="${CLAUDE_PLUGIN_DATA:-$HOME/.claude}/gate.log"
mkdir -p "$(dirname "$log")"
echo "$(date '+%F %T') | ${found:-none} | $(field cwd) | $(field session_id)" >> "$log"
exit 0
