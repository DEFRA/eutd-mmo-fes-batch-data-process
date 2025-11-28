---
description: 'TypeScript best practices for MMO FES services'
applyTo: '**/*.{ts,tsx}'
---

# TypeScript Best Practices for MMO FES

This instructions file applies to all TypeScript code across the MMO Fish Export Service microservices ecosystem.

## Core Type Safety Principles

### 1. Strict Type Configuration
Always enforce strict TypeScript settings:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 2. Explicit Typing
Never use `any` - use proper types or `unknown`:
```typescript
// Bad: any type
function process(data: any) {
  return data.value;
}

// Good: Explicit interface
interface LandingData {
  rssNumber: string;
  dateLanded: Date;
  weight: number;
}

function process(data: LandingData) {
  return data.weight;
}

// Good: unknown for truly unknown data
function parseJson(json: string): unknown {
  return JSON.parse(json);
}

// Then use type guards
const result = parseJson(jsonString);
if (isLandingData(result)) {
  // result is now LandingData
  console.log(result.weight);
}
```

## Interface Design

### Domain Model Interfaces
```typescript
// Extend shared library types
import { ILanding, IDocument } from 'mmo-shared-reference-data';

// Add application-specific properties
export interface ILandingModel extends ILanding, Document {
  _status: LandingStatus;
  _correlationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Separate DTOs from domain models
export interface LandingDTO {
  rssNumber: string;
  dateLanded: string; // ISO date string
  weight: number;
}
```

### Discriminated Unions
Use discriminated unions for type-safe variants:
```typescript
// Transportation mode pattern
type Transportation =
  | { vehicle: 'truck'; registration: string; hasRoadTransportDocument: boolean }
  | { vehicle: 'plane'; flightNumber: string; containerId?: string }
  | { vehicle: 'vessel' | 'containerVessel'; name: string; flag: string }
  | { vehicle: 'train'; billOfLadingNumber: string };

function formatTransportation(transport: Transportation): string {
  switch (transport.vehicle) {
    case 'truck':
      return `Truck ${transport.registration}`; // registration available
    case 'plane':
      return `Flight ${transport.flightNumber}`; // flightNumber available
    case 'vessel':
    case 'containerVessel':
      return `Vessel ${transport.name}`; // name available
    case 'train':
      return `Train ${transport.billOfLadingNumber}`; // billOfLadingNumber available
    default:
      // Exhaustiveness check
      const _exhaustive: never = transport;
      return _exhaustive;
  }
}
```

## Type Guards

### Runtime Type Checking
```typescript
// Type guard functions
export function isLanding(obj: unknown): obj is ILanding {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'rssNumber' in obj &&
    'dateLanded' in obj &&
    typeof (obj as ILanding).rssNumber === 'string'
  );
}

// Use in validation
function processData(data: unknown) {
  if (!isLanding(data)) {
    throw new Error('Invalid landing data');
  }
  
  // data is now ILanding
  console.log(data.rssNumber);
}
```

### Narrow Types with Guards
```typescript
// Narrow optional properties
interface Document {
  documentNumber: string;
  exportData?: {
    catches: Array<{ species: string }>;
  };
}

function getCatchSpecies(doc: Document): string[] {
  // Narrow with guard
  if (!doc.exportData || !doc.exportData.catches) {
    return [];
  }
  
  // exportData is guaranteed to exist here
  return doc.exportData.catches.map(c => c.species);
}
```

## Enum Best Practices

### Const Enums for Constants
```typescript
// Good: String enum for serialization
export enum LandingStatus {
  Pending = 'PENDING',
  Validated = 'VALIDATED',
  Failed = 'FAILED',
}

// Good: Numeric enum for flags
export enum Permissions {
  None = 0,
  Read = 1,
  Write = 2,
  Delete = 4,
  Admin = Read | Write | Delete,
}

// Bad: Computed enums (hard to debug)
export enum BadEnum {
  Value = someFunction(),
}
```

### Enum Iteration
```typescript
// Get all enum values
const allStatuses = Object.values(LandingStatus);

// Check membership
function isValidStatus(status: string): status is LandingStatus {
  return Object.values(LandingStatus).includes(status as LandingStatus);
}
```

## Generics for Reusability

### Generic Functions
```typescript
// API response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  const data = await response.json();
  return {
    data: data as T,
    status: response.status,
  };
}

// Usage with explicit type
const landingResponse = await fetchData<ILanding[]>('/api/landings');
```

### Constrained Generics
```typescript
// Constrain to specific base type
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Works with any type that has id
const landing = findById(landings, 'GBR-2023-CC-1234');
```

## Async/Await Typing

### Promise Return Types
```typescript
// Explicit Promise return type
async function fetchLandings(): Promise<ILanding[]> {
  const response = await axios.get<ILanding[]>('/api/landings');
  return response.data;
}

// Error handling with union types
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

async function safeFetch(url: string): Promise<Result<unknown>> {
  try {
    const data = await fetch(url).then(r => r.json());
    return { success: true, value: data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Utility Types

### Use Built-in Utility Types
```typescript
// Partial for optional updates
interface Landing {
  rssNumber: string;
  dateLanded: Date;
  weight: number;
}

