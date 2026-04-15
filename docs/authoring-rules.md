# Authoring rules

Shared rules live in `templates/shared/rules/*.md` and are consumed by both Claude and Codex targets. In the Claude profile they are imported from `templates/claude-user/CLAUDE.md` via `@rules/<name>.md` lines, so they become part of the always-loaded context and should stay selective.

## When to add a rule

Add a rule only if all three are true:

1. **It applies broadly.** A rule that fires on one specific file or feature should be a comment in that file or a skill.
2. **It changes behavior, not knowledge.** Reference material belongs in skills or docs. Rules are imperative: "always X", "never Y", "prefer Z".
3. **The model gets it wrong without the rule.** If default behavior is already correct, don't restate it.

## When NOT to add a rule

- Project-specific facts (file paths, service names, ticket trackers) → put in project `CLAUDE.md`, not the global rules.
- Lengthy explanations or examples → put in a skill and reference it.
- Things that are checked by hooks/permissions already (e.g. "don't `rm -rf /`") → the hook is the enforcement; the rule is redundant.

## Format

```markdown
# <topic>

<one-paragraph rationale: why this rule exists>

## Rules

- **Always** <imperative>. <one-line reason>.
- **Never** <imperative>. <one-line reason>.
- **Prefer** <X> over <Y>. <one-line reason>.

## When to break the rule

<short list of explicit exceptions, or "never">
```

Keep each file under ~80 lines. If it's longer, it's probably a skill.

## Naming and registration

1. Create `templates/shared/rules/<kebab-name>.md`.
2. Add `@rules/<kebab-name>.md` to the import block in `templates/claude-user/CLAUDE.md`.
3. Run `company-cc init --user --force` locally to verify it loads.
4. Bump the package version (rules are user-facing; treat as a minor bump).

## Reviewing a rule PR

- Does this conflict with an existing rule? Resolve before merge.
- Does it fire too often / never fire? If you can't think of a recent session where it would have helped, hold off.
- Is the wording imperative and unambiguous? "Try to use X" is not a rule.
- Does it bloat `CLAUDE.md` past the 200-line budget? If so, fold related rules together.
