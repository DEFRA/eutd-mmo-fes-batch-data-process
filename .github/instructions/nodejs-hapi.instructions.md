---
description: 'Node.js and Hapi.js best practices for MMO FES backend services'
applyTo: '**/*.{js,ts}'
---

# Node.js & Hapi.js Best Practices for MMO FES

This instructions file applies to all Node.js/TypeScript backend services using Hapi.js framework in the MMO Fish Export Service ecosystem.

## Core Principles

### 1. Asynchronous Patterns
- **Always use async/await** - never use callback-style APIs
- **Handle promise rejections** - wrap awaits in try/catch or use `.catch()`
- **Sequential vs parallel** - use `Promise.all()` for independent operations
- **No blocking operations** - avoid synchronous I/O (fs.readFileSync, etc.)

```typescript
// Good: Parallel independent operations
const [vessels, species, countries] = await Promise.all([
  fetchVessels(),
  fetchSpecies(),
  fetchCountries()
]);

// Bad: Sequential when not needed
const vessels = await fetchVessels();
const species = await fetchSpecies();
const countries = await fetchCountries();
```

### 2. Error Handling
- **Try/catch for all async operations**
- **Log with context** before re-throwing
- **Use Boom for HTTP errors** in Hapi routes
- **Graceful degradation** when possible

```typescript
// Good: Context logging + re-throw
try {
  await externalService.call();
} catch (error) {
  logger.error(`[SERVICE][ACTION][ERROR][${error.stack || error}]`);
  throw error;
}

// Hapi route error handling
return Boom.badRequest('Invalid document number', { details: validationErrors });
```

### 3. Logging Convention
Use bracketed structured logging throughout:
```typescript
logger.info('[COMPONENT][ACTION][DETAIL]');
logger.info(`[COMPONENT][${variable}][ACTION][${value}]`);
logger.error(`[COMPONENT][ACTION][ERROR][${e}]`);
```

Examples:
- `[SCHEDULED-JOBS][LANDING-REFRESH][STARTED]`
- `[SERVICE-BUS][PUBLISH][QUEUE][reportQueue][CORRELATION-ID][${id}]`
- `[CACHE][UPDATE][VESSELS][COUNT][${vessels.length}]`

## Hapi.js Patterns

### Route Definition
```typescript
{
  method: 'POST',
  path: '/v1/resource/{id}',
  options: {
    auth: defineAuthStrategies(), // Returns null if auth disabled
    validate: {
      params: Joi.object({
        id: Joi.string().required().uppercase(),
      }),
      payload: Joi.object({
        // ... field validation
      }),
      failAction: async (req, h, error) => {
        const errorDetails = errorExtractor(error);
        if (acceptsHtml(req.headers)) {
          return h.redirect(buildRedirectUrlWithError(errorDetails, '/error'));
        }
        return h.response(errorDetails).code(400).takeover();
      },
    },
    tags: ['api'],
  },
  handler: async (request, h) => {
    // Controller logic
  },
}
```

### Server Lifecycle Extensions
Use extensions for cross-cutting concerns:
```typescript
server.ext('onRequest', (request, h) => {
  request.app.requestId = uuid();
  return h.continue;
});

server.ext('onPreResponse', (request, h) => {
  const response = request.response;
  if (response.isBoom) {
    // Custom error handling
  }
  return h.continue;
});
```

### Plugin Pattern
```typescript
const myPlugin: Hapi.Plugin<void> = {
  name: 'my-plugin',
  register: async (server) => {
    // Add routes, extensions, methods
    server.route(routes);
  },
};
```

## Date & Time Handling

### Always Use UTC
```typescript
import moment from 'moment';

// Good: UTC dates
const dateLanded = moment.utc(landing.dateLanded).format('YYYY-MM-DD');
const now = moment.utc();

// Bad: Local timezone
const dateLanded = moment(landing.dateLanded).format('YYYY-MM-DD');
```

### Day-Level Queries
```typescript
// MongoDB date range query
const startOfDay = moment.utc(date).startOf('day').toDate();
const endOfDay = moment.utc(date).endOf('day').toDate();

await Landing.find({
  dateLanded: { $gte: startOfDay, $lte: endOfDay }
});
```

### Duration Comparisons
```typescript
// 14-day retrospective window
const isWithinWindow = moment.duration(
  moment.utc().diff(landing.createdAt)
) <= moment.duration(14, 'days');
```

## MongoDB/Mongoose Patterns

### Schema Design
```typescript
const LandingSchema = new Schema({
  rssNumber: { type: String, required: true, index: true },
  dateLanded: { type: Date, required: true },
  weight: { type: Number, required: true },
  species: { type: String, required: true },
  _status: { type: String, enum: Object.values(LandingStatus) },
}, {
  timestamps: true,
  collection: 'landings',
});

// Compound index for uniqueness
LandingSchema.index({ rssNumber: 1, dateLanded: 1 }, { unique: true });
```

### Lean Queries for Performance
```typescript
// Good: Lean for read-only
const landings = await Landing.find({ status: 'PENDING' }).lean().exec();

// Use document methods only when needed
const landing = await Landing.findById(id); // Returns Mongoose doc
await landing.save();
```

### Discriminators for Polymorphism
```typescript
const ReportData = model('ReportData', new Schema({}, { discriminatorKey: '_type' }));

const CatchCertReport = ReportData.discriminator('catchCertificate', CatchCertSchema);
const StorageDocReport = ReportData.discriminator('storageDocument', StorageDocSchema);
```

## Scheduled Jobs (node-cron)

### Cron Pattern
```typescript
import cron from 'node-cron';

// Daily at 9am UTC
cron.schedule('0 9 * * *', async () => {
  logger.info('[SCHEDULED-JOBS][DAILY-REFRESH][STARTED]', new Date().toISOString());
  try {
    await performDailyTask();
    logger.info('[SCHEDULED-JOBS][DAILY-REFRESH][COMPLETED]');
  } catch (error) {
    logger.error(`[SCHEDULED-JOBS][DAILY-REFRESH][ERROR][${error}]`);
  }
});
```

### Cron Expression Examples
- `0 9 * * *` - Daily at 9:00 AM
- `0 9 1 * *` - Monthly on 1st at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 */6 * * *` - Every 6 hours

## Caching Patterns

### Atomic Updates
```typescript
// Good: Atomic replacement
const newVessels = await fetchVesselsFromBlob();
cachedVessels = newVessels; // Atomic reference swap

// Bad: Partial updates (race conditions)
cachedVessels.push(...newVessels); // NOT atomic
```

### Cache Invalidation
```typescript
// Scheduled refresh
cron.schedule('0 9 * * *', async () => {
  await updateCache();
});

// Manual purge endpoint
{
  method: 'POST',
  path: '/v1/jobs/purge',
  handler: async (request, h) => {
    await updateCache();
    return h.response({ status: 'Cache purged' });
  },
}
```

## Environment Configuration

### Centralized Config
```typescript
// config.ts
export const config = {
  mongoUri: process.env.DB_CONNECTION_URI || 'mongodb://localhost:27017',
  redisHost: process.env.REDIS_HOST_NAME || 'localhost',
  blobConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  serviceBusConnectionString: process.env.AZURE_QUEUE_CONNECTION_STRING,
};

// Never access process.env directly in business logic
```

### Environment-Specific Behavior
```typescript
const inDev = process.env.NODE_ENV === 'development';

if (inDev) {
  // Load from local files
  data = JSON.parse(fs.readFileSync('data/vessels.json', 'utf8'));
} else {
  // Load from Azure Blob Storage
  data = await blobClient.download();
}
```

## Testing Best Practices

### Test Structure
```typescript
describe('ServiceName', () => {
  beforeAll(async () => {
    // Setup (e.g., MongoDB Memory Server)
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    // Reset state
    jest.clearAllMocks();
  });

  it('should handle success scenario', async () => {
    // Arrange
    const input = { ... };
    
    // Act
    const result = await service.method(input);
    
    // Assert
    expect(result).toBeDefined();
  });

  it('should handle error scenario', async () => {
    // Arrange + mock error
    jest.spyOn(externalService, 'call').mockRejectedValue(new Error('Fail'));
    
    // Act & Assert
    await expect(service.method(input)).rejects.toThrow('Fail');
  });
});
```

### Mocking External Services
```typescript
// Mock Azure Service Bus
jest.mock('@azure/service-bus', () => ({
  ServiceBusClient: jest.fn().mockImplementation(() => ({
    createSender: jest.fn().mockReturnValue({
      sendMessages: jest.fn(),
      close: jest.fn(),
    }),
    close: jest.fn(),
  })),
}));

// Mock MongoDB with Memory Server
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
```

## Security Considerations

### Input Validation
- Use Joi for all route inputs
- Sanitize before MongoDB queries
- Uppercase identifiers consistently

### Secrets Management
- Never commit secrets to git
- Use environment variables
- Rotate credentials regularly

### Azure Authentication
```typescript
// DefaultAzureCredential for Azure services
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const blobClient = new BlobServiceClient(blobUrl, credential);
```

## Performance Optimization

### Stream Processing
```typescript
// Good: Stream-based processing
const stream = await blobClient.download();
stream.pipe(parseStream).pipe(processStream);

// Bad: Loading entire file into memory
const buffer = await blobClient.downloadToBuffer();
```

### Generator Functions for Large Datasets
```typescript
function* processLargeDataset(data: any[]) {
  for (const item of data) {
    yield transform(item);
  }
}

// Use in loops
for (const transformed of processLargeDataset(largeArray)) {
  // Process one at a time
}
```

## Remember

- **Async/await everywhere** - no callbacks
- **Bracketed logging** for structured logs
- **moment.utc()** for all dates
- **Atomic cache updates** - no partial state
- **Joi validation** on all inputs
- **Try/catch** around external calls
- **>90%** enforced in batch/consolidation services
