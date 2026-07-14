---
mode: agent
description: Write a structured pull request description from the staged/committed changes.
---

# Generate PR Description

Summarise the current branch changes into a pull request description ready to paste into GitHub.

## Format

```markdown
## What
Short summary of what changed and why.

## Changes
- Bullet list of the notable changes (files, behaviour, config)

## Testing
- How the change was tested; coverage impact

## Standards checklist
- [ ] Lint passes and all tests green
- [ ] Coverage not decreased (≥90% global / ≥95% business logic / 100% error & security paths)
- [ ] No secrets or PII in code, logs, or tests
- [ ] SonarCloud quality gate passes; hotspots resolved
- [ ] Conventional commit messages; branch follows `<type>/<brief-description>`

## Notes
Anything reviewers should know (breaking changes, follow-ups, deviations with justification).
```

## Rules

- Derive content from the actual diff; do not invent changes
- Use conventional-commit-style language
- Flag any standards deviation explicitly

## References

- [copilot-instructions.md](../copilot-instructions.md) — quality gates and standards
- [Defra quality assurance standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/quality_assurance_standards.md)
