# Prisma Setup for SoulMatch

This document provides an overview of how Prisma is configured and used in the SoulMatch application to interact with the NeonDB database.

## 1. Prisma Schema (`prisma/schema.prisma`)

The `schema.prisma` file is the single source of truth for our database schema. It contains definitions for all models (tables), their fields (columns), and the relationships between them.

### Key Features of the Schema:
- **Datasource:** Configured to use PostgreSQL (`postgresql`) and connects via the `DIRECT_URL` environment variable, which is essential for the Neon serverless driver.
- **Generator:** Set up to generate the Prisma Client (`prisma-client-js`) with the `driverAdapters` preview feature enabled, which is necessary for using the Neon adapter.
- **Models:** Every table in our database, from `User` and `Event` to join tables like `EventParticipant`, is defined as a model.
- **Relations:** Relationships (one-to-one, one-to-many, many-to-many) are explicitly defined using the `@relation` attribute, providing type-safe querying across tables.
- **Mapping:** `@@map` and `@map` are used to map the PascalCase model and camelCase field names in Prisma to the snake_case table and column names in the database, maintaining consistency with PostgreSQL conventions.

## 2. Generating the Prisma Client

The Prisma Client is a type-safe query builder that is auto-generated from our `schema.prisma` file. To generate or update the client after schema changes, run the following command:

```bash
npx prisma generate
```

This command reads the schema and creates the necessary client code inside the `node_modules/@prisma/client` directory.

## 3. Using the Prisma Client

The Prisma Client is instantiated and configured for NeonDB in `services/neon.ts`. This singleton instance is then imported throughout the application for all database operations.

### Example: Replacing a Supabase query with Prisma

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('events')
  .select('*, participants:event_participants(count)')
  .eq('id', eventId)
  .single();
```

**After (Prisma):**
```typescript
import prisma from '../services/neon';

const event = await prisma.event.findUnique({
  where: { id: Number(eventId) },
  include: {
    _count: { // Prisma's way of counting relations
      select: { event_participants: true }
    }
  }
});
// The number of participants is available at event._count.event_participants
```

This migration provides several benefits:
-   **Full Type Safety:** All queries and their results are fully typed, catching errors at build time instead of runtime.
-   **Improved Readability:** Prisma's query syntax is often more intuitive and readable than raw SQL strings or alternative query builders.
-   **Auto-completion:** Developers get auto-completion for models, fields, and operators in their code editor, speeding up development.

By centralizing the database schema and using the generated client, we ensure that our data access layer is robust, maintainable, and highly efficient.
