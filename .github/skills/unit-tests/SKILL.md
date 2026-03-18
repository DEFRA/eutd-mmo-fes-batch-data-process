---
name: unit-tests
description: 'Expert unit test engineer for MMO FES Batch Data Process. Use when: writing unit tests, updating tests for code changes, fixing failing tests, improving code coverage, fixing SonarQube issues, resolving code smells, achieving coverage thresholds.'
---

# Batch Data Process — Unit Tests Skill

Expert software engineer specializing in writing and maintaining unit tests for the MMO FES Batch Data Process service. Ensures code coverage thresholds, eliminates code smells, and resolves SonarQube issues.

## When to Use

- Writing unit tests for new or modified code
- Fixing failing tests after code changes
- Improving code coverage to meet thresholds
- Fixing SonarQube issues reported in the problems tab
- Resolving code smells or test quality issues
- Validating edge cases, error paths, and boundary conditions

## Coverage Requirements

- **Overall target**: >90% line coverage
- Run coverage: `npm test` (single run with coverage report)
- Watch mode: `npm run test:watch`

## Test Framework & Tools

- **Jest** as test runner
- **mongodb-memory-server** for MongoDB integration tests
- **jest.spyOn()** for mocking
- Test files: colocated in `test/` directory mirroring `src/` structure

## Test Structure Template

```typescript
describe('ComponentName', () => {
  beforeAll(async () => {
    // Setup MongoDB memory server if needed
    // Initialize shared test fixtures
  });

  afterAll(async () => {
    // Close DB connections, cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success scenario', async () => {
      // Arrange
      const mockData = { /* ... */ };
      jest.spyOn(dependency, 'method').mockResolvedValue(mockData);

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it('should handle error scenario', async () => {
      jest.spyOn(dependency, 'method').mockRejectedValue(new Error('fail'));
      await expect(functionUnderTest(input)).rejects.toThrow('fail');
    });

    it('should handle null/undefined inputs', async () => {
      const result = await functionUnderTest(undefined);
      expect(result).toBeNull();
    });
  });
});
```

## Mocking Patterns

### External Dependencies

```typescript
// Logger
const mockLoggerInfo = jest.spyOn(logger, 'info').mockImplementation();
const mockLoggerError = jest.spyOn(logger, 'error').mockImplementation();

// Verify logging
expect(mockLoggerInfo).toHaveBeenCalledWith('[PREFIX][ACTION][DETAIL]');
```

### Service Clients

```typescript
// Azure Service Bus
jest.mock('../../src/services/queue.service', () => ({
  addToReportQueue: jest.fn().mockResolvedValue(undefined),
}));

// HTTP clients (axios)
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.get.mockResolvedValue({ data: mockResponse });
```

### Date Mocking

```typescript
jest.spyOn(Date, 'now').mockImplementation(() => 1693751375000);
// or with moment
jest.mock('moment', () => {
  const original = jest.requireActual('moment');
  return () => original.utc('2024-01-15');
});
```

### Cache Mocking

```typescript
jest.mock('../../src/data/cache', () => ({
  getCachedVessels: jest.fn().mockReturnValue(mockVessels),
  getCachedSpecies: jest.fn().mockReturnValue(mockSpecies),
  updateCache: jest.fn(),
}));
```

### MongoDB Memory Server

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

## What to Test

### Every Function Must Cover

1. **Happy path** — expected inputs produce expected outputs
2. **Error path** — exceptions are caught, logged, and handled correctly
3. **Edge cases** — null, undefined, empty arrays, empty strings
4. **Boundary values** — date boundaries (start/end of day), 14-day window edges
5. **Large datasets** — verify no memory issues with batch processing

### Project-Specific Test Scenarios

- Logging assertions: verify bracketed log format with `expect(mockLoggerInfo).toHaveBeenCalledWith()`
- Cache atomicity: verify `updateCache()` is called (not direct mutation)
- AJV validation: test valid and invalid payloads against schemas
- Service Bus: verify messages are published with correct session IDs and application properties
- Species alias matching: verify lookups resolve correctly
- Risk scoring: verify weighting calculations with known inputs

## SonarQube Issue Resolution

### Critical Rule: Never Change Functionality

When fixing SonarQube issues, **NEVER modify the actual functionality** of a code block or function. Fixes must be purely structural (renaming, extracting, simplifying) without altering behavior. To guarantee this:

- **DO NOT modify existing unit tests** — they are the behavioral contract. If all existing tests still pass after your fix, functionality is preserved.
- If a test fails after a SonarQube fix, **revert the fix** — it changed behavior.

### Workflow for SonarQube Fixes

1. Open all modified source files in the VS Code editor so SonarQube/SonarLint analysis runs and issues appear in the **Problems tab** or **SonarQube tab** in the VS Code panel
2. Read and categorize each reported issue (code smell, cognitive complexity, duplication, security hotspot)
3. Fix each issue with refactoring-only changes:
   - **Code smells** — Reduce complexity, extract methods, remove dead code
   - **Cognitive complexity** — Break large functions into smaller units
   - **Duplications** — Extract shared logic into utility functions
   - **Security hotspots** — Add validation/sanitization as needed
4. Run `npm test` to confirm **all existing tests still pass** without modification
5. Re-open the modified files in the editor and verify the SonarQube issues are resolved in the Problems tab

## Workflow

1. Identify the source file(s) that need tests
2. Find existing test file or create new one mirroring `src/` → `test/` path
3. Read the source code to understand all branches and edge cases
4. Write tests following the Arrange/Act/Assert pattern
5. Run `npm test` and check coverage output
6. If coverage < 90%, identify uncovered lines and add targeted tests
7. Check the problems tab for any SonarQube issues and fix them (see SonarQube rules above)
8. Re-run `npm test` to confirm all tests pass
