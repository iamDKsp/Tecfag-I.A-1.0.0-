import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeSeladoras() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ANÁLISE DE SELADORAS NOS CHUNKS');
    console.log('='.repeat(70));

    // Buscar todos os chunks que contêm "seladora" ou "selagem"
    const allChunks = await prisma.documentChunk.findMany({
        include: { document: true }
    });

    const seladoraChunks = allChunks.filter(chunk =>
        chunk.content.toLowerCase().includes('seladora') ||
        chunk.content.toLowerCase().includes('selagem') ||
        chunk.content.toLowerCase().includes('vácuo') ||
        chunk.content.toLowerCase().includes('vacuo') ||
        chunk.content.toLowerCase().includes('indução') ||
        chunk.content.toLowerCase().includes('inducao')
    );

    console.log(`\n📊 Encontrados ${seladoraChunks.length} chunks com dados de seladoras\n`);

    // Agrupar por documento
    const byDocument = new Map<string, typeof seladoraChunks>();
    for (const chunk of seladoraChunks) {
        const key = chunk.document.fileName;
        if (!byDocument.has(key)) byDocument.set(key, []);
        byDocument.get(key)!.push(chunk);
    }

    console.log('📄 Chunks por documento:');
    for (const [fileName, chunks] of byDocument) {
        console.log(`  ${chunks.length} chunks - ${fileName}`);
    }

    // Analisar conteúdo para encontrar modelos específicos
    console.log('\n' + '-'.repeat(70));
    console.log('🔎 MODELOS DE SELADORAS ENCONTRADOS:');
    console.log('-'.repeat(70) + '\n');

    const seladoraModels = new Set<string>();
    const patterns = [
        /SELADORA[^\n]*/gi,
        /SEAL[A-Z]*[^\n]*/gi,
        /[A-Z]{2,3}[-\s]?\d{2,4}[A-Z]?[^\n]*/gi,  // Códigos como FRP-400, TC20
    ];

    for (const chunk of seladoraChunks) {
        const content = chunk.content;

        // Buscar por padrões de código de produto
        const codeMatches = content.match(/PAM[A-Z]{2}[A-Z]{2}\d{3}/g) || [];
        for (const code of codeMatches) {
            if (content.includes('SELADORA') || content.includes('SEAL')) {
                // Extrair a linha completa do código
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.includes(code) && (line.toLowerCase().includes('seladora') || line.toLowerCase().includes('seal'))) {
                        const cleanLine = line.substring(0, 100).trim();
                        seladoraModels.add(cleanLine);
                    }
                }
            }
        }

        // Buscar descrições de seladoras
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.toLowerCase().includes('seladora') && line.length > 20 && line.length < 200) {
                seladoraModels.add(line.trim());
            }
        }
    }

    // Mostrar modelos únicos encontrados
    const modelArray = Array.from(seladoraModels).sort();
    console.log(`Total de linhas únicas com "seladora": ${modelArray.length}\n`);

    modelArray.slice(0, 50).forEach((model, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${model.substring(0, 100)}`);
    });

    if (modelArray.length > 50) {
        console.log(`  ... e mais ${modelArray.length - 50} linhas`);
    }

    // Mostrar amostra de chunk com seladoras
    console.log('\n' + '-'.repeat(70));
    console.log('📋 AMOSTRA DE CHUNK COM SELADORAS:');
    console.log('-'.repeat(70) + '\n');

    const sampleChunk = seladoraChunks.find(c =>
        c.content.toLowerCase().includes('seladora manual') ||
        c.content.toLowerCase().includes('seladora de pedal') ||
        c.content.toLowerCase().includes('seladora automática')
    );

    if (sampleChunk) {
        console.log(`Documento: ${sampleChunk.document.fileName}`);
        console.log(`Chunk ${sampleChunk.chunkIndex}:\n`);
        console.log(sampleChunk.content.substring(0, 2000));
    } else {
        console.log('Nenhum chunk específico de tipos de seladora encontrado');
        // Mostrar primeiro chunk com seladora
        if (seladoraChunks.length > 0) {
            console.log(`\nPrimeiro chunk: ${seladoraChunks[0].document.fileName}`);
            console.log(seladoraChunks[0].content.substring(0, 1500));
        }
    }

    console.log('\n' + '='.repeat(70));
}

analyzeSeladoras()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });
