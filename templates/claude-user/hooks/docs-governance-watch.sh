#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

extract_command() {
  printf '%s' "$input" \
    | grep -oE '"command"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"' \
    | head -1 \
    | sed -E 's/.*"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)"/\1/' \
    | sed 's/\\"/"/g'
}

warn() {
  printf 'Company governance warning: %s\n' "$1" >&2
}

cmd=$(extract_command || true)
[ -z "$cmd" ] && exit 0

if ! printf '%s' "$cmd" | grep -qE '(^|[[:space:]])git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

changed_docs=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -Ei '(^|/)(README\.md|docs?/.*\.md$|.*(PRD|SDD).*\.md$|.*\.md$)' || true)
[ -z "$changed_docs" ] && exit 0

if printf '%s\n' "$changed_docs" | grep -Eiq '(summary|quick-reference|checklist|handoff|legacy|patch|delta|rereview|v[0-9]+).*\.md$'; then
  warn 'doc changes include files that often indicate fragmentation; consider running doc-defrag-audit.'
fi

warn 'docs changed in this commit/push; consider running doc-defrag-audit and governance-link-drift-audit before merging.'
exit 0
