---
name: defra-standards
description: Defra software development standards for MMO FES Node.js/TypeScript services. Use when writing, reviewing, or refactoring code, or when checking compliance, security, logging, testing, containers, or licensing on a Defra service.
license: OGL-UK-3.0
metadata:
  author: mmo-fes
  version: "1.0"
---

# Defra Standards

Canonical Defra guardrails for this service. The [Defra software development standards](https://github.com/DEFRA/software-development-standards) repository is the single source of truth — this skill summarises the rules Copilot must apply and links back to them.

## Non-negotiable rules

- **Security**: Follow OWASP Secure Coding Practices. Load secrets from environment/config only — never hard-code or commit them. Validate and sanitise all input. Use parameterised queries. Never use `eval` or dynamic `Function()` on user data.
- **PII**: Never log or expose PII — names, addresses, emails, phone numbers, NI numbers, bank details, usernames, passwords, API keys, tokens.
- **Logging**: Structured JSON logging with correlation IDs. Levels: `error`, `warn`, `info`, `debug`.
- **Testing & coverage**: Tests alongside code. Tiered coverage — ≥90% global, ≥95% core business logic, 100% error-handling and security-critical paths. Never drop below the baseline. Test behaviour, not implementation. Mock external dependencies.
- **Quality gates**: Lint clean, all tests green, SonarQube/SonarCloud quality gate passes (no new bugs/vulnerabilities/code smells, hotspots resolved), no duplicated code.
- **Version control**: Branch `<type>/<brief-description>`; Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`); main always shippable.
- **Containers**: Defra base images (`defradigital/node`, `defradigital/node-development`); run as non-root; multi-stage builds; no secrets in images.
- **Dependencies**: Widely used, actively maintained, compatible with current Node.js LTS. Prefer native APIs and existing shared libraries over new dependencies.
- **Licence**: Publish under the Open Government Licence v3.0 unless an approved exception exists.
- **MCP**: Only use Defra-approved MCP servers.
- **Tech stack**: These MMO FES services use TypeScript (an approved exception to the default vanilla-JavaScript standard). Keep strict typing.

## References

- [Defra software development standards](https://github.com/DEFRA/software-development-standards)
- [Defra common coding standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/common_coding_standards.md)
- [Defra Node.js standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/node_standards.md)
- [Defra JavaScript standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/javascript_standards.md)
- [Defra logging standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/logging_standards.md)
- [Defra security standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/security_standards.md)
- [Defra container standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/container_standards.md)
- [Defra quality assurance standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/quality_assurance_standards.md)
- [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard)
- [Technology Code of Practice](https://www.gov.uk/government/publications/technology-code-of-practice/technology-code-of-practice)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [12-factor app methodology](https://12factor.net/)
- [Defra approved MCP servers](https://defra.github.io/defra-ai-sdlc/pages/appendix/defra-mcp-guidance/)
