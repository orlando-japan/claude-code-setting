# Roadmap

This document records the planned feature expansions for the harness. It was drafted after the 0.1.x baseline stabilised (init / update / doctor + two-target support).

## Guiding constraints

Before accepting any new feature, check it against the design philosophy in `docs/architecture.md`:

- **Thin provider adapters.** Don't bundle every tool's quirks into one monolith.
- **Manifest-based safe overwrite.** Do not replace SHA-256 hashing with 3-way merge.
- **Docs reflect reality.** No placeholder commands or unimplemented flags.
- **Private/internal distribution first.** Don't optimise for public npm until it's actually needed.

---

## Phase 1 — Observability & safe rollback ✓ shipped in v0.2.0

The manifest already tracks every file's SHA-256, but users cannot see that information. This phase adds a thin layer of read access on top of the existing model.

Each command is independently shippable; none touches core install logic.

Manifest schema extended in v0.2.0: file records are now `{ hash, source }` objects.
Old string-hash manifests remain readable via `getFileRecord` for backwards compat.
The `source` field records which template directory each file came from — required by
`diff` and `restore`, and pre-positions Phase 3's overlay layer.

### `status` command ✓

List every manifest-tracked file with its current state:

| State | Meaning |
|---|---|
| `unchanged` | On-disk hash matches manifest |
| `locally-modified` | On-disk hash differs from manifest |
| `missing` | File tracked in manifest but absent on disk |
| `drifted` | File exists, not in manifest (untracked by harness) |

Usage:

```
company-cc status [--target <claude|codex|both>]
```

### `diff <path>` command ✓ between the locally-modified file and the template version the harness shipped.

```
company-cc diff rules/coding-principles.md
```

Read-only. Enables informed decisions before `--force`.

### `restore <path>` command ✓ with the template version and update the manifest entry. Asks for confirmation before writing.

```
company-cc restore rules/coding-principles.md
```

Complements `diff`: the natural next action after reviewing a diff.

### `uninstall` command ✓ from a target home, leave user-added files untouched, then delete the manifest. Runs as a dry-run by default; requires `--confirm` to execute.

```
company-cc uninstall [--target <claude|codex|both>] [--confirm]
```

---

## Phase 2 — Authoring & operator UX

Polish the experience for template authors and team operators.

### Fine-grained `--extras`

Change `--extras` from a boolean flag to an optional comma-separated list:

```
company-cc init --extras              # install all extras (current behaviour)
company-cc init --extras=ops,frontend # install only named bundles
```

Backwards-compatible: bare `--extras` still installs everything.

### Project-file semantic validation in `doctor`

Parse the project `CLAUDE.md` / `AGENTS.md` after install and warn if the required skeleton sections are still unfilled:

- What this project is
- How to run and verify it
- Current priorities
- Guardrails / danger zones

Warning only; does not block.

### Interactive `init`

When `company-cc init` is called with no flags, prompt for target, scope, and extras using the `prompts` dependency already in `package.json`.

Non-interactive environments (CI, piped stdin) fall back to current defaults automatically.

### `--json` output mode

Add `--json` flag to all commands. Returns a machine-readable summary useful for CI wrappers.

```
company-cc doctor --json
company-cc status --json
```

### `company-cc ci` check

Alias or subcommand that exits non-zero when the project-level instruction file is missing or its manifest is stale. Designed to run as a CI step on repos that have adopted the harness.

---

## Phase 3 — Extensibility

The strategic phase. Enables "company-wide" to mean one baseline with many team layers, not one monolith.

### Team overlay layer

Add support for additional template sources layered on top of the company baseline.

Config file (`.company-cc.json`) at user or project level can declare extra sources:

```json
{
  "overlays": [
    "./team-templates",
    "@team/harness-addons"
  ]
}
```

Overlay priority: `personal > team > company baseline`. Later sources win on file conflicts.

Manifest extension: each tracked file records its `source` so conflicts are attributable.

This is the unlock for team customisation without forking the repo.

### Custom target adapters

Make `TARGETS` in `src/lib/targets.js` extensible via config or a plugin entry point, so third parties can register Cursor, Aider, Gemini CLI, etc. without modifying core.

Candidate interface: `company-cc.targets.<name>` field in a package's `package.json`, resolved at runtime from `node_modules`.

---

## Phase 4 — Nice-to-haves

Lower priority. Add when a clear need emerges.

### `backup` / `rollback`

Before each `update`, snapshot the current state of all tracked files under `~/.claude/.company-cc-backups/<timestamp>/`. Add `company-cc rollback` to restore from the most recent backup.

### Template author linter

Dev-time tool (potentially only as an npm test script) that validates:

- Skill and command frontmatter completeness
- `@rule` import paths resolve
- `settings.json` conforms to the provider's published JSON schema

### Explicit non-goals

The following were considered and deferred indefinitely:

- **Telemetry / usage metrics** — requires a backend; complexity/benefit ratio is poor.
- **Skill registry / remote catalog** — Phase 3 overlays cover team distribution; a public registry is speculative.
- **CLI self-update (`company-cc upgrade`)** — `npm i -g @company/claude-code-setting@latest` already works.
