import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countDocuments() {
    const documents = await prisma.document.findMany({
        select: { id: true, fileName: true, indexed: true, isActive: true, chunkCount: true }
    });

    const catalogItems = await prisma.catalogItem.findMany({
        select: { id: true, name: true, code: true, category: true }
    });

    const chunks = await prisma.documentChunk.count();

    console.log('='.repeat(60));
    console.log('📊 ESTATÍSTICAS DO SISTEMA TECFAG I.A');
    console.log('='.repeat(60));

    console.log(`\n📄 DOCUMENTOS CADASTRADOS: ${documents.length}`);
    console.log('─'.repeat(40));
    documents.forEach((d, i) => {
        const status = d.indexed ? '✅' : '⏳';
        const active = d.isActive ? '' : ' (INATIVO)';
        console.log(`  ${i + 1}. ${status} ${d.fileName}${active}`);
    });

    console.log(`\n🏭 ITENS DO CATÁLOGO: ${catalogItems.length}`);
    console.log('─'.repeat(40));
    catalogItems.forEach((c, i) => {
        console.log(`  ${i + 1}. [${c.code}] ${c.name} (${c.category})`);
    });

    console.log(`\n📦 TOTAL DE CHUNKS INDEXADOS: ${chunks}`);
    console.log('='.repeat(60));
}

countDocuments()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });
