#!/usr/bin/env bash
# Pre-tool-use guard for Write / Edit / MultiEdit.
#
# Blocks edits to files that should never be touched by an agent:
#   - Secret files (.env, credentials, key material)
#   - Lockfiles outside of dependency-bump operations
#   - Git internals
#
# Exit codes:
#   0 → allow
#   2 → block with reason printed to stderr

set -euo pipefail

input=$(cat)

block() {
  printf 'Blocked by company harness: %s\n' "$1" >&2
  printf 'If this edit is intentional, ask the user to perform it manually.\n' >&2
  exit 2
}

# Extract the target file path. The field is either "file_path" (Write/Edit) or
# appears inside an "edits" array (MultiEdit). We match the raw JSON for any of them.
paths=$(printf '%s' "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/' || true)

if [ -z "$paths" ]; then
  exit 0
fi

while IFS= read -r p; do
  [ -z "$p" ] && continue
  base=$(basename "$p")

  case "$base" in
    .env|.env.*|*.pem|*.key|id_rsa|id_ed25519|id_ecdsa|*.p12|*.pfx|credentials|credentials.json|service-account.json)
      block "attempting to write a secret or key file: $p"
      ;;
  esac

  case "$base" in
    .bashrc|.bash_profile|.bash_aliases|.bash_logout|.zshrc|.zshenv|.zprofile|.profile|.gitconfig)
      block "attempting to edit shell startup or git config: $p — ask the user to do this manually"
      ;;
  esac

  case "$p" in
    */.git/*|.git/*)
      block "attempting to write inside .git/: $p"
      ;;
    */.ssh/*|*/.gnupg/*)
      block "attempting to write inside .ssh/ or .gnupg/: $p"
      ;;
  esac
done <<< "$paths"

exit 0
