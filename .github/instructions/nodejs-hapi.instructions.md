---
description: 'Node.js and Hapi.js rules for MMO FES Batch Data Process. Enforces async patterns, error handling, and config access conventions.'
applyTo: '**/*.{js,ts}'
---

# Node.js & Hapi.js Rules

Essential rules enforced on all JS/TS files. Detailed patterns and examples are in the `/develop` skill.

## Mandatory Rules

- Always use `async/await` — never callback-style APIs
- Handle promise rejections — wrap awaits in `try/catch` or use `.catch()`
- Use `Promise.all()` for independent parallel operations
- No synchronous I/O (`fs.readFileSync`, etc.) in async context
- Use `Boom` for HTTP errors in Hapi routes
- Access config via `ApplicationConfig` — never `process.env` directly in business logic
- Use bracketed structured logging: `logger.info('[COMPONENT][ACTION][DETAIL]')`
- All dates via `moment.utc()` — never local timezone
- Cache updates via `updateCache()` — never mutate cached objects in place
- Validate payloads with AJV schemas before Service Bus publishing
