# MMO FES Batch Data Process - AI Agent Guide

## Project Overview
UK Government (DEFRA/MMO) fisheries export service batch processor that validates catch certificate landings data against external landing records. The system fetches landing data from a consolidation service, performs complex validation queries using the `mmo-shared-reference-data` library, generates compliance reports, and publishes to Azure Service Bus queues for downstream case management and DEFRA Trade systems.

**Core workflow**: Scheduled job → Fetch landings → Validate against catch certificates → Risk scoring → Report generation → Queue publishing → Blob storage archival

## Architecture & Key Components

### Service Boundaries
- **Hapi HTTP Server** (`src/server.ts`): Exposes POST endpoints for manual job triggering (`/v1/jobs/landings`, `/v1/jobs/purge`)
- **Landing Consolidation Service Client** (`src/services/landingConsolidate.service.ts`): Fetches landing data via `GET /v1/landings/refresh` and posts updates to `POST /v1/jobs/landings`
- **Azure Service Bus Integration**: Two queues - case management (dynamics validation) and DEFRA Trade (CHIP reporting)
- **Azure Blob Storage**: Reads reference data (species, vessels, exporter behavior) and writes validation reports with environment-tagged filenames
- **Scheduled Jobs**: Species data refreshes monthly (`REFRESH_SPECIES_JOB=0 9 1 * *` - 9am on 1st of month), vessel data refreshes daily (`REFRESH_VESSEL_JOB=0 9 */1 * *` - 9am daily)

### Data Flow: Landings Processing Pipeline
1. **Trigger**: POST to `/v1/jobs/landings` (manual) or scheduled cron jobs (species: monthly at 9am, vessels: daily at 9am via `REFRESH_SPECIES_JOB`, `REFRESH_VESSEL_JOB`)
2. **Data Refresh**: `landingsAndReportingCron()` fetches from consolidation service and queries MongoDB for missing landings
3. **Validation**: `ccQuery()` from `mmo-shared-reference-data` matches landings against catch certificates, applies vessel lookups, species aliases
4. **Risk Scoring**: Combines vessel, exporter, species scores with configurable weighting (cached in `src/data/cache.ts`)
5. **Reporting**: Generates Dynamics cases (`toDynamicsCcCase`) and DEFRA Trade payloads (`toDefraTradeCc`), validates against JSON schemas in `data/schemas/`
6. **Queue Publishing**: Uses `addToReportQueue()` with session IDs for ordering, application properties for metadata
7. **Persistence**: Updates MongoDB landing statuses, archives reports to blob storage with naming pattern `_{DOCTYPE}_{ENV}_{TIMESTAMP}.json`

### Critical Caching System
In-memory cache (`src/data/cache.ts`) loaded on startup and refreshed via cron:
- **Species data**: Commodity codes with conversion factors (TSV from blob storage)
- **Vessels**: Fleet registry with PLN lookups via `generateIndex()` from shared library
- **Vessels of Interest**: Risk-scored vessels from MongoDB `risking` collection
- **Exporter Behavior**: Risk scores by accountId/contactId (CSV from blob storage)
- **Weighting**: Configurable threshold and weights (exporterWeight, vesselWeight, speciesWeight) from MongoDB (typically all set to 1)
- **"Vessel Not Found"**: Hardcoded fallback vessel (PLN "N/A") injected if `VESSEL_NOT_FOUND_ENABLE=true`

Cache updates use `updateCache()` pattern to atomically replace in-memory references. Dev mode loads from `data/*.json` files, production from blob storage.

## Development Workflows

### Running & Testing
```bash
# Development with hot reload
npm start  # Uses ts-node, loads .env, connects to MongoDB

# Run tests with >90% coverage target
npm test         # Single run with coverage
npm run test:watch  # Watch mode

# Build TypeScript
npm run build    # Outputs to dist/

# Lint
npm run lint     # ESLint with Airbnb config + Prettier
```

