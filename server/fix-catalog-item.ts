
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing catalog items...');

    const machines = [
        {
            id: "1",
            name: "PAGINADORA ROTATIVA EM ACO INOX",
            category: "Esteiras Transportadoras",
            description: "Paginadora rotativa para aplicações industriais",
            code: "PAMQIPAU007"
        },
        {
            id: "2",
            name: "ALIMENTADOR ELEVADOR DE CANECAS P/ EMPACOTADORAS",
            category: "Esteiras Transportadoras",
            description: "Alimentador de canecas",
            code: "PAMQGPAU055"
        }
    ];

    for (const machine of machines) {
        const existing = await prisma.catalogItem.findUnique({
            where: { id: machine.id }
        });

        if (!existing) {
            // Check if code exists (unique constraint)
            const existingCode = await prisma.catalogItem.findUnique({
                where: { code: machine.code }
            });

            if (existingCode) {
                console.log(`Updating machine ${machine.id} (code match)...`);
                await prisma.catalogItem.update({
                    where: { code: machine.code },
                    data: {
                        // If we update, we can't change ID easily if it's referenced.
                        // But here we want to ensure ID=1 exists.
                        // If code match but ID different, we have a problem.
                        // Let's just create if not exists by ID.
                    }
                });
                // Actually, if code matches but id is different, we delete the old one?
                // Let's just create if id not exists and code not exists.
                console.warn(`Skipping ${machine.id} because code ${machine.code} exists with ID ${existingCode.id}`);
            } else {
                console.log(`Creating machine ${machine.id}...`);
                await prisma.catalogItem.create({
                    data: machine
                });
            }
        } else {
            console.log(`Machine ${machine.id} already exists.`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
