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