**Testing patterns** (see `test/controllers/jobs.spec.ts`):
- Jest with `mongodb-memory-server` for integration tests
- Mock external dependencies (`jest.spyOn()`) on logger, service clients, cache
- Date mocking: `jest.spyOn(Date, 'now').mockImplementation(() => 1693751375000)`
- Logger assertions: `expect(mockLoggerInfo).toHaveBeenCalledWith('[PREFIX][DETAIL]')`

### Environment Configuration
All config via environment variables loaded through `ApplicationConfig.loadEnv()` in `src/config.ts`. Key vars:
- **DB**: `DB_CONNECTION_URI` (Cosmos DB MongoDB API), `DB_NAME`
- **Blob Storage**: `REFERENCE_DATA_AZURE_STORAGE` (connection string), `AZURE_BLOB_URL`, `AZURE_SAS`, `AZURE_BLOB_CONTAINER`
- **Service Bus**: `AZURE_QUEUE_CONNECTION_STRING`, `REPORT_QUEUE`, `AZURE_QUEUE_TRADE_CONNECTION_STRING`, `REPORT_QUEUE_TRADE`
- **Feature Flags**: `ENABLE_CHIP_REPORTING` (DEFRA Trade integration), `RUN_LANDING_REPROCESSING_JOB`, `RUN_RESUBMIT_CC_TO_TRADE`, `VESSEL_NOT_FOUND_ENABLE`
- **External Services**: `MMO_CC_LANDINGS_CONSOLIDATION_SVC_URL`, `EXTERNAL_APP_URL` (for environment detection)
- **Auth**: `REF_SERVICE_BASIC_AUTH_USER`, `REF_SERVICE_BASIC_AUTH_PASSWORD` (disabled in dev mode)

### Logging Convention
Structured logging with bunyan via `src/logger.ts`. Use bracketed prefix pattern:
```typescript
logger.info('[COMPONENT][ACTION][DETAIL]');
logger.info(`[COMPONENT][${variableContext}][ACTION][${value}]`);
logger.error(`[COMPONENT][ACTION][ERROR][${e}]`);
```
Examples: `[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-REFRESH]`, `[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${certId}][INVALID-PAYLOAD]`

## Project-Specific Patterns

### Mongoose Models & Types
- Types in `src/types/*.ts` extend interfaces from `mmo-shared-reference-data` and Mongoose `Document`
- Pattern: `export interface ILandingModel extends ILanding, Document {}`
- Models use `model<ILandingModel>('Landing', LandingSchema)` with lean queries for performance
- Landing uniqueness: `rssNumber` + `dateTimeLanded` (milliseconds added if multiple same-day landings at midnight)

### Date Handling with Moment
- **Always use UTC**: `moment.utc()` for all date operations
- **Day-level queries**: Use `.startOf('day')` and `.endOf('day')` for MongoDB date ranges
- **14-day retrospective window**: `moment.duration(queryTime.diff(item.createdAt)) <= moment.duration(14, 'days')`
- Landing date parsing: `moment.utc(landing.dateLanded).format('YYYY-MM-DD')` for sales note lookups

### Validation Query Patterns
- `ccQuery()` from `mmo-shared-reference-data` returns `ICcQueryResult[]` with validation statuses, risk scores, landing statuses
- `missingLandingRefreshQuery()`: Filters pending certificates within retrospective window, deduplicates by rssNumber+dateLanded
- `exceedingLimitLandingQuery()`: Finds certificates exceeding 14-day limit using `isExceeding14DayLimit` flag
- `mapPlnLandingsToRssLandings()`: Converts PLN-based certificate landings to RSS numbers for database queries
- Use `ifilter()` generator pattern for memory-efficient large result sets

