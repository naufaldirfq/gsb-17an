import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  try {
    return new PrismaClient()
  } catch (e) {
    console.warn("Failed to initialize PrismaClient:", e);
    // Mock client for build time if constructor fails
    return {
      competition: { findMany: async () => [], findUnique: async () => null },
      participant: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}) },
      registration: { findUnique: async () => null, create: async () => ({}) },
    } as unknown as PrismaClient;
  }
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
