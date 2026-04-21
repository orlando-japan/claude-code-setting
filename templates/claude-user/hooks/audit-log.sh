#!/usr/bin/env bash
# Audit log for Bash commands executed in Claude Code sessions.
# Always exits 0 — never blocks, only records.
#
# Log destination: $CLAUDE_AUDIT_LOG or ~/.claude/harness-audit.log
# Format: <ISO8601-UTC>\tcmd\t<command-string>

set -euo pipefail

LOG="${CLAUDE_AUDIT_LOG:-$HOME/.claude/harness-audit.log}"

input=$(cat)

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
cmd=$(printf '%s' "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 \
  | sed -E 's/.*"command"[[:space:]]*:[[:space:]]*"([^"]*)"$/\1/' || true)

printf '%s\tcmd\t%s\n' "$ts" "${cmd:-<unparsed>}" >> "$LOG" 2>/dev/null || true

exit 0
