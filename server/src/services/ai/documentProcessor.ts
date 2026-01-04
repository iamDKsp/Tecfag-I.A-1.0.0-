import { PrismaClient } from '@prisma/client';
import { extractText } from './textExtractor';
import { chunkText, estimateTokens } from './chunking';
import { generateEmbeddingsBatch } from './embeddings';
import { storeChunks } from './vectorDB';

const prisma = new PrismaClient();

/**
 * Process a document: extract text, chunk it, generate embeddings, and store
 */
export async function processDocument(documentId: string): Promise<void> {
    try {
        console.log(`[DocumentProcessor] Starting processing for document: ${documentId}`);

        // 1. Get document from database
        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            throw new Error(`Document not found: ${documentId}`);
        }

        // Update progress
        await updateProgress(documentId, 10);

        // 2. Extract text from file
        console.log(`[DocumentProcessor] Extracting text from: ${document.fileName}`);
        const { text, metadata } = await extractText(document.filePath, document.fileType);

        if (!text || text.trim().length === 0) {
            throw new Error('No text extracted from document');
        }

        await updateProgress(documentId, 30);

        // 3. Chunk the text
        console.log(`[DocumentProcessor] Chunking text (${text.length} characters)`);
        const chunks = chunkText(text, {
            chunkSize: 800,
            overlap: 150,
            strategy: 'semantic'
        });

        console.log(`[DocumentProcessor] Created ${chunks.length} chunks`);
        await updateProgress(documentId, 50);

        // 4. Generate embeddings for all chunks
        console.log(`[DocumentProcessor] Generating embeddings for ${chunks.length} chunks`);
        const embeddings = await generateEmbeddingsBatch(chunks);

        await updateProgress(documentId, 80);

        // 5. Store chunks with embeddings
        console.log(`[DocumentProcessor] Storing chunks in vector database`);
        await storeChunks(
            documentId,
            chunks.map((content, index) => ({
                content,
                embedding: embeddings[index],
                chunkIndex: index,
                metadata: {
                    fileName: document.fileName,
                    fileType: document.fileType,
                    catalogId: document.catalogId,
                    ...metadata
                }
            }))
        );

        await updateProgress(documentId, 95);

        // 6. Update document status
        const totalTokens = chunks.reduce((sum, chunk) => sum + estimateTokens(chunk), 0);

        await prisma.document.update({
            where: { id: documentId },
            data: {
                indexed: true,
                indexedAt: new Date(),
                chunkCount: chunks.length,
                totalTokens,
                processingProgress: 100,
                processingError: null
            }
        });

        console.log(`[DocumentProcessor] ✅ Successfully processed document: ${documentId}`);
        console.log(`  - Chunks: ${chunks.length}`);
        console.log(`  - Total tokens: ${totalTokens}`);

    } catch (error: any) {
        console.error(`[DocumentProcessor] ❌ Error processing document ${documentId}:`, error);

        // Update document with error
        await prisma.document.update({
            where: { id: documentId },
            data: {
                indexed: false,
                processingError: error.message,
                processingProgress: 0
            }
        });

        throw error;
    }
}

/**
 * Update processing progress
 */
async function updateProgress(documentId: string, progress: number): Promise<void> {
    await prisma.document.update({
        where: { id: documentId },
        data: { processingProgress: progress }
    });
}

/**
 * Reindex a document (delete old chunks and reprocess)
 */
export async function reindexDocument(documentId: string): Promise<void> {
    console.log(`[DocumentProcessor] Reindexing document: ${documentId}`);

    // Delete existing chunks
    await prisma.documentChunk.deleteMany({
        where: { documentId }
    });

    // Reset document status
    await prisma.document.update({
        where: { id: documentId },
        data: {
            indexed: false,
            processingProgress: 0,
            processingError: null,
            chunkCount: null,
            totalTokens: null
        }
    });

    // Process again
    await processDocument(documentId);
}

/**
 * Delete document and all its chunks
 */
export async function deleteDocument(documentId: string): Promise<void> {
    console.log(`[DocumentProcessor] Deleting document: ${documentId}`);

    // Delete chunks (cascade will handle this, but being explicit)
    await prisma.documentChunk.deleteMany({
        where: { documentId }
    });

    // Delete document
    await prisma.document.delete({
        where: { id: documentId }
    });

    console.log(`[DocumentProcessor] ✅ Document deleted: ${documentId}`);
}
