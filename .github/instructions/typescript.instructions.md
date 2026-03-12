---
description: 'TypeScript strict rules for MMO FES services. Enforces type safety, no-any, and explicit typing conventions.'
applyTo: '**/*.ts'
---

# TypeScript Rules

Essential type safety rules enforced on all TypeScript files. Detailed patterns and examples are in the `/develop` skill.

## Mandatory Rules

- Strict TypeScript config: `strict`, `noImplicitAny`, `strictNullChecks` all enabled
- Never use `any` — use explicit interfaces, `unknown` with type guards, or utility types
- Extend shared library types: `interface ILandingModel extends ILanding, Document {}`
- Separate DTOs from domain models
- Use discriminated unions for type-safe variants with exhaustiveness checks
- Use type guard functions (`obj is Type`) for runtime type validation
- Explicit `Promise<T>` return types on async functions
- Use built-in utility types: `Partial`, `Pick`, `Omit`, `Readonly`, `Required`

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
