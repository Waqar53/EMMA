import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Use DATABASE_URL from .env — same source of truth as prisma.config.ts
const DB_URL = process.env.DATABASE_URL || 'file:./dev.db';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
    const adapter = new PrismaBetterSqlite3({ url: DB_URL.startsWith('file:') ? DB_URL : `file:${DB_URL}` });
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
