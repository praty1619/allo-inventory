import { PrismaClient } from '../generated/prisma'

// Define a function that creates the Prisma client instance
const prismaClientSingleton = () => {
    return new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
    })
}

// Extend the global object so TypeScript doesn't complain
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// Use the global instance if it exists (in development), otherwise create a new one
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

// In development, save the instance to the global object so it survives hot-reloads
if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}