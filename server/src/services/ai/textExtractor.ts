import fs from 'fs/promises';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';

export interface ExtractionResult {
    text: string;
    metadata?: {
        pages?: number;
        title?: string;
    };
}

/**
 * Extract text from various file formats
 */
export async function extractText(
    filePath: string,
    fileType: string
): Promise<ExtractionResult> {
    const extension = path.extname(filePath).toLowerCase();

    // Determine extraction method based on file type or extension
    if (fileType.includes('pdf') || extension === '.pdf') {
        return extractFromPDF(filePath);
    } else if (
        fileType.includes('wordprocessingml') ||
        extension === '.docx'
    ) {
        return extractFromDOCX(filePath);
    } else if (
        fileType.includes('text') ||
        extension === '.txt'
    ) {
        return extractFromTXT(filePath);
    } else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }
}

/**
 * Extract text from PDF
 */
async function extractFromPDF(filePath: string): Promise<ExtractionResult> {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);

        return {
            text: cleanText(data.text),
            metadata: {
                pages: data.numpages,
                title: data.info?.Title
            }
        };
    } catch (error) {
        console.error('Error extracting PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

/**
 * Extract text from DOCX
 */
async function extractFromDOCX(filePath: string): Promise<ExtractionResult> {
    try {
        const result = await mammoth.extractRawText({ path: filePath });

        return {
            text: cleanText(result.value),
            metadata: {}
        };
    } catch (error) {
        console.error('Error extracting DOCX:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

/**
 * Extract text from TXT
 */
async function extractFromTXT(filePath: string): Promise<ExtractionResult> {
    try {
        const text = await fs.readFile(filePath, 'utf-8');

        return {
            text: cleanText(text),
            metadata: {}
        };
    } catch (error) {
        console.error('Error reading TXT:', error);
        throw new Error('Failed to read text file');
    }
}

/**
 * Clean extracted text
 */
function cleanText(text: string): string {
    return text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize newlines
        .replace(/\r\n/g, '\n')
        // Remove multiple consecutive newlines (keep max 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
