---
mode: agent
description: Review changed code against Defra security standards and the OWASP Top 10.
---

# Security Review

Review the current changes (or the files I specify) for security issues against Defra security standards and the OWASP Top 10.

## What to check

- Secrets, API keys, or connection strings hard-coded or committed (must come from environment/config)
- PII in logs, error messages, telemetry, comments, or test fixtures (names, addresses, emails, phone numbers, NI numbers, bank details, tokens)
- Unvalidated or unsanitised external input; missing `joi` validation at boundaries
- SQL/NoSQL injection risk — string-concatenated queries instead of parameterised ones
- Path traversal, unsafe file handling, `eval` or dynamic `Function()` on user data
- Missing timeouts on external calls; internal details leaked in error responses
- Dependencies with known vulnerabilities; unresolved SonarCloud security hotspots

## Output

Produce a findings table: `File | Line | Issue | Severity (Blocking/Recommended/Nit) | Recommendation`. Summarise total findings by severity and state whether the change is safe to merge. Do not edit code — report only.

## References

- [security-and-pii skill](../skills/security-and-pii/SKILL.md)
- [Defra security standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/security_standards.md)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
