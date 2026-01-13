export interface ChunkOptions {
    chunkSize?: number;
    overlap?: number;
    strategy?: 'semantic' | 'fixed';
}

/**
 * Split text into chunks with overlap for better context preservation
 */
export function chunkText(
    text: string,
    options: ChunkOptions = {}
): string[] {
    const {
        chunkSize = 1200,
        overlap = 250,
        strategy = 'semantic'
    } = options;

    if (strategy === 'semantic') {
        return semanticChunking(text, chunkSize, overlap);
    } else {
        return fixedChunking(text, chunkSize, overlap);
    }
}

/**
 * Semantic chunking - respects paragraph boundaries
 */
function semanticChunking(
    text: string,
    chunkSize: number,
    overlap: number
): string[] {
    // Split by paragraphs (double newline or single newline)
    const paragraphs = text.split(/\n\n+|\n/).filter(p => p.trim().length > 0);

    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        const testChunk = currentChunk
            ? currentChunk + '\n\n' + paragraph
            : paragraph;

        if (testChunk.length <= chunkSize) {
            currentChunk = testChunk;
        } else {
            // Current chunk is full, save it
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            // Start new chunk with overlap from previous
            if (overlap > 0 && currentChunk) {
                const overlapText = currentChunk.slice(-overlap);
                currentChunk = overlapText + '\n\n' + paragraph;
            } else {
                currentChunk = paragraph;
            }

            // If single paragraph is too long, split it
            if (currentChunk.length > chunkSize) {
                const splitChunks = fixedChunking(currentChunk, chunkSize, overlap);
                chunks.push(...splitChunks.slice(0, -1));
                currentChunk = splitChunks[splitChunks.length - 1];
            }
        }
    }

    // Add the last chunk
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks.filter(c => c.trim().length > 0);
}

/**
 * Fixed chunking - simple sliding window
 */
function fixedChunking(
    text: string,
    chunkSize: number,
    overlap: number
): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        chunks.push(text.slice(start, end));
        start = end - overlap;

        // Prevent infinite loop
        if (overlap >= chunkSize) {
            break;
        }
    }

    return chunks.filter(c => c.trim().length > 0);
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}
