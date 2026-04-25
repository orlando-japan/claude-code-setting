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

block() {
  printf 'Blocked by company harness: %s\n' "$1" >&2
  exit 2
}

cmd=$(extract_command || true)
[ -z "$cmd" ] && exit 0

if printf '%s' "$cmd" | grep -qE '(^|[[:space:]])git[[:space:]]+add[[:space:]]+(\.|-A|--all)([[:space:]]|$)'; then
  block 'avoid blanket staging (git add . / -A / --all); stage explicit paths instead'
fi

if ! printf '%s' "$cmd" | grep -qE '(^|[[:space:]])git[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

if git diff --cached --quiet; then
  block 'git commit with no staged changes'
fi

staged_files=$(git diff --cached --name-only || true)
[ -z "$staged_files" ] && block 'git commit with an empty staged file set'

if printf '%s\n' "$staged_files" | grep -Eq '(^|/)(\.env(\..*)?|.*\.pem|.*\.key|.*\.p12|.*\.pfx|id_rsa|id_ed25519|id_ecdsa|credentials(\.json)?|service-account\.json)$'; then
  block 'staged commit includes secrets or key material'
fi

if printf '%s\n' "$staged_files" | grep -Eq '(^|/)(node_modules|dist|build|coverage|tmp|temp|\.cache)(/|$)|(^|/)(\.DS_Store|npm-debug\.log|yarn-error\.log)$'; then
  block 'staged commit includes generated output or local junk'
fi

exit 0