function updateLanding(id: string, updates: Partial<Landing>) {
  // All fields optional
}

// Pick for subsets
type LandingKey = Pick<Landing, 'rssNumber' | 'dateLanded'>;

// Omit to exclude fields
type LandingWithoutWeight = Omit<Landing, 'weight'>;

// Required to make all fields mandatory
type RequiredLanding = Required<Partial<Landing>>;

// Readonly for immutable data
type ImmutableLanding = Readonly<Landing>;
```

### Custom Mapped Types
```typescript
// Make all properties nullable
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// Make nested properties optional
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

## Module Augmentation

### Extend Third-Party Types
```typescript
// Extend Hapi Request
import '@hapi/hapi';

declare module '@hapi/hapi' {
  interface ApplicationState {
    claims: {
      sub: string; // User principal
      contactId: string;
      role: string;
    };
  }
  
  interface Request {
    app: ApplicationState;
  }
}

// Now available in handlers
server.route({
  handler: (request, h) => {
    const userId = request.app.claims.sub; // Type-safe
    return h.response();
  },
});
```

## Testing Types

### Type Assertions in Tests
```typescript
import { expectType } from 'tsd';

// Type-level tests
expectType<ILanding[]>(await fetchLandings());

// Mock with correct types
const mockLanding: ILanding = {
  rssNumber: 'RSS123',
  dateLanded: new Date(),
  weight: 100,
  species: 'COD',
};

// Type-safe spies
const spy = jest.spyOn(service, 'fetch')
  .mockResolvedValue(mockLanding);

expect(spy).toHaveBeenCalled();
```

## Configuration Types

### Environment Config
```typescript
// Define config shape
interface ApplicationConfig {
  mongoUri: string;
  redisHost: string;
  serviceBusConnectionString: string;
  instrumentationKey: string;
}

// Validate at startup
function loadConfig(): ApplicationConfig {
  const config = {
    mongoUri: process.env.DB_CONNECTION_URI,
    redisHost: process.env.REDIS_HOST_NAME,
    serviceBusConnectionString: process.env.AZURE_QUEUE_CONNECTION_STRING,
    instrumentationKey: process.env.INSTRUMENTATION_KEY,
  };
  
  // Type guard validation
  if (!config.mongoUri) {
    throw new Error('DB_CONNECTION_URI required');
  }
  
  return config as ApplicationConfig;
}
```

## MongoDB/Mongoose Types

### Schema + Interface Pattern
```typescript
import { Schema, model, Document } from 'mongoose';

// Domain interface
export interface ILanding {
  rssNumber: string;
  dateLanded: Date;
  weight: number;
}

// Mongoose document interface
export interface ILandingModel extends ILanding, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema with type safety
const LandingSchema = new Schema<ILandingModel>({
  rssNumber: { type: String, required: true },
  dateLanded: { type: Date, required: true },
  weight: { type: Number, required: true },
}, {
  timestamps: true,
});

// Typed model
export const Landing = model<ILandingModel>('Landing', LandingSchema);

// Usage with type inference
const landing = await Landing.findOne({ rssNumber: 'RSS123' }); // Type: ILandingModel | null
```

## Error Handling Types

### Typed Error Classes
```typescript
// Custom error with type discrimination
export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error handling with type narrowing
try {
  await validateLanding(landing);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.error(`Validation failed for ${error.field}: ${error.value}`);
  } else if (error instanceof Error) {
    logger.error(`Unexpected error: ${error.message}`);
  } else {
    logger.error('Unknown error', error);
  }
}
```

## Common Anti-Patterns

❌ **Using `any`**
```typescript
// Bad
function process(data: any) { }

// Good
function process(data: ILanding) { }
```

❌ **Type assertions instead of guards**
```typescript
// Bad
const landing = data as ILanding;

// Good
if (isLanding(data)) {
  const landing = data; // Inferred as ILanding
}
```

❌ **Non-null assertions without validation**
```typescript
// Bad
const weight = landing.weight!; // Assumes weight exists

// Good
const weight = landing.weight ?? 0; // Handles undefined
```

❌ **Overly complex types**
```typescript
// Bad: Hard to understand
type ComplexType<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends infer U ? U extends object ? ComplexType<U> : U : never;
};

// Good: Simple and clear
interface LandingData {
  rssNumber: string;
  weight: number;
}
```

## Remember

- **No `any`** - use proper types or `unknown`
- **Type guards** for runtime validation
- **Discriminated unions** for variants
- **Utility types** for transformations
- **Generic constraints** for reusability
- **Mongoose schemas** with typed interfaces
- **Custom error classes** with type discrimination
- **Exhaustiveness checks** in switch statements
