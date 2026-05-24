# Claude-code-setting v0.6.0 Release Note

- Version: `0.6.0`
- Status: Ready for release communication
- Date: 2026-05-24
- Internal references:
  - `docs/prds/claude_code_setting_v0.6_readiness_brief.md`
  - `docs/prds/claude_code_setting_v0.6_prd.md`
  - `docs/prds/claude_code_setting_v0.6_sdd.md`
  - `docs/prds/claude_code_setting_v0.6_closure_review.md`

## Summary

`v0.6.0` upgrades `claude-code-setting` from a usable internal harness into a more explainable, more integratable AI engineering control plane.

This release focuses on three outcomes:
- make lifecycle behavior explainable
- make lifecycle output easier for automation/operator workflows to consume
- tighten governance around custom targets and release verification without bloating the CLI core

## What’s new

### 1. Explain / provenance surface
New explainability commands:
- `company-cc explain init`
- `company-cc explain update`
- `company-cc explain path <relPath>`
- JSON mode supported on explain flows

These commands expose:
- which target/profile plans would run
- resolved extras / overlays context
- file provenance (`source`)
- current disk state and likely update behavior

### 2. Lifecycle JSON surface
Machine-readable output is now available on key lifecycle commands:
- `init --json`
- `update --json`
- `rollback --json`
- `uninstall --json`

This makes the harness easier to wrap from CI, bots, and operator workflows without parsing human log text.

### 3. Custom target governance tightened
Custom targets now support a minimum project governance contract via `requiredProjectSections`.

This means:
- custom project targets are not only installable
- they are also structurally checkable by `doctor` / `ci`

### 4. Operator release verification
New release gate:
- `company-cc verify-release`
- `company-cc verify-release --json`

Current minimum checks:
- CLI help smoke (`node src/cli.js --help`)
- `npm test --silent`
- `npm pack --dry-run --json`
- required packaged docs / product entry files present in tarball

## Architecture impact

This release keeps the internal control flow aligned with the intended split:
- `plan`
- `runner`
- `cleanup`

New surfaces were added without pushing orchestration complexity back into `src/cli.js`.

## Documentation updates

Documentation now better reflects the actual product surface:
- bilingual README entrypoints
- bilingual docs home
- architecture truth source
- target-authoring truth source
- v0.6 closure review and release communication artifacts

## Non-goals / not included

This release does **not** introduce:
- a plugin platform rewrite
- telemetry / usage metrics
- self-update flow
- Codex mirror-cloning of Claude-specific runtime assets
- 3-way merge replacing manifest safe-overwrite

## Validation snapshot

Release validation currently passes with:
- `npm test --silent`
- `node src/cli.js verify-release --json`

Current package artifact name:
- `company-claude-code-setting-0.6.0.tgz`

## Suggested external one-liner

> `claude-code-setting v0.6.0` adds explainability, machine-readable lifecycle output, tighter custom-target governance, and a formal release verification gate — while preserving the lightweight `plan -> runner -> cleanup` architecture.
