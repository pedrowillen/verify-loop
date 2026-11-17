#!/bin/bash
# SessionStart: injects the workflow rules, keeps the installed status line in sync with this
# plugin version, and tells Claude once when the plugin was updated.
root="${CLAUDE_PLUGIN_ROOT:?}"
data="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/verify-loop-verify-loop}"

cat "$root/rules.md"

version=$(grep -o '"version": *"[^"]*"' "$root/.claude-plugin/plugin.json" | cut -d'"' -f4)
mkdir -p "$data"
previous=$(cat "$data/version" 2>/dev/null)
# A session still running an older version (opened before the update) must not roll things back.
newest=$(printf '%s\n%s\n' "$previous" "$version" | sort -V | tail -1)
[ "$newest" = "$version" ] || exit 0

# The status line runs from a copy outside the plugin (its path changes on every update).
# Only refresh a copy the user chose to install with /verify-loop:setup.
copy="$HOME/.claude/verify-loop/statusline.js"
if [ -f "$copy" ] && ! cmp -s "$root/skills/setup/statusline.js" "$copy"; then
  cp "$root/skills/setup/statusline.js" "$copy"
fi

if [ -n "$previous" ] && [ "$previous" != "$version" ]; then
  echo
  echo "verify-loop was updated from $previous to $version. In your first reply, tell the user in one line, link https://github.com/pedrowillen/verify-loop/blob/main/CHANGELOG.md and suggest /verify-loop:setup to pick up new settings."
fi
echo "$version" > "$data/version"
exit 0
