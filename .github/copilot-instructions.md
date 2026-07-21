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
