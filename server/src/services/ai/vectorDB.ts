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
