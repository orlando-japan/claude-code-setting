# Authoring custom target adapters

The harness ships with two built-in targets: `claude` (Claude Code) and `codex` (OpenAI Codex). Custom target adapters let you extend the harness for other AI coding tools — Cursor, Aider, Gemini CLI, or anything else — without modifying the core package.

Navigation note:
- Product entrypoint: `../README.md`
- Documentation Home: `README.md`
- Technical architecture truth: `architecture.md`

This file is the **source of truth for target semantics**.

## Built-in target philosophy

The harness ships with two built-in targets:
- `claude` → a richer target with Claude-specific user assets such as settings, commands, hooks, and agents
- `codex` → a lightweight target centered on `AGENTS.md` plus shared rules

Important design rule:

> The goal is **governance parity, not file-tree parity**.

That means Claude and Codex should share the same core rules and lifecycle (`init` / `update` / `doctor` / `ci` / `rollback`), while still keeping target-specific entry files and runtime assumptions.

In the current implementation, target adapters feed a shared control plane:
- **plan** decides which target/profile combinations should run
- **runner** applies template files and finalizes manifests
- **cleanup** handles update-only aftercare such as stale-skill removal

So when you author a new target, think of it as supplying target-specific inputs to a shared lifecycle, not as creating a separate installer.

For Codex specifically, the minimum bar is:
- user profile installed with shared rules + `AGENTS.md`
- project `AGENTS.md` present and customized
- `doctor` / `ci` able to check the minimum required project sections

The goal is not to clone Claude's richer runtime assets into Codex unless Codex has a real mechanism to consume them.

## How it works

The harness reads `.company-cc.json` from your home directory (for user-profile installs) and your project root (for project-profile installs). Any `targets` key found there is registered as a custom target, available to all `company-cc` commands via `--target <name>`.

## Config format

```json
{
  "targets": {
    "cursor": {
      "displayName": "Cursor",
      "userDest": "~/.cursor",
      "userManifestName": ".company-cc-cursor-manifest.json",
      "projectManifestName": ".company-cc-cursor-manifest.json",
      "userSrcs": ["./cursor-templates/shared", "./cursor-templates/user"],
      "projectSrcs": ["./cursor-templates/project"],
      "instructionFile": ".cursorrules",
      "requiredUserFiles": [".cursorrules"],
      "requiredProjectSections": [
        { "prefix": "## 1.", "label": "What this project is" },
        { "prefix": "## 2.", "label": "How to run and verify" }
      ]
    }
  }
}
```

### Field reference

| Field | Required | Default | Description |
|---|---|---|---|
| `displayName` | no | target name | Human-readable label used in log output |
| `userDest` | no | `~/.<name>` | Absolute path to the target's home directory. Supports `~` expansion. |
| `userManifestName` | no | `.company-cc-<name>-manifest.json` | Manifest filename for user installs |
| `projectManifestName` | no | `.company-cc-<name>-manifest.json` | Manifest filename for project installs |
| `userSrcs` | yes | — | Paths to template directories for user-profile files. Paths are relative to the config file's directory, or absolute. |
| `projectSrcs` | yes | — | Paths to template directories for project-profile files. |
| `instructionFile` | no | `AGENTS.md` | Filename of the project instruction file (used by `doctor` and `ci`) |
| `requiredUserFiles` | no | `[]` | Paths that `doctor` will flag as fatal if missing from `userDest` |
| `requiredProjectSections` | conditionally required | `[]` | Required when `projectSrcs` is non-empty. Section contract used by `doctor`/`ci` to verify the customized project instruction file. Accepts strings or `{ prefix, label }` objects. |

## Minimum governance contract

If a custom target defines `projectSrcs`, it must also define `requiredProjectSections`.

That is the minimum governance contract for project targets:
- the harness can install the target's project instruction file
- `doctor` can warn when key sections are missing
- `ci` can fail when the customized project file is structurally incomplete

Without that contract, a custom target is only “installable”, not “governable”, and the CLI now rejects the config.

## Template directory structure

Template source directories (`userSrcs`, `projectSrcs`) use the same flat structure as the built-in templates — files are relative to the target home directory:

```
cursor-templates/
  user/
    .cursorrules              → ~/.cursor/.cursorrules
    rules/
      coding-principles.md   → ~/.cursor/rules/coding-principles.md
  project/
    .cursorrules              → ./.cursorrules
```

## Using the custom target

Once `.company-cc.json` is in place:

```bash
company-cc init --target cursor
company-cc update --target cursor
company-cc status --target cursor
company-cc doctor --target cursor
company-cc ci --target cursor
```

## npm package adapters

For team-wide distribution, publish an npm package that embeds the target definition in its own `package.json`:

```json
{
  "name": "@yourorg/cursor-harness",
  "company-cc": {
    "targets": {
      "cursor": {
        "displayName": "Cursor",
        "userDest": "~/.cursor",
        "userSrcs": ["templates/user"],
        "projectSrcs": ["templates/project"],
        "instructionFile": ".cursorrules",
        "requiredProjectSections": [
          { "prefix": "## 1.", "label": "What this project is" },
          { "prefix": "## 2.", "label": "How to run and verify" }
        ]
      }
    }
  }
}
```

The harness resolves paths inside the package relative to the package root. Then tell users to install the adapter and reference it:

```json
{
  "adapterPackages": ["@yourorg/cursor-harness"]
}
```

```bash
npm i -g @yourorg/cursor-harness
company-cc init --target cursor
```

## Extending vs forking

Use a custom adapter when you need to support an additional AI tool alongside the company baseline. Fork the repo when you need to change built-in Claude or Codex behavior, or modify the CLI itself.

Custom adapters and the built-in targets are independent — users can have all of them installed simultaneously with no manifest conflicts, since each target uses its own manifest file.
