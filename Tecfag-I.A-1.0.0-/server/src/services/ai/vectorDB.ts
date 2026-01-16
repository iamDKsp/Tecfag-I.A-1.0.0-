import { PrismaClient } from '@prisma/client';
import { cosineSimilarity } from './embeddings';

const prisma = new PrismaClient();

export interface VectorSearchResult {
    id: string;
    content: string;
    similarity: number;
    metadata: any;
    documentId: string;
    chunkIndex: number;
}

/**
 * Store document chunks with embeddings in the database
 */
export async function storeChunks(
    documentId: string,
    chunks: Array<{
        content: string;
        embedding: number[];
        chunkIndex: number;
        metadata?: any;
    }>
): Promise<void> {
    await prisma.documentChunk.createMany({
        data: chunks.map(chunk => ({
            documentId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            embedding: JSON.stringify(chunk.embedding),
            metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : null
        }))
    });
}

/**
 * Search for similar chunks using cosine similarity
 */
export async function searchSimilarChunks(
    queryEmbedding: number[],
    topK: number = 5,
    filters?: {
        documentId?: string;
        catalogId?: string;
    }
): Promise<VectorSearchResult[]> {
    // Get all chunks (with optional filters)
    const whereClause: any = {};

    if (filters?.documentId) {
        whereClause.documentId = filters.documentId;
    }

    if (filters?.catalogId) {
        whereClause.document = {
            catalogId: filters.catalogId
        };
    }

    const chunks = await prisma.documentChunk.findMany({
        where: whereClause,
        include: {
            document: true
        }
    });

    // Calculate similarity for each chunk
    const results: VectorSearchResult[] = chunks.map(chunk => {
        const embedding = JSON.parse(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, embedding);

        return {
            id: chunk.id,
            content: chunk.content,
            similarity,
            metadata: chunk.metadata ? JSON.parse(chunk.metadata) : {},
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex
        };
    });

    // Sort by similarity (descending) and return top K
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
}

/**
 * Delete all chunks for a document
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
    await prisma.documentChunk.deleteMany({
        where: { documentId }
    });
}

/**
 * Get chunks count for a document
 */
export async function getChunksCount(documentId: string): Promise<number> {
    return await prisma.documentChunk.count({
        where: { documentId }
    });
}

/**
 * Search by document - retrieves first chunks from each document for aggregation queries
 * This provides a high-level view of all available documents
 */
export async function searchByDocument(
    catalogId?: string,
    chunksPerDocument: number = 2
): Promise<VectorSearchResult[]> {
    const whereClause: any = {};

    if (catalogId) {
        whereClause.document = {
            catalogId
        };
    }

    // Get all unique documents
    const documents = await prisma.document.findMany({
        where: catalogId ? { catalogId } : undefined,
        select: {
            id: true,
            fileName: true,
        }
    });

    console.log(`[VectorDB] Found ${documents.length} documents for aggregation`);

    // Get first chunks from each document
    const results: VectorSearchResult[] = [];

    for (const doc of documents) {
        const chunks = await prisma.documentChunk.findMany({
            where: { documentId: doc.id },
            orderBy: { chunkIndex: 'asc' },
            take: chunksPerDocument,
            include: { document: true }
        });

        for (const chunk of chunks) {
            results.push({
                id: chunk.id,
                content: chunk.content,
                similarity: 0.5, // Default similarity for document-level fetch
                metadata: chunk.metadata ? JSON.parse(chunk.metadata) : { fileName: doc.fileName },
                documentId: chunk.documentId,
                chunkIndex: chunk.chunkIndex
            });
        }
    }

    return results;
}

/**
 * Get document statistics for aggregation queries
 */
export async function getDocumentStats(catalogId?: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    documentNames: string[];
}> {
    const whereClause = catalogId ? { catalogId } : {};

    const documents = await prisma.document.findMany({
        where: whereClause,
        select: {
            id: true,
            fileName: true,
            _count: {
                select: { chunks: true }
            }
        }
    });

    return {
        totalDocuments: documents.length,
        totalChunks: documents.reduce((sum: number, d: { _count: { chunks: number } }) => sum + d._count.chunks, 0),
        documentNames: documents.map((d: { fileName: string }) => d.fileName)
    };
}

/**
 * Get ALL chunks from documents matching specific patterns
 * Used for aggregation/count queries where we need complete document context
 * This is the key difference vs NotebookLM - we now retrieve FULL documents
 */
export async function getFullDocumentChunks(
    documentPatterns: string[],
    catalogId?: string
): Promise<VectorSearchResult[]> {
    // Build OR conditions for document name patterns
    const patternConditions = documentPatterns.map(pattern => ({
        fileName: { contains: pattern }
    }));

    const whereClause: any = {
        OR: patternConditions
    };

    if (catalogId) {
        whereClause.catalogId = catalogId;
    }

    // Find all matching documents
    const documents = await prisma.document.findMany({
        where: whereClause,
        select: {
            id: true,
            fileName: true,
        }
    });

    console.log(`[VectorDB] Full document retrieval: Found ${documents.length} matching documents for patterns: ${documentPatterns.join(', ')}`);

    const results: VectorSearchResult[] = [];

    // Get ALL chunks from each matching document (no limit!)
    for (const doc of documents) {
        const chunks = await prisma.documentChunk.findMany({
            where: { documentId: doc.id },
            orderBy: { chunkIndex: 'asc' },
            // ⚠️ NO LIMIT - retrieve ALL chunks for complete context
        });

        console.log(`[VectorDB] Retrieved ${chunks.length} chunks from "${doc.fileName}"`);

        for (const chunk of chunks) {
            results.push({
                id: chunk.id,
                content: chunk.content,
                similarity: 0.8, // High similarity for full document retrieval
                metadata: chunk.metadata ? JSON.parse(chunk.metadata) : { fileName: doc.fileName },
                documentId: chunk.documentId,
                chunkIndex: chunk.chunkIndex
            });
        }
    }

    console.log(`[VectorDB] Total chunks retrieved for aggregation: ${results.length}`);
    return results;
}
