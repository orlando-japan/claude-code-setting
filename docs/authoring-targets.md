# Authoring custom target adapters

The harness ships with two built-in targets: `claude` (Claude Code) and `codex` (OpenAI Codex). Custom target adapters let you extend the harness for other AI coding tools — Cursor, Aider, Gemini CLI, or anything else — without modifying the core package.

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
      "requiredUserFiles": [".cursorrules"]
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
        "instructionFile": ".cursorrules"
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
