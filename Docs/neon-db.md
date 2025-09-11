# Connecting to NeonDB with Prisma

This document outlines how the SoulMatch application connects to its NeonDB serverless PostgreSQL database using Prisma as the Object-Relational Mapper (ORM).

## 1. Overview

To achieve a scalable and efficient connection in a serverless environment, we use a specific stack:
- **Database:** [NeonDB](https://neon.tech/) (Serverless PostgreSQL)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Driver:** `@neondatabase/serverless`
- **Adapter:** `@prisma/adapter-neon`

This combination allows our application to open database connections over HTTP or WebSockets, avoiding the limitations of traditional TCP-based connections in serverless functions.

## 2. Environment Variables

To connect Prisma to Neon, your environment must have the following variable set:

- `DIRECT_URL`: This is the **direct connection string** provided by Neon. It's crucial to use the direct URL, not the pooled one, as the `@neondatabase/serverless` driver handles its own efficient connection management.

The connection string should look like this:
```
DIRECT_URL="postgresql://<user>:<password>@<host>/<dbname>"
```

### 2.1. Connection Parameters

As per the project requirements, specific parameters are added to the connection string to control timeouts:

- `sslmode=require`: Enforces a secure SSL connection, which is mandatory for Neon.
- `connect_timeout=30`: Sets a 30-second timeout for establishing the initial connection.
- `pool_timeout=60`: Sets a 60-second timeout for acquiring a connection from the pool.

The final connection string used in the application code looks like this:
`postgresql://<user>:<password>@<host>/<dbname>?sslmode=require&connect_timeout=30&pool_timeout=60`

## 3. Prisma Client Initialization

The Prisma client is initialized in `services/neon.ts`. Here's a breakdown of the setup:

1.  **`Pool` from `@neondatabase/serverless`:** A connection pool is created using the Neon serverless driver. This pool is optimized for serverless environments, managing connections efficiently.
2.  **`PrismaNeon` from `@prisma/adapter-neon`:** This adapter acts as a bridge, allowing Prisma's query engine to communicate with the Neon serverless driver's pool.
3.  **`PrismaClient`:** The Prisma client is instantiated with the Neon adapter, enabling all data queries to be routed through this serverless-compatible stack.

```typescript
// services/neon.ts
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DIRECT_URL}?sslmode=require&connect_timeout=30&pool_timeout=60`;

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
```

This setup ensures that every database query made through `prisma` is performant, secure, and compatible with the serverless execution model.
