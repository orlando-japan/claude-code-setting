# Authoring hooks

Hooks are shell scripts in `templates/claude-user/hooks/` and are copied to `~/.claude/hooks/` on `init`. They run automatically before or after tool calls — outside Claude Code, as a separate process — and can block dangerous actions before they happen.

Hooks are registered in `templates/claude-user/settings.json` under the `hooks` key.

## How hooks work

Claude Code invokes a hook by:
1. Matching the active tool against the `matcher` pattern in `settings.json`.
2. Piping the tool's JSON input to the hook's stdin.
3. Reading the hook's exit code:

| Exit code | Meaning |
|---|---|
| `0` | Allow — tool call proceeds normally |
| `2` | Block — Claude Code cancels the tool call; stderr is shown as the reason |
| `1` | Hook error — treated as allow, with a warning in the session |

The hook receives the full tool input as a JSON string on stdin. It must parse that JSON to inspect parameters.

## Hook types

Currently two hooks ship:

| File | Matcher | Purpose |
|---|---|---|
| `guard-bash.sh` | `Bash` | Blocks a short list of high-confidence destructive shell patterns |
| `guard-edit.sh` | `Write\|Edit\|MultiEdit` | Blocks writes to secret files, `.git/`, `.ssh/`, `.gnupg/` |

These are safety nets, not the primary access control — `settings.json` permissions are the first gate. Hooks exist to catch patterns that slip through permission wildcards.

## Writing a hook

```bash
#!/usr/bin/env bash
set -euo pipefail

input=$(cat)          # full tool input JSON on stdin

block() {
  printf 'Blocked by company harness: %s\n' "$1" >&2
  printf 'If intentional, ask the user to run this manually.\n' >&2
  exit 2
}

# inspect $input and call block() if dangerous
case "$input" in
  *'dangerous-pattern'*) block "reason" ;;
esac

exit 0
```

Rules:
- Always `set -euo pipefail`. Unexpected hook crashes exit `1` (allow + warning), but fail-safe is still better.
- Parse stdin as text with `grep`, `case`, or `jq`. Don't assume structure beyond what the specific tool sends.
- `block()` must write to **stderr** — stdout is ignored by Claude Code.
- Exit `2` to block, `0` to allow. Never exit `2` on a false positive path without a clear reason string.
- Keep pattern matching conservative: prefer exact strings or tight regexes over broad wildcards. False positives break legitimate workflows.

## Registering a hook in settings.json

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "$HOME/.claude/hooks/my-guard.sh"
        }
      ]
    }
  ]
}
```

`matcher` is a tool name or `|`-delimited list of tool names (e.g. `"Write|Edit|MultiEdit"`).

`PreToolUse` fires before the tool executes. This is where safety guards belong — blocking after the fact is too late.

## Adding a hook

1. Create `templates/claude-user/hooks/<name>.sh` and make it executable (`chmod +x`).
2. Register it in `templates/claude-user/settings.json` under the correct matcher.
3. Test locally:
   - Trigger the blocked pattern and confirm exit `2` + clear error message.
   - Trigger a safe variant and confirm exit `0` with no interference.
   - Trigger an ambiguous pattern and confirm you made a deliberate call (block or allow).
4. Bump the package version (new hooks change security behavior; treat as a minor bump).

## Reviewing a hook PR

- **False positive rate** — what legitimate command does this pattern accidentally block? Test it.
- **False negative** — does the pattern miss obvious variants? (e.g. blocking `rm -rf /` but not `rm -rf /home`)
- **Error message** — is the block reason specific enough for a user to understand what triggered it and how to work around it?
- **Overlap with permissions** — if `settings.json` already denies this pattern, does the hook add meaningful defense-in-depth, or is it redundant noise?
- **Scope** — does this belong in the shared harness, or is it project-specific? Project-level hooks belong in the project's own `.claude/settings.json`, not here.

## What NOT to put in hooks

- Business logic or project-specific rules — those belong in project-level settings.
- Checks already enforced by the permissions `deny` list — redundant hooks add maintenance cost for no gain.
- Anything stateful (writing files, calling external APIs) — hooks must be fast and side-effect-free. Slow hooks block every matching tool call.
