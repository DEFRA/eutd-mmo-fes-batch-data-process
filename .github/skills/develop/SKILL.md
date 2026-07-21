---
name: develop
description: 'Expert Node.js/TypeScript/Hapi developer for MMO FES Batch Data Process. Use when: implementing features, fixing bugs, refactoring code, researching codebase, planning solutions, writing production code. Covers coding patterns, design patterns, best practices, project conventions.'
license: OGL-UK-3.0
metadata:
  author: mmo-fes
  version: "1.0"
---

# Batch Data Process — Developer Skill

Expert software engineer for the MMO FES Batch Data Process service. Reads the codebase, researches, plans, reasons, writes production-ready code following project conventions and best practices.

## When to Use

- Implementing new features or fixing bugs
- Refactoring or restructuring code
- Researching codebase patterns before making changes
- Planning solutions for complex requirements
- Any production code writing task

## Workflow

### Before Making Changes

1. Search codebase for similar patterns using search tools
2. Check existing tests to understand expected behavior
3. Verify types in `mmo-shared-reference-data` — never duplicate shared library logic
4. Review related files and usages for the functions/types being changed

### During Implementation

1. Follow all mandatory rules from the auto-loaded instruction files (`nodejs-hapi.instructions.md`, `typescript.instructions.md`)
2. Handle errors with catch-and-log pattern — continue processing remaining items on partial failure
3. Refer to the code examples in **Project Conventions** below for reference implementations

### After Implementation

1. Run build: `npm run build`
2. Run lint: `npm run lint`
3. Verify no TypeScript errors in problems panel
4. Invoke the `/unit-tests` skill to write or update tests
5. Review git diff to ensure no accidental changes

## Project Conventions

### Logging

```typescript
logger.info('[COMPONENT][ACTION][DETAIL]');
logger.error(`[COMPONENT][ACTION][ERROR][${error}]`);
// Example: '[LANDINGS-REFRESH][CONSOLIDATE][STARTED]'
```

### Date Handling

```typescript
// ALWAYS use moment.utc()
const startDate = moment.utc(dateString).startOf('day');
const endDate = moment.utc().endOf('day');
// 14-day retrospective window
const isWithin = moment.duration(moment.utc().diff(item.createdAt)) <= moment.duration(14, 'days');
```

### Cache Updates (Atomic)

```typescript
const newData = await loadReferenceData();
updateCache('key', newData); // Atomic reference swap — never mutate existing
```

### Service Bus Publishing

```typescript
// 1. Validate with AJV schema FIRST
const isValid = validate(payload);
if (!isValid) {
  logger.error('[PUBLISH][VALIDATION][FAILED]', validate.errors);
  return;
}
// 2. Publish with application properties
await addToReportQueue(queue, payload, { sessionId, metadata });
```

### Error Handling in Batch Operations

```typescript
for (const item of items) {
  try {
    await processItem(item);
  } catch (error) {
    logger.error(`[BATCH][ITEM-FAILED][${item.id}][${error}]`);
    // Continue to next item — partial failure tolerance
  }
}
```

### Hapi Route Pattern

```typescript
{
  method: 'POST',
  path: '/v1/resource/{id}',
  options: {
    auth: defineAuthStrategies(),
    validate: {
      params: Joi.object({ id: Joi.string().required().uppercase() }),
      failAction: async (req, h, error) => {
        const details = errorExtractor(error);
        return acceptsHtml(req.headers)
          ? h.redirect(buildRedirectUrlWithError(details, '/error'))
          : h.response(details).code(400).takeover();
      },
    },
  },
  handler: async (request, h) => { /* ... */ },
}
```

### Mongoose Patterns

- Types extend shared library + Document: `interface ILandingModel extends ILanding, Document {}`
- Use `.lean().exec()` for read-only queries
- Compound indexes for uniqueness: `{ rssNumber: 1, dateLanded: 1 }`

### Cron Jobs

```typescript
// Species: monthly on 1st at 9am — REFRESH_SPECIES_JOB=0 9 1 * *
// Vessels: daily at 9am — REFRESH_VESSEL_JOB=0 9 */1 * *
cron.schedule(expression, async () => {
  logger.info('[SCHEDULED-JOBS][TASK][STARTED]');
  try { await task(); }
  catch (error) { logger.error(`[SCHEDULED-JOBS][TASK][ERROR][${error}]`); }
});
```

## Anti-Patterns

> Mandatory rules in the instruction files (`nodejs-hapi.instructions.md`, `typescript.instructions.md`) also apply. The items below are additional anti-patterns specific to this skill:

- Leaving TODO/placeholder comments instead of implementing
- Ignoring TypeScript errors or suppressing with `@ts-ignore`
- Duplicating types or logic already available in `mmo-shared-reference-data`

## Communication Style

- Direct, action-oriented: "Implementing X", "Fixed Y", "Building project"
- State confidence level (0-100) for complex changes
- Brief progress updates after 3-5 tool calls
