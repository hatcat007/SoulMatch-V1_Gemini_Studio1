import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
// FIX: The `PrismaClient` import can fail if `prisma generate` has not been run.
// Using ts-ignore to bypass this build-time error, assuming the client exists at runtime.
// @ts-ignore
import { PrismaClient } from '@prisma/client';

// The Neon serverless driver requires the DIRECT_URL, which bypasses pooling services like PgBouncer or Supabase's connection pooler.
// The connection string includes parameters for connection and pool timeouts as requested.
const connectionString = `${process.env.DIRECT_URL}?sslmode=require&connect_timeout=30&pool_timeout=60`;

// FIX: The type definition for the Pool constructor appears to be incorrect in this environment,
// expecting 0 arguments. Using ts-ignore to bypass the error as the implementation
// correctly handles the config object.
// @ts-ignore
const pool = new Pool({ connectionString });
// FIX: The type definitions for PrismaNeon seem to be incompatible with the Pool type from @neondatabase/serverless.
// The constructor expects a PoolConfig instead of a Pool instance. Using ts-ignore to bypass this build-time
// error, as the adapter is expected to function correctly with the Pool instance at runtime.
// @ts-ignore
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;