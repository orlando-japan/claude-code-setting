# Changelog

All notable changes to `@company/claude-code-setting` will be documented in this file.

This project follows a practical Keep a Changelog style.

## [0.5.0] - 2026-04-25

### Added
- Added four new opt-in governance and commit-gate skills:
  - `doc-defrag-audit`
  - `governance-link-drift-audit`
  - `git-clean-commit-guard`
  - `commit-review-gate`
- Added a documented Governance bundle install path in `README.md`.
- Added a hard local git commit hygiene hook:
  - `templates/claude-user/hooks/git-commit-gate.sh`
- Added a warning-only docs governance local hook:
  - `templates/claude-user/hooks/docs-governance-watch.sh`
- Added a project-level GitHub Actions workflow for docs governance:
  - `templates/claude-project/.github/workflows/docs-governance.yml`
- Added test coverage for:
  - governance hook installation
  - executable mode preservation for installed hook scripts
  - project workflow installation and manifest tracking

### Changed
- Upgraded package version to `0.5.0`.
- Clarified automation behavior in `README.md`, explicitly separating:
  - hard-blocking local hooks
  - warning-only local hooks
  - project CI behavior
- Expanded docs-governance CI triggering to all `push` and `pull_request` events, while keeping runtime behavior quiet when no docs changed.
- Updated template installation behavior so installed hook shell scripts preserve executable permissions.
- Updated hook authoring documentation to reflect the expanded automation model.

### Notes
- Commit hygiene is now enforced locally.
- Document governance is now automated in two layers:
  - warning-only local hook behavior
  - GitHub Actions CI warnings for project installs

## [0.4.1] - 2026-04-25

### Changed
- Documentation patch release.
- Refined release-facing project documentation and release presentation.

## [0.4.0] - 2026-04-25

### Added
- Added skills management commands for listing and removing installed skills.
- Added grouped extras-skill installation model.
- Added broader skill catalog support across 6 groups.
- Added `ci` command and JSON output support for `doctor`, `status`, and `ci`.
- Added team overlay layer and custom target adapter support via `.company-cc.json`.
- Added interactive `init` and manifest migration support for older installs.

### Changed
- Promoted the project to a production-ready internal distribution baseline.
- Expanded the packaged harness to include shared rules, target-specific templates, hooks, and extra skills as a coherent installable system.
