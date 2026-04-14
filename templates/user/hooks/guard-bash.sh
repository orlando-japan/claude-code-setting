#!/usr/bin/env bash
# Pre-tool-use guard for Bash commands.
#
# Blocks a small, high-confidence list of destructive patterns.
# This is a safety net, NOT a substitute for the permission system —
# permissions should be the primary gate. This hook exists to catch
# things that slip through wildcards.
#
# Exit codes:
#   0 → allow
#   2 → block with reason printed to stderr
#   1 → hook error (treated as allow by Claude Code, with warning)

set -euo pipefail

input=$(cat)

block() {
  printf 'Blocked by company harness: %s\n' "$1" >&2
  printf 'If you believe this is a false positive, ask the user to run the command manually.\n' >&2
  exit 2
}

# rm -rf against dangerous roots
case "$input" in
  *'"rm -rf /"'*|*'"rm -rf /*"'*|*'"rm -rf ~"'*|*'"rm -rf $HOME"'*)
    block "rm -rf against root or home directory"
    ;;
esac

# Filesystem format and raw device writes
case "$input" in
  *'mkfs'*|*'mkfs.ext'*|*'mkfs.xfs'*|*'mkfs.btrfs'*)
    block "filesystem format command"
    ;;
  *'dd if='*'of=/dev/sd'*|*'dd if='*'of=/dev/nvme'*|*'dd if='*'of=/dev/disk'*)
    block "dd to block device"
    ;;
esac

# Fork bomb
case "$input" in
  *':(){ :|:& };:'*|*':(){:|:&};:'*)
    block "fork bomb pattern"
    ;;
esac

# Force push to protected branches
if printf '%s' "$input" | grep -qE 'git[[:space:]]+push[[:space:]]+([^"]*[[:space:]])?(--force|--force-with-lease|-f[[:space:]])[^"]*(main|master|production|release/)'; then
  block "force push to protected branch — ask the user first"
fi

# git reset --hard with no argument (wipes working tree)
if printf '%s' "$input" | grep -qE 'git[[:space:]]+reset[[:space:]]+--hard([[:space:]]|")'; then
  block "git reset --hard — ask the user before discarding work"
fi

# Piping remote scripts into a shell
if printf '%s' "$input" | grep -qE '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(sh|bash|zsh)([[:space:]]|")'; then
  block "piping a remote script directly into a shell"
fi

# sudo at all (unless the user has explicitly allowed it in their local settings)
if printf '%s' "$input" | grep -qE '"command"[[:space:]]*:[[:space:]]*"sudo[[:space:]]'; then
  block "sudo requires explicit user approval"
fi

exit 0
