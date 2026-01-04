import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingUsers() {
    console.log('🔄 Starting migration: Creating default folders for existing users...');

    try {
        // Get all users
        const users = await prisma.user.findMany({
            select: { id: true, email: true },
        });

        console.log(`📊 Found ${users.length} users`);

        for (const user of users) {
            // Check if user already has a default folder
            const existingDefault = await prisma.chatFolder.findFirst({
                where: {
                    userId: user.id,
                    isDefault: true,
                },
            });

            if (existingDefault) {
                console.log(`✓ User ${user.email} already has default  folder`);
                continue;
            }

            // Create default "Fixados" folder
            await prisma.chatFolder.create({
                data: {
                    userId: user.id,
                    name: 'Fixados',
                    isDefault: true,
                    order: 0,
                },
            });

            console.log(`✓ Created "Fixados" folder for user ${user.email}`);
        }

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateExistingUsers();
