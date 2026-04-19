# Rules reference

Rules live in `templates/shared/rules/` and are installed to `~/.claude/rules/` (and `~/.codex/rules/`) by `company-cc init`. They form the **always-on behavioral constraints** for every AI session.

## Which rules are active by default?

The Claude profile imports rules from `templates/claude-user/CLAUDE.md` via `@rules/<name>.md`. Any rule listed there is loaded into every Claude Code session automatically. Rules not listed there are available on disk but inactive until a project `CLAUDE.md` (or your personal `~/.claude/CLAUDE.md`) adds them.

| Rule file | Default in CLAUDE.md | Summary |
|---|---|---|
| `coding-principles.md` | ✓ | Think before coding, simplicity first, surgical edits, goal-driven execution |
| `code-style.md` | ✓ | Match the file's existing style, minimal comments, dependency hygiene |
| `security.md` | ✓ | Input validation at boundaries, no secrets in code/logs/errors, fail-closed auth |
| `error-handling.md` | ✓ | Wrap errors with context, log once at handler, separate user vs internal errors |
| `observability.md` | ✓ | Structured logs, trace ID propagation, no PII/secrets in logs, symptom-based alerts |
| `commit-conventions.md` | ✓ | Conventional commits, one logical change per commit, body explains the why |
| `testing.md` | ✓ | Behavior not implementation, test pyramid, no mocks on owned code, zero flaky tolerance |
| `api-design.md` | — | HTTP semantics, status codes, consistent error JSON, versioning, handler layering |
| `data-access.md` | — | Migration safety, N+1 prevention, transactions, parameterized SQL, bulk-op ritual |

---

## Rule descriptions

### `coding-principles.md`

The four core working principles: **think** before touching code (name assumptions, verify load-bearing ones), **simplicity** (solve exactly what was asked), **surgical** (edit minimum lines, leave unrelated code alone), and **goal-driven** (define done in verifiable terms, then check it). These are the root constraints that all other rules build on.

### `code-style.md`

Style consistency over personal preference. Match indentation, naming, and import order to the file you're editing. Don't reformat on the way through. Language-specific defaults (TypeScript strict mode, Python ruff + type hints, Go gofmt, Rust clippy). Dependency hygiene: don't add one to save five lines.

### `security.md`

Validate inputs only at system boundaries. Never interpolate user input into shells, SQL, HTML, or file paths. Secrets never in code, logs, or error messages. Auth is always server-side — the UI hiding a button is not authorization. For AI sessions specifically: no `rm -rf`, no force-push, no git config changes without explicit user confirmation.

### `error-handling.md`

Every error must be handled — returned, logged, or explicitly discarded with a comment. Wrap errors at layer boundaries with operation context (not just "error occurred"). **Log once, at the handler** — if you return an error, don't also log it. User-facing errors are short and contain no internal detail; internal errors carry full context. Panic only at startup for missing config, never in request-handling code.

### `observability.md`

Structured (JSON) logs in production. Every log line carries `service`, `level`, `timestamp`, `trace_id`. Log **events** ("payment declined"), not code paths ("entered processPayment"). Never log secrets, tokens, PII, or high-frequency normal operations. Generate trace IDs at entry points and propagate them downstream. Alert on user-visible symptoms (error rate, latency p99), not on infrastructure metrics (CPU).

### `commit-conventions.md`

Conventional Commits format (`feat:`, `fix:`, `refactor:`, etc.). Subject is imperative, lowercase, ≤ 72 chars. Body explains **why**, not what (the diff already shows what). One logical change per commit. No secrets, generated files, or `console.log` debug code.

### `testing.md`

Test behavior, not implementation. The three cases: happy path, edge, failure. Bug fixes ship with a reproduction test. Test pyramid: many units, some integration (against real databases), few E2E. Don't mock what you own. Fixtures are minimal and deterministic. Flaky tests are broken tests — fix or delete, never retry.

### `api-design.md` *(opt-in)*

HTTP verbs have defined semantics: GET is safe, PUT/DELETE are idempotent. Status codes matter: 4xx for client errors, 5xx for server faults, never swapped. All error responses use a consistent JSON structure with a machine-readable `code` field. Versioning via `/v1/` prefix; additions are non-breaking, removals require deprecation first. Paginate collections (cursor-based, max 100). HTTP handlers only parse, delegate, serialize — no business logic.

**When to enable:** any project that exposes or calls HTTP APIs. Add `@rules/api-design.md` to the project `CLAUDE.md`.

### `data-access.md` *(opt-in)*

All schema changes go through versioned, reversible migration files. Every migration must be backwards-compatible with the previous app version (rolling deploys). N+1 queries are bugs — use joins or batch loads. Check `EXPLAIN ANALYZE` before shipping a query on a large table. Transactions are short, cover one logical operation, and contain no external side effects. SQL is always parameterized. Before any bulk DELETE/UPDATE in production: run the SELECT first and check the row count.

**When to enable:** any project with a relational database. Add `@rules/data-access.md` to the project `CLAUDE.md`.

---

## Adding rules to a specific project

In your project's `CLAUDE.md`:

```markdown
@rules/api-design.md
@rules/data-access.md
```

These paths resolve relative to `~/.claude/rules/` (or `~/.codex/rules/`), which is where `company-cc init` installs them.

## Writing new rules

See [Authoring rules](authoring-rules.md) for format, naming, and review checklist.
