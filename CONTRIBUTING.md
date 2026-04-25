# Contributing

This repository is intentionally small: it ships an AI coding harness installer plus the template files that get copied into user and project environments.

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
- `src/lib/targets.js`

When changing installer logic:
- run `npm test`
- run `node src/cli.js --help`
- run at least one real isolated install with a temporary `HOME`
- run `HOME="$TMP_HOME" node src/cli.js update` against that isolated install

### 2. Templates
Examples:
- `templates/shared/...`
- `templates/claude-user/...`
- `templates/codex-user/...`
- `templates/claude-project/...`
- `templates/codex-project/...`
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

## Release notes policy

- Update `CHANGELOG.md` before creating a GitHub release.
- Treat the matching changelog section as the canonical release note source.
- GitHub release notes should be copied or lightly adapted from `CHANGELOG.md`, not rewritten from scratch.
- If the changelog and GitHub release body disagree, fix the release body to match the changelog.

## Pull request checklist

- [ ] `npm test` passes
- [ ] `node src/cli.js --help` still works
- [ ] real isolated install/update smoke was run when installer behavior changed
- [ ] `npm pack --dry-run` was checked before publishing or release tagging
- [ ] local-only files are not included
- [ ] README/docs were updated if needed
- [ ] change scope is clear and minimal
- [ ] templates and installer behavior still match
