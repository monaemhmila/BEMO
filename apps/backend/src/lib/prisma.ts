import { PrismaClient } from "@prisma/client";

// Create a singleton prisma client for the backend
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prismaClient = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

