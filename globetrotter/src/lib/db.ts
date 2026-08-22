import { PrismaClient } from "@prisma/client"

// Singleton: Next.js hot-reload would otherwise open a new pool per edit
// and exhaust Postgres connections within a few minutes of development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
