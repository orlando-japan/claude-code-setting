---
name: security-audit
description: OWASP-style security audit focused on real exploits, not abstract advice. Invoke before shipping anything that handles user input, secrets, or external I/O.
category: security
tags: [owasp, vulnerability, audit]
risk: high
---

# Security audit

The point is finding exploitable weaknesses. "Could theoretically be bad" isn't an audit finding.

## Threat model first

Before looking at code, answer:

- **Who can reach this?** Internet strangers, authenticated users, internal services?
- **Under what auth?** Anonymous, session, API token, service-to-service?
- **What's the impact of compromise?** Read a record, write a record, escalate to admin, exfiltrate the DB, RCE?

The same bug means different things at different reach levels.

## Priority order

### 1. Authentication and authorization

- Is authn separate from authz? Authn = "who are you," authz = "what can you do."
- Is the check on the **server**, not the UI?
- Can you access another user's resource by changing the ID in the URL (IDOR)?
- Is there a privilege escalation path?
- What happens on missing / expired / malformed tokens?

### 2. Input handling at trust boundaries

- **Injection.** Anywhere user input meets an interpreter: SQL, shell, template, HTML, LDAP, NoSQL, XML. Use parameterized APIs.
- **Deserialization.** `pickle`, `unserialize`, `eval`, JNDI, `yaml.load` — any of these on untrusted input is a finding.
- **Path traversal.** File paths built from user input → `../` escape. Use allowlists.
- **SSRF.** Server makes HTTP requests to user-supplied URLs → internal network access. Block RFC 1918, 169.254, localhost.
- **XXE.** XML parsers with external entities enabled.

### 3. Secrets handling

- Hardcoded secrets in source (grep `secret`, `password`, `token`, `key`, `api_key`).
- Secrets in logs (request loggers dumping headers, error loggers dumping objects).
- Secrets in error messages returned to users.
- Secrets in git history (`git log -p | grep ...`).
- Weak defaults that never get rotated.

### 4. Crypto and randomness

- `Math.random()` used for anything security-related → finding.
- MD5 / SHA1 for integrity or passwords → finding.
- ECB mode, reused IVs, homegrown crypto → finding.
- Missing signature verification on webhooks / tokens.
- Missing TLS cert validation.

### 5. Error messages across trust boundaries

- Stack traces, SQL errors, file paths in responses to end users.
- Verbose DB errors leaking schema.
- Internal hostnames in error output.

### 6. Dependencies

- Run `npm audit` / `pip-audit` / `cargo audit`.
- Check for unmaintained packages (>2 years, open issues piling up).
- Watch for typosquat names.
- Postinstall scripts in transitive deps.

### 7. Rate limiting and abuse

- Missing limits on expensive endpoints.
- No lockout on failed login.
- Unbounded pagination (`?limit=1000000`).
- Unbounded upload sizes.

## Finding format

```
[SEVERITY] path:line — exploit summary → fix

Threat model: <reach + auth context>
Exploit: <concrete input / sequence>
Impact: <what the attacker gets>
Fix: <specific remediation>
```

Severity:

- **Critical** — unauthenticated RCE, data exfil, auth bypass, privilege escalation.
- **High** — authenticated IDOR, stored XSS, CSRF with impact, broken auth in narrow conditions.
- **Medium** — info leak, self-XSS, rate-limit bypass on non-critical endpoints.
- **Low / watch** — best-practice deviations with no clear exploit at current threat model.

## Anti-patterns

- **"Use HTTPS" as a finding.** Too generic. Either TLS is enforced at a specific layer (call that out) or it's an environmental problem.
- **"Sanitize input" as advice.** Be specific: "use parameterized SQL," "HTML-encode on output," "use `shlex.quote`."
- **Flagging CSRF on stateless JWT APIs** without checking if it actually applies.
- **Running an exploit PoC on production systems** without explicit authorization.
