import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { processDocument, deleteDocument, reindexDocument } from '../services/ai/documentProcessor';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
        console.log(`[Upload] Saving file to: ${uploadDir}`);

        // Ensure upload directory exists
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            console.error('[Upload] Error creating upload directory:', error);
            cb(error as Error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `document-${uniqueSuffix}${ext}`;
        console.log(`[Upload] Generated filename: ${filename}`);
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        console.log(`[Upload] Checking file: ${file.originalname} (${file.mimetype})`);
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.error(`[Upload] Invalid file type: ${file.mimetype}`);
            cb(new Error('Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.'));
        }
    }
});

/**
 * Upload a new document
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    console.log('[Upload] Handler reached');
    try {
        const { catalogId } = req.body;
        const file = req.file;

        console.log(`[Upload] Processing request. CatalogId: ${catalogId}, File: ${file?.filename}`);

        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        if (!catalogId) {
            // Clean up uploaded file
            await fs.unlink(file.path);
            return res.status(400).json({ error: 'catalogId é obrigatório' });
        }

        // Verify catalog item exists
        const catalogItem = await prisma.catalogItem.findUnique({
            where: { id: catalogId }
        });

        if (!catalogItem) {
            await fs.unlink(file.path);
            return res.status(404).json({ error: 'Item de catálogo não encontrado' });
        }

        // Create document record
        const document = await prisma.document.create({
            data: {
                catalogId,
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                filePath: file.path,
                uploadedBy: (req as any).user?.id || null,
                indexed: false,
                processingProgress: 0
            }
        });

        // Process document asynchronously (don't await to avoid blocking)
        processDocument(document.id).catch(error => {
            console.error(`Failed to process document ${document.id}:`, error);
        });

        res.json({
            success: true,
            document,
            message: 'Documento enviado! O processamento começará em breve.'
        });

    } catch (error: any) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * List documents for a catalog item
 */
router.get('/catalog/:catalogId', async (req: Request, res: Response) => {
    try {
        const { catalogId } = req.params;

        const documents = await prisma.document.findMany({
            where: { catalogId },
            orderBy: { uploadedAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                fileType: true,
                fileSize: true,
                indexed: true,
                processingProgress: true,
                processingError: true,
                chunkCount: true,
                totalTokens: true,
                uploadedAt: true,
                indexedAt: true
            }
        });

        res.json(documents);

    } catch (error: any) {
        console.error('Error listing documents:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all documents (optional: filter by indexed status)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { indexed } = req.query;

        const where = indexed !== undefined
            ? { indexed: indexed === 'true' }
            : {};

        const documents = await prisma.document.findMany({
            where,
            include: {
                catalogItem: {
                    select: {
                        code: true,
                        name: true
                    }
                }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        res.json(documents);

    } catch (error: any) {
        console.error('Error getting documents:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a document
 */
router.delete('/:documentId', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        // Get document to find file path
        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        // Delete file from disk
        try {
            await fs.unlink(document.filePath);
        } catch (error) {
            console.error('Error deleting file:', error);
            // Continue anyway
        }

        // Delete from database (will cascade to chunks)
        await deleteDocument(documentId);

        res.json({ success: true, message: 'Documento deletado com sucesso' });

    } catch (error: any) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Reindex a document
 */
router.post('/:documentId/reindex', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        // Reindex asynchronously
        reindexDocument(documentId).catch(error => {
            console.error(`Failed to reindex document ${documentId}:`, error);
        });

        res.json({
            success: true,
            message: 'Reindexação iniciada'
        });

    } catch (error: any) {
        console.error('Error reindexing document:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get document processing status
 */
router.get('/:documentId/status', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                indexed: true,
                processingProgress: true,
                processingError: true,
                chunkCount: true,
                totalTokens: true
            }
        });

        if (!document) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.json(document);

    } catch (error: any) {
        console.error('Error getting document status:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
