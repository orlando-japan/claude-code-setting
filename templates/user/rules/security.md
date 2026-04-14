# Security rules

## Inputs and outputs

- **Validate at system boundaries only.** User input, external APIs, message queues. Don't re-validate internal function args — trust the type system.
- **Never interpolate user input into shells, SQL, HTML, or file paths.** Use parameterized APIs. If you must concatenate, explain why in a comment.
- **Escape by context, not by input.** HTML-escape for HTML, shell-escape for shell, JSON-encode for JSON. The same string has different danger in different contexts.

## Secrets

- **Never commit secrets.** If you see one, flag it and stop — don't just remove it from the current change, the history is now tainted.
- **No secrets in logs.** Redact tokens, passwords, keys, PII before logging. Build a redactor, not a promise.
- **No secrets in error messages shown to users.** Error messages cross trust boundaries.
- **Rotation beats strength.** A rotated weak secret beats an unrotated strong one.

## Auth

- **Authenticate before authorize.** Check who they are before checking what they can do.
- **Fail closed.** Default-deny on missing permissions, not default-allow.
- **Check at the boundary, not the UI.** UI hiding a button is not authorization. Enforce on the server.
- **Session tokens in httpOnly, secure, sameSite cookies.** Not in localStorage.

## Dependencies

- **Audit new deps.** Check license, maintenance, CVEs before adding.
- **Lockfiles committed, always.** Reproducible installs or nothing.
- **Update for CVEs promptly.** But check the CVE applies to your usage — not every advisory matters.

## Destructive actions

For Claude Code sessions specifically:

- **Never `rm -rf`, drop tables, force-push, or delete branches without explicit user confirmation.**
- **Never use `--no-verify` or skip hooks unless asked.**
- **Never change git config, disable signing, or rewrite published history.**
- When an obstacle shows up, don't shortcut around safety checks. Find the root cause.
