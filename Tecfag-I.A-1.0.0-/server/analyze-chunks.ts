import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeChunks() {
    console.log('\n='.repeat(60));
    console.log('📊 ANÁLISE DETALHADA DE CHUNKS');
    console.log('='.repeat(60));

    // Chunks por documento
    const docs = await prisma.document.findMany({
        select: {
            id: true,
            fileName: true,
            _count: { select: { chunks: true } }
        }
    });

    console.log('\n📄 CHUNKS POR DOCUMENTO:');
    console.log('-'.repeat(50));
    docs.sort((a, b) => b._count.chunks - a._count.chunks);
    docs.forEach(d => {
        console.log(`  ${d._count.chunks.toString().padStart(4)} chunks - ${d.fileName}`);
    });

    const totalChunks = docs.reduce((s, d) => s + d._count.chunks, 0);
    console.log(`\n  TOTAL: ${totalChunks} chunks em ${docs.length} documentos`);

    // Amostra de um chunk da planilha principal
    const planilhaDoc = docs.find(d => d.fileName.includes('planilha'));
    if (planilhaDoc) {
        console.log('\n📑 AMOSTRA DE CHUNKS DA PLANILHA:');
        console.log('-'.repeat(50));

        const sampleChunks = await prisma.documentChunk.findMany({
            where: { documentId: planilhaDoc.id },
            take: 3,
            orderBy: { chunkIndex: 'asc' }
        });

        sampleChunks.forEach((chunk, i) => {
            console.log(`\n--- Chunk ${chunk.chunkIndex} (${chunk.content.length} chars) ---`);
            console.log(chunk.content.substring(0, 500) + '...');
        });
    }

    console.log('\n='.repeat(60));
}

analyzeChunks()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });
