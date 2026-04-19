# Authoring overlays

Overlays let a team layer additional files on top of the company baseline without forking the repo. Files in an overlay directory are installed after the base templates, so they can add new rules/skills or replace base files for a specific team.

## Config file

Create `.company-cc.json` in the relevant location:

- **`~/.company-cc.json`** — applies to user-profile installs (`init --user`)
- **`./.company-cc.json`** (in project root) — applies to project-profile installs (`init --project`)

```json
{
  "overlays": [
    "./team-templates",
    "@yourorg/harness-addons"
  ]
}
```

Multiple overlays are applied in order. Later entries win when two overlays ship the same path.

## Overlay directory structure

An overlay directory mirrors the destination home directory. Files at `overlay/rules/team-rule.md` install to `~/.claude/rules/team-rule.md`.

Example:

```
team-templates/
  rules/
    team-security.md
    team-api-style.md
  skills/
    deploy-workflow/
      SKILL.md
```

## Overlay path formats

| Format | Resolved from |
|---|---|
| `"./relative/path"` | Directory of the config file |
| `"../relative/path"` | Directory of the config file |
| `"/absolute/path"` | Absolute path on disk |
| `"@org/package"` | `node_modules` — walked up from config file |
| `"package-name"` | `node_modules` — walked up from config file |

If a path does not exist, the harness warns and continues — a missing overlay never fails an install.

## Priority

Overlay files are applied after base templates. Within overlays, later entries in the array win.

Priority order (lowest → highest): `company baseline → overlays[0] → overlays[1] → ...`

A base template file that is already unchanged on disk will be overwritten by the overlay version. A file the user has locally modified is always skipped (same as base template behavior).

## Manifest tracking

Overlay files are tracked in the manifest the same way as base template files. The `source` field records the overlay directory path, enabling `diff` and `restore` to work correctly:

```
company-cc diff rules/team-security.md   # diffs against the overlay source
company-cc restore rules/team-security.md  # restores from overlay source
```

## npm package overlays

For team-wide distribution, publish an npm overlay package and install it globally or as a dev dependency:

```bash
npm i -g @yourorg/harness-addons
```

Then reference it in `.company-cc.json`:

```json
{ "overlays": ["@yourorg/harness-addons"] }
```

The package root is the overlay directory — structure it the same as a local overlay folder.

## When to use overlays vs forking

Use overlays when:
- A team wants additional rules or skills on top of the company baseline
- Different teams need different settings or hooks
- You want updates from the company baseline to flow through automatically

Fork the repo when:
- You want to change or remove base template files (overlays can only add/replace, not delete)
- You need changes to the CLI behavior itself
