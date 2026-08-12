---
name: security-and-pii
description: Apply Defra security and PII handling rules when writing or reviewing route handlers, service functions, database access, external API calls, or logging code in MMO FES services.
license: OGL-UK-3.0
metadata:
  author: mmo-fes
  version: "1.0"
---

# Security and PII

Apply these rules on any code that handles input, secrets, database access, external calls, or logging.

## PII — never expose

Personal data must never appear in logs, error messages, telemetry, comments, or test fixtures committed to source:

- Names, addresses, emails, phone numbers
- National Insurance numbers, passport numbers
- Bank details, payment card data
- Usernames, passwords, API keys, tokens, session identifiers

Log identifiers instead (document numbers, correlation IDs). If a value could identify a person, treat it as PII.

## Secrets and configuration

- Load all secrets and connection strings from environment/config (`src/config.ts`) — never hard-code
- Never commit `.env`, credentials, private keys, or certificates (see `.copilotignore`)

## Input handling

- Validate and sanitise all external input at the boundary (`joi` or equivalent)
- Use parameterised queries / driver query builders — never string-concatenate queries
- Reject path traversal; validate and normalise file paths
- Never `eval` or dynamically `Function()` user-supplied data

## Transport and dependencies

- External calls use timeouts and handle failures without leaking internals in error responses
- Keep dependencies free of known vulnerabilities; review and resolve SonarCloud security hotspots

## References

- [Defra security standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/security_standards.md)
- [Defra logging standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/logging_standards.md)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