### Schema Validation (AJV)
JSON schema validation in `src/services/report.service.ts` before queue publishing:
```typescript
const validate_cc_defra_trade = getValidator('CatchCertificateCase.json')
const valid: boolean = validate_cc_defra_trade(ccDefraTrade);
if (!valid) {
  logger.error(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${certId}][INVALID-PAYLOAD][${JSON.stringify(validate_cc_defra_trade.errors)}]`);
  return; // Fail silently, do not publish
}
```
Schemas in `data/schemas/Defra Trade Reporting/*.json`. Always validate before Service Bus publishing.

### Service Bus Message Pattern
Two message formats based on `ENABLE_CHIP_REPORTING`:
1. **Legacy (CHIP disabled)**: Direct Dynamics case structure with sessionId for ordering
2. **Trade enabled**: DEFRA Trade schema with `applicationProperties` metadata (EntityKey, PublisherId, SchemaVersion, Status, TimestampUtc)

Use `addToReportQueue()` from shared library with `enableReportToQueue=false` in dev to prevent actual publishing.

### Landing Reprocessing Job
CSV-driven batch reset (`data/reprocess-landings.csv`) controlled by `RUN_LANDING_REPROCESSING_JOB`:
- Reads landing IDs from CSV (limit via `LANDING_REPROCESSING_LIMIT`, default 50)
- Resets `_status` to `LandingStatus.Pending` on catch certificate products
- Updates CSV to remove processed IDs via `updateLandingReprocessData()`
- Use case: Revalidate specific landings after data corrections

## Integration Points

### mmo-shared-reference-data Library
Core dependency providing:
- `ccQuery()`: Main validation logic matching certificates to landings
- Type definitions: `ILanding`, `IDocument`, `ICcQueryResult`, `LandingStatus`, `CertificateStatus`
- Enum constants: `LandingSources`, `MessageLabel`, `DocumentStatuses`
- Transformation functions: `toCcDefraReport()`, `getLandingsFromCatchCertificate()`, `mapLandingWithLandingStatus()`
- Vessel indexing: `generateIndex()` for fast PLN lookups

Shared library changes require version bump in `package.json` and thorough integration testing.

### External Service Dependencies
- **Landing Consolidation Service**: REST API (axios client) for fetching landing queries and posting updates
- **Azure Cosmos DB**: MongoDB API with connection timeouts (60s connect, 600s socket) for landing/certificate persistence
- **Azure Blob Storage**: Reference data reads (species, vessels, exporter behavior) and report writes
- **Azure Service Bus**: Case management queue (session-enabled) and DEFRA Trade queue

### Error Handling Strategy
- **Catch-and-log**: Most async operations catch errors, log with context, continue processing other items
- **Partial failure tolerance**: Batch operations process all items, accumulating successes/failures
- **No retries at service level**: Relies on external schedulers (Azure Logic Apps) for job-level retries
- **Validation failures**: Invalid payloads logged but not re-thrown, allowing pipeline to continue

## Docker & Deployment

### Multi-stage Dockerfile
- **base**: Install production dependencies with node-gyp support
- **test**: Add Alpine MongoDB for `mongodb-memory-server`, run test suite
- **development**: Build TypeScript, suitable for non-prod environments
- **production**: Minimal runtime image with built artifacts, data directory, 24GB heap (`--max_old_space_size=24576`)

### Azure DevOps Pipeline
Uses shared template from `mmo-fes-pipeline-common` repo. Branching strategy:
- **main**: Production deployments
- **develop**: Lower environment deployments
- **hotfix/\***, **feature/\***, **epic/\***: Branch builds (deploy via parameter `deployFromFeature`)

### Debugging Production Issues
1. Check Application Insights for structured logs (instrumentation key in config)
2. Query blob storage for validation reports: `_{DOCTYPE}_{ENV}_{TIMESTAMP}.json` pattern
3. Inspect Service Bus dead letter queues for failed message processing
4. Review MongoDB landing status changes via `dateTimeRetrieved` field
5. Validate external service connectivity (consolidation service, blob storage)

## Common Pitfalls
- **Cache staleness**: Reference data updates require manual `/v1/jobs/purge` POST or await next cron refresh
- **Date precision**: Landing collisions at midnight resolved by millisecond offsets in `updateLandings()`
- **Risk score changes**: Weighting updates in MongoDB won't apply until next risking data refresh
- **Schema validation**: DEFRA Trade payloads require exact schema adherence; check version in `applicationProperties.SchemaVersion`
- **Memory usage**: Large batch operations (e.g., 103k+ landings) may require heap tuning beyond default 24GB
