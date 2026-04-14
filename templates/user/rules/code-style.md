# Code style

## General

- **Match the file.** Whatever indentation, naming, and import order the file already uses, keep it. Don't reformat on the way through.
- **Names do the work.** A well-named identifier makes the code self-documenting. A comment that restates the name is noise.
- **Avoid comments that rot.** Don't reference "current" state ("used by X", "added for Y flow"). Those belong in PR descriptions.
- **Single responsibility per function.** If a function name needs an "and" or "also," split it.
- **Early returns over nested conditionals.** Flat is better than nested.

## Language defaults (override in project CLAUDE.md)

- **TypeScript:** strict mode on. Prefer `type` for aliases, `interface` for extensible object shapes. Use `unknown` over `any`.
- **Python:** type hints on public functions. `ruff` for lint and format. f-strings over `.format()`.
- **Go:** `gofmt`-clean. Return errors, don't panic. Small interfaces.
- **Rust:** `cargo fmt` + `cargo clippy -- -D warnings`. Prefer `?` over `match` for error propagation.

## Imports and dependencies

- **Don't add a dependency to save 5 lines.** Write the 5 lines.
- **Pin major versions.** Don't use `^` for anything security-sensitive or anything you depend on for correctness.
- **Check the maintenance signal.** Last commit > 2 years ago + open CVEs = don't add it.

## Comments

Default: write none. Only add a comment when:

- There's a hidden constraint a reader couldn't infer from the code.
- There's a workaround for a specific upstream bug (link it).
- There's a subtle invariant the types don't express.
- The code deliberately looks wrong for a reason.

Never write comments that:

- Restate what the code does in English.
- Reference the PR, ticket, or author.
- Mark code as "removed" or "TODO: delete" — just delete it.
