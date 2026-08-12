# MMO FES Batch Data Process

UK Government (DEFRA/MMO) fisheries export service batch processor. Validates catch certificate landings data against external landing records, generates compliance reports, and publishes to Azure Service Bus queues.

## Core Workflow

Scheduled job → Fetch landings → Validate against catch certificates → Risk scoring → Report generation → Queue publishing → Blob storage archival

## Architecture

| Component | Role |
|-----------|------|
| Hapi HTTP Server (`src/server.ts`) | POST endpoints: `/v1/jobs/landings`, `/v1/jobs/purge` |
| Landing Consolidation Client | REST client for fetching/posting landing data |
| Azure Service Bus | Two queues: case management (dynamics) + DEFRA Trade (CHIP) |
| Azure Blob Storage | Reference data reads + validation report writes |
| MongoDB (Cosmos DB API) | Landing/certificate persistence |
| Cron Jobs | Species: monthly 1st at 9am, Vessels: daily at 9am |
| In-memory Cache (`src/data/cache.ts`) | Species, vessels, vessels of interest, exporter behavior, weighting |

## Key Dependencies

- `mmo-shared-reference-data` — shared types, validation queries (`ccQuery`), transformations
- `moment` — all dates via `moment.utc()` only
- `ajv` — JSON schema validation before queue publishing (schemas in `data/schemas/`)
- `node-cron` — scheduled job execution
- `mongoose` — MongoDB models extending shared library interfaces

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm start` |
| Build | `npm run build` |
| Test (coverage) | `npm test` |
| Test (watch) | `npm run test:watch` |
| Lint | `npm run lint` |

## Environment

Config via `ApplicationConfig.loadEnv()` in `src/config.ts`. Key groups: DB (`DB_CONNECTION_URI`, `DB_NAME`), Blob Storage (`REFERENCE_DATA_AZURE_STORAGE`), Service Bus (`AZURE_QUEUE_CONNECTION_STRING`, `REPORT_QUEUE`), Feature Flags (`ENABLE_CHIP_REPORTING`, `RUN_LANDING_REPROCESSING_JOB`, `VESSEL_NOT_FOUND_ENABLE`).

## Standards precedence (highest wins)

When guidance conflicts, follow this order:

1. **DEFRA Software Development Standards** (mandatory) — https://defra.github.io/software-development-standards/
2. **DEFRA Digital Service Manual** — https://digital.defra.gov.uk/service-manual
3. **GOV.UK Service Standard & Service Manual (GDS)** — https://www.gov.uk/service-manual
4. **Community best practice** — [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/), [12-factor](https://12factor.net/), widely-adopted Node.js/TypeScript patterns

> **DEFRA takes precedence over GDS. GDS takes precedence over community guidance.** Any deviation from a DEFRA standard MUST be raised as a formal exception through DEFRA's architectural governance (Delivery Architecture team: `delivery.architecture@defra.gov.uk`).

## The working framework (Triage → Read → Research → Plan Handoff → Plan Validation Research → Approval → Implement → Test → Iterate → Summarise)

This section is the **single source of truth** for the working loop. The custom agents ([Orchestrator](.github/agents/batch-data-process-orchestrator.agent.md), [Planner](.github/agents/batch-data-process-planner.agent.md), [Developer](.github/agents/batch-data-process-developer.agent.md) and [Reviewer](.github/agents/batch-data-process-reviewer.agent.md)) reference it and **must not restate or fork it**.

**Triage first — pick the right path by size and risk:**

- **Trivial / low-risk** (typo, comment/doc tweak, a small localised change with no impact on architecture, validation, risk scoring, report generation, schema validation, persistence, external integrations, scheduled jobs, security or data correctness): skip the planner and heavy research. Do a light **Read → Implement → Test → Summarise**, and research only the specific point that is genuinely uncertain.
- **Non-trivial** (new feature, a validation/risk-scoring/report change, schema changes, persistence, external integrations (Service Bus, Blob Storage, MongoDB, landing consolidation), scheduled jobs, security, or anything affecting report/data correctness or risky): run the full loop below.

Non-trivial loop:

1. **Read** — Read the relevant files/config in the repo for context before acting. Never assume; verify.
2. **Research** — Do thorough, risk-scoped research in the open and validate findings against DEFRA/GDS and framework/library guidance so advice reflects current APIs and policy. Cite sources.
3. **Clarify** — Ask the user targeted questions whenever requirements are ambiguous or missing. Surface requirement gaps explicitly with suggested fixes. Do not guess at intent.
4. **Plan handoff** — Delegate planning to the [Planner - Batch Data Process](.github/agents/batch-data-process-planner.agent.md) agent when one exists. The planning agent returns the complete implementation plan.
5. **Plan validation research** — Perform thorough research in the open to validate the plan against DEFRA/GDS and framework guidance, **focusing on the steps the planner flagged as risky or version-sensitive** (unfamiliar APIs, security, policy). Send targeted revisions back to the planner.
6. **Approval** — Present the complete validated plan to the user and obtain explicit approval before implementation. If changes are requested, update the plan, re-validate, and re-approve. **Cap the plan → validate → approve → implement replanning cycle at 3 iterations**; if it is still unresolved, stop and surface the blocker to the user.
7. **Implement** — Deliver one task at a time (or parallel independent tasks) from the approved plan. Stay focused on the requested outcome; do not scope-creep or refactor unrelated code. When a change introduces or alters architecture, capture the decision as an ADR and update the relevant docs and ADRs **where the repo already keeps them** (e.g. `docs/`).
8. **Test / Validate** — Build (`npm run build`), run the test suite (`npm test`), lint (`npm run lint`), check errors, and confirm each task works before moving on.
9. **Iterate** — Refine until the user is satisfied with each task.
10. **Summarise** — End with a detailed **executive summary** of what changed, why, how it was validated, and any follow-ups or risks.

## Workflow agents

Non-trivial work is coordinated through four custom agents that all run the framework above:

| Agent | Role |
|-------|------|
| [Orchestrator - Batch Data Process](.github/agents/batch-data-process-orchestrator.agent.md) | Plans, delegates, verifies and reports; owns the Yes/No user-approval gate. Does **not** implement. |
| [Planner - Batch Data Process](.github/agents/batch-data-process-planner.agent.md) | Internal planning subagent; produces the approval-ready plan and the research behind it. |
| [Developer - Batch Data Process](.github/agents/batch-data-process-developer.agent.md) | Implements an already-approved plan end-to-end with tests. |
| [Reviewer - Batch Data Process](.github/agents/batch-data-process-reviewer.agent.md) | Read-only review against DEFRA standards; reports findings by severity. |

Research (§4.2) and plan-validation research (§4.5) use the [deep-research-defra-alignment](.github/skills/deep-research-defra-alignment/SKILL.md) skill. The [Speckit](.github/agents) agents (`speckit.*`) are a separate spec-driven toolset and are **not** part of this workflow.

## Skills

Use `/develop` for implementation, coding, and research tasks. Use `/unit-tests` for writing tests, coverage, and SonarQube issues.

## Defra standards and governance

This service must comply with [Defra software development standards](https://github.com/DEFRA/software-development-standards) — the single source of truth. The rules below encode those standards; they do not replace them. When a standard changes, update this file.

### Quality gates

All code must pass these checks before merging:

- Linter passes (`npm run lint`)
- All tests pass (`npm test`)
- Coverage ≥90% global (Statements/Branches/Functions/Lines), ≥95% core business logic, 100% error-handling and security-critical paths — no decrease from the SonarCloud baseline
- SonarQube/SonarCloud quality gate passes; security hotspots reviewed and resolved
- At least one approving review from another developer
- No unresolved security vulnerabilities in dependencies

### Security and PII

- Follow [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- Never commit secrets — load all configuration and credentials from environment variables (`src/config.ts`), never `process.env` scattered through code
- **Never log PII**: names, addresses, emails, phone numbers, NI numbers, bank details, usernames, passwords, API keys, tokens
- Validate and sanitise all external input; use parameterised queries for database access
- Avoid `eval`, dynamic `Function()`, or executing user-supplied data; validate and normalise file paths

### Dependencies

- New dependencies must be widely used, actively maintained, and compatible with the current Node.js LTS
- `mmo-shared-reference-data` is the SSOT for shared types and queries — never duplicate its logic
- Do not introduce a second HTTP framework, ORM, or date library without an approved exception

### Logging

- Structured logging via `bunyan` with bracketed context tags and `_correlationId` propagation
- Levels: `error` (failures), `warn` (handled but unexpected), `info` (business events), `debug` (development only)

### How Copilot should respond

- Follow conventions already in the codebase — check existing patterns first
- Prefer modifying existing files over creating new ones when the change fits naturally
- Provide minimal diffs touching only the necessary files; do not refactor unrelated code
- Always include or update tests for changed behaviour
- If a request conflicts with these instructions — a discouraged library, a skipped test, a hard-coded secret, or a broken quality gate — flag it explicitly and do not proceed silently

### Licence

All code is published under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) unless an approved exception exists.

<!-- STANDARDS NOTE: These instructions reflect Defra software development standards (https://github.com/DEFRA/software-development-standards). Review this file periodically or after any Defra standards update. -->
