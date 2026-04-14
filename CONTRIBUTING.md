# Contributing

This repository is intentionally small: it ships a Claude Code harness installer plus the template files that get copied into user and project environments.

## Ground rules

- Keep the installer simple; prefer plain Node built-ins over framework creep.
- Treat template changes as product changes. If the shipped template behavior changes, update docs too.
- Do not commit local machine state such as `.claude/settings.local.json`, temporary test homes, or generated output folders.
- Prefer additive, low-risk changes over broad rewrites.

## Typical change types

### 1. Installer logic
Examples:
- `src/commands/init.js`
- `src/commands/update.js`
- `src/commands/doctor.js`
- `src/lib/template.js`

When changing installer logic:
- run `npm test`
- run `node src/cli.js --help`
- run `node src/cli.js init --user --dry-run`
- run `node src/cli.js init --project --dry-run`

### 2. Templates
Examples:
- `templates/user/...`
- `templates/project/...`
- `templates/extra/...`

When changing templates:
- verify the target install path still makes sense
- update docs if behavior or recommended usage changed
- prefer editing the existing template over creating overlapping variants

### 3. Docs
Examples:
- `README.md`
- `docs/*.md`

Docs should explain the shipped behavior, not an imagined future state.

## Testing expectations

This repo currently uses a lightweight test baseline:
- CLI smoke tests
- template copy / overwrite-safety tests

When adding behavior that can regress, add at least one targeted test in `test/`.

## Versioning

Bump the package version intentionally when user-facing behavior changes, especially:
- new commands
- changed template behavior
- new shipped rules / skills / hooks
- manifest semantics changes

## Pull request checklist

- [ ] `npm test` passes
- [ ] local-only files are not included
- [ ] README/docs were updated if needed
- [ ] change scope is clear and minimal
- [ ] templates and installer behavior still match
