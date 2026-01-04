
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting deletion debug script...");

    // 1. Create a dummy user
    const userEmail = `deltest_${Date.now()}@example.com`;
    console.log(`Creating user ${userEmail}...`);

    try {
        const user = await prisma.user.create({
            data: {
                name: 'Delete Test User',
                email: userEmail,
                password: 'password123',
                role: 'USER',
            }
        });
        console.log(`User created: ${user.id}`);

        // 2. Create related data to simulate complex state

        // Create a folder
        const folder = await prisma.chatFolder.create({
            data: {
                userId: user.id,
                name: 'Test Folder',
                order: 1
            }
        });
        console.log(`Folder created: ${folder.id}`);

        // Create an archived chat inside the folder
        const archivedChat = await prisma.archivedChat.create({
            data: {
                userId: user.id,
                title: 'Test Archive',
                messagesCount: 1,
                messages: '[]',
                folderId: folder.id
            }
        });
        console.log(`Archived Chat created: ${archivedChat.id}`);

        // Create a regular chat message
        await prisma.chatMessage.create({
            data: {
                userId: user.id,
                role: 'user',
                content: 'Hello world'
            }
        });
        console.log('Chat message created');

        // 3. Try to delete the user
        console.log('Attempting to delete user...');
        await prisma.user.delete({
            where: { id: user.id }
        });
        console.log('SUCCESS: User deleted successfully!');

    } catch (error) {
        console.error('FAILURE: Error deleting user:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
