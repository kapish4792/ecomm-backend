import 'dotenv/config';
import prisma from '../lib/prisma.ts';

async function main() {
    await prisma.role.createMany({
        data: [
            {
                name: "USER",
                description: "Regular user",
            },
            {
                name: "ADMIN",
                description: "Administrator",
            },
            {
                name: "SUPERADMIN",
                description: "Super Administrator",
            },
        ],
        skipDuplicates: true,
    });

    console.log("Roles seeded successfully");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });