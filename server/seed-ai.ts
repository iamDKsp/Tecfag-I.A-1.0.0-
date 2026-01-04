import { PrismaClient } from '@prisma/client';
import { chunkText, estimateTokens } from './src/services/ai/chunking.js';
import { generateEmbeddingsBatch } from './src/services/ai/embeddings.js';
import { storeChunks } from './src/services/ai/vectorDB.js';

const prisma = new PrismaClient();

/**
 * Seed AI with existing machine data from catalog
 * This converts each machine into a text document and indexes it
 */
async function seedMachinesAI() {
    console.log('🤖 Starting AI seeding with machine data...\n');

    try {
        // 1. Get all machines
        const machines = await prisma.machine.findMany({
            include: {
                specifications: true
            }
        });

        console.log(`Found ${machines.length} machines to index\n`);

        // 2. For each machine, create a CatalogItem and Document
        for (const machine of machines) {
            console.log(`\n📦 Processing: ${machine.name}`);

            // Create or get CatalogItem
            let catalogItem = await prisma.catalogItem.findUnique({
                where: { code: machine.model }
            });

            if (!catalogItem) {
                catalogItem = await prisma.catalogItem.create({
                    data: {
                        code: machine.model,
                        name: machine.name,
                        category: machine.category,
                        description: `Modelo: ${machine.model} | Categoria: ${machine.category}`
                    }
                });
                console.log(`  ✓ Created catalog item: ${catalogItem.code}`);
            }

            // Convert machine data to text document
            const machineText = convertMachineToText(machine);
            console.log(`  ✓ Generated text document (${machineText.length} chars)`);

            // Create Document record
            const document = await prisma.document.create({
                data: {
                    catalogId: catalogItem.id,
                    fileName: `${machine.model}-auto-generated.txt`,
                    fileType: 'text/plain',
                    fileSize: machineText.length,
                    filePath: 'auto-generated',
                    indexed: false,
                    processingProgress: 0
                }
            });

            console.log(`  ✓ Created document record: ${document.id}`);

            // Process document: chunk and embed
            await processTextToChunks(document.id, machineText, {
                fileName: document.fileName,
                catalogId: catalogItem.id,
                machineName: machine.name,
                machineModel: machine.model,
                category: machine.category
            });

            console.log(`  ✅ Successfully indexed: ${machine.name}`);
        }

        console.log(`\n\n✅ AI seeding complete! Indexed ${machines.length} machines.`);
        console.log('\n🎯 You can now ask questions like:');
        console.log('   - "Quais máquinas temos disponíveis?"');
        console.log('   - "Qual a capacidade da máquina XYZ?"');
        console.log('   - "Me fale sobre o modelo PAMQIPAU007"');
        console.log('   - "Quais são as especificações da PAGINADORA?"');

    } catch (error) {
        console.error('❌ Error seeding AI:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Convert machine data to a text document
 */
function convertMachineToText(machine: any): string {
    const parts = [
        `CATÁLOGO DE MÁQUINAS - ${machine.category.toUpperCase()}`,
        ``,
        `Nome: ${machine.name}`,
        `Modelo: ${machine.model}`,
        `Categoria: ${machine.category}`,
        ``,
        `ESPECIFICAÇÕES TÉCNICAS:`,
        ``,
        `Capacidade: ${machine.capacity}`,
        `Preço: ${machine.price}`,
        ``,
        `Status de Manutenção: ${machine.maintenanceStatus}`,
        `Última Manutenção: ${machine.lastMaintenance}`,
        ``
    ];

    // Add specifications
    if (machine.specifications && machine.specifications.length > 0) {
        parts.push(`ESPECIFICAÇÕES DETALHADAS:`);
        parts.push(``);
        machine.specifications.forEach((spec: any, index: number) => {
            parts.push(`${index + 1}. ${spec.content}`);
        });
        parts.push(``);
    }

    // Add searchable keywords
    parts.push(`INFORMAÇÕES ADICIONAIS:`);
    parts.push(`Esta máquina está catalogada no sistema industrial.`);
    parts.push(`Para consultas sobre manutenção, capacidade ou especificações técnicas, consulte as informações acima.`);
    parts.push(`Modelo de referência: ${machine.model}`);

    return parts.join('\n');
}

/**
 * Process text into chunks and store with embeddings
 */
async function processTextToChunks(
    documentId: string,
    text: string,
    metadata: any
): Promise<void> {
    try {
        // Update progress
        await prisma.document.update({
            where: { id: documentId },
            data: { processingProgress: 30 }
        });

        // Chunk the text
        const chunks = chunkText(text, {
            chunkSize: 800,
            overlap: 150,
            strategy: 'semantic'
        });

        console.log(`    → Created ${chunks.length} chunks`);

        // Update progress
        await prisma.document.update({
            where: { id: documentId },
            data: { processingProgress: 50 }
        });

        // Generate embeddings
        const embeddings = await generateEmbeddingsBatch(chunks);
        console.log(`    → Generated ${embeddings.length} embeddings`);

        // Update progress
        await prisma.document.update({
            where: { id: documentId },
            data: { processingProgress: 80 }
        });

        // Store chunks
        await storeChunks(
            documentId,
            chunks.map((content, index) => ({
                content,
                embedding: embeddings[index],
                chunkIndex: index,
                metadata
            }))
        );

        // Update document status
        const totalTokens = chunks.reduce((sum, chunk) => sum + estimateTokens(chunk), 0);
        await prisma.document.update({
            where: { id: documentId },
            data: {
                indexed: true,
                indexedAt: new Date(),
                chunkCount: chunks.length,
                totalTokens,
                processingProgress: 100
            }
        });

        console.log(`    → Stored in vector database`);

    } catch (error) {
        await prisma.document.update({
            where: { id: documentId },
            data: {
                indexed: false,
                processingError: (error as Error).message
            }
        });
        throw error;
    }
}

// Run the seed
seedMachinesAI()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
