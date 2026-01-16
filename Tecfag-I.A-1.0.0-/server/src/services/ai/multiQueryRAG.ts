/**
 * Multi-Query RAG - Sistema de recuperação avançada com múltiplas queries
 * 
 * Este módulo implementa:
 * 1. Geração de múltiplas sub-queries para perguntas complexas
 * 2. Fusão inteligente de resultados de múltiplas buscas
 * 3. Deduplicação de chunks recuperados
 * 4. Ranking por relevância combinada
 */

import { generateEmbedding } from './embeddings';
import { searchSimilarChunks, VectorSearchResult, searchByDocument, getFullDocumentChunks } from './vectorDB';
import { QueryAnalysis } from './queryAnalyzer';

export interface MultiQueryResult {
    chunks: VectorSearchResult[];
    uniqueDocuments: string[];
    totalChunksBeforeDedup: number;
    queryBreakdown: {
        query: string;
        chunksFound: number;
    }[];
}

/**
 * Executa busca multi-query para perguntas complexas
 */
export async function multiQuerySearch(
    originalQuestion: string,
    analysis: QueryAnalysis,
    catalogId?: string
): Promise<MultiQueryResult> {
    const allQueries = [originalQuestion, ...analysis.suggestedQueries];
    const queryBreakdown: { query: string; chunksFound: number }[] = [];
    const allChunks: VectorSearchResult[] = [];
    const seenChunkIds = new Set<string>();

    console.log(`[MultiQueryRAG] Executing ${allQueries.length} queries...`);

    // Determinar chunks por query baseado no tipo
    const chunksPerQuery = Math.ceil(analysis.contextSize / Math.max(allQueries.length, 1));

    // Executar todas as queries em paralelo
    const queryPromises = allQueries.map(async (query) => {
        try {
            const embedding = await generateEmbedding(query);
            const chunks = await searchSimilarChunks(
                embedding,
                chunksPerQuery,
                catalogId ? { catalogId } : undefined
            );
            return { query, chunks };
        } catch (error) {
            console.error(`[MultiQueryRAG] Error for query "${query}":`, error);
            return { query, chunks: [] };
        }
    });

    const results = await Promise.all(queryPromises);

    // Processar resultados e deduplicar
    for (const { query, chunks } of results) {
        queryBreakdown.push({ query, chunksFound: chunks.length });

        for (const chunk of chunks) {
            if (!seenChunkIds.has(chunk.id)) {
                seenChunkIds.add(chunk.id);
                allChunks.push(chunk);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FULL DOCUMENT RETRIEVAL - Key improvement to match NotebookLM
    // For count/aggregation queries, we need ALL data from key documents
    // ═══════════════════════════════════════════════════════════════
    if (analysis.isCountQuery || analysis.requiresFullScan) {
        console.log('[MultiQueryRAG] 🎯 Count/Aggregation query detected - using FULL DOCUMENT RETRIEVAL');

        // Patterns for documents that contain catalog/inventory data
        const catalogPatterns = [
            'planilha',
            'catalogo',
            'catálogo',
            'mapeamento',
            'lista',
            'inventario',
            'inventário',
            'todas',
            'completo'
        ];

        // Retrieve ALL chunks from matching documents
        const fullDocChunks = await getFullDocumentChunks(catalogPatterns, catalogId);

        console.log(`[MultiQueryRAG] Retrieved ${fullDocChunks.length} chunks via full document retrieval`);

        for (const chunk of fullDocChunks) {
            if (!seenChunkIds.has(chunk.id)) {
                seenChunkIds.add(chunk.id);
                allChunks.push(chunk);
            }
        }

        // Also fetch document-level summaries for other documents
        const docChunks = await fetchDocumentLevelData(catalogId);
        for (const chunk of docChunks) {
            if (!seenChunkIds.has(chunk.id)) {
                seenChunkIds.add(chunk.id);
                allChunks.push(chunk);
            }
        }
    }

    // For count queries, don't limit chunks - we need ALL data for accurate counting
    // This is key to matching NotebookLM's behavior
    let sortedChunks: VectorSearchResult[];

    if (analysis.isCountQuery) {
        // For count queries, use all chunks sorted by chunkIndex to maintain document order
        sortedChunks = allChunks.sort((a, b) => {
            // First sort by documentId, then by chunkIndex
            if (a.documentId !== b.documentId) {
                return a.documentId.localeCompare(b.documentId);
            }
            return a.chunkIndex - b.chunkIndex;
        });
        console.log(`[MultiQueryRAG] Count query: keeping ALL ${sortedChunks.length} chunks (no limit)`);
    } else {
        // For other queries, limit by contextSize and sort by similarity
        sortedChunks = allChunks
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, analysis.contextSize);
    }

    // Identificar documentos únicos
    const uniqueDocuments = [...new Set(sortedChunks.map(c => c.documentId))];

    console.log(`[MultiQueryRAG] Retrieved ${sortedChunks.length} unique chunks from ${uniqueDocuments.length} documents`);

    return {
        chunks: sortedChunks,
        uniqueDocuments,
        totalChunksBeforeDedup: allChunks.length,
        queryBreakdown,
    };
}

/**
 * Busca dados em nível de documento para agregações
 * Pega os primeiros chunks de cada documento para ter uma visão geral
 */
async function fetchDocumentLevelData(catalogId?: string): Promise<VectorSearchResult[]> {
    try {
        const docSummaries = await searchByDocument(catalogId);
        return docSummaries;
    } catch (error) {
        console.error('[MultiQueryRAG] Error fetching document-level data:', error);
        return [];
    }
}

/**
 * Agrupa chunks por documento fonte para melhor contexto
 */
export function groupChunksByDocument(chunks: VectorSearchResult[]): Map<string, VectorSearchResult[]> {
    const grouped = new Map<string, VectorSearchResult[]>();

    for (const chunk of chunks) {
        const docId = chunk.documentId;
        if (!grouped.has(docId)) {
            grouped.set(docId, []);
        }
        grouped.get(docId)!.push(chunk);
    }

    // Ordenar chunks dentro de cada documento por chunkIndex
    for (const [docId, docChunks] of grouped) {
        grouped.set(docId, docChunks.sort((a, b) => a.chunkIndex - b.chunkIndex));
    }

    return grouped;
}

/**
 * Formata contexto agrupado por documento para melhor compreensão
 */
export function formatGroupedContext(
    groupedChunks: Map<string, VectorSearchResult[]>
): string {
    const sections: string[] = [];
    let docIndex = 1;

    for (const [docId, chunks] of groupedChunks) {
        const fileName = chunks[0]?.metadata?.fileName || 'Documento';
        const content = chunks.map(c => c.content).join('\n\n');

        sections.push(
            `═══════════════════════════════════════════════════════════════\n` +
            `📄 DOCUMENTO ${docIndex}: ${fileName}\n` +
            `═══════════════════════════════════════════════════════════════\n` +
            `${content}`
        );
        docIndex++;
    }

    return sections.join('\n\n');
}

/**
 * Calcula score de cobertura para perguntas de agregação
 */
export function calculateCoverageScore(
    result: MultiQueryResult,
    expectedCategories: string[]
): number {
    if (expectedCategories.length === 0) {
        return result.uniqueDocuments.length > 5 ? 1.0 : result.uniqueDocuments.length / 5;
    }

    // Verificar quantas categorias foram cobertas
    const contentLower = result.chunks.map(c => c.content.toLowerCase()).join(' ');
    let covered = 0;

    for (const cat of expectedCategories) {
        if (contentLower.includes(cat)) {
            covered++;
        }
    }

    return covered / expectedCategories.length;
}
