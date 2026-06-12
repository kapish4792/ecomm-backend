import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const prismaClientSingleton = () => {
    const adapter = new PrismaPg(process.env.DATABASE_URL!);
    return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

// Check if prisma is already on the global object, otherwise create it
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

// In development, save the instance to the global object
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
