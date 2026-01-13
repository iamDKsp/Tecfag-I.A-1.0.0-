import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get all catalog items
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const items = await prisma.catalogItem.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.json(items);
    } catch (error: any) {
        console.error('Error fetching catalog items:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get a single catalog item by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const item = await prisma.catalogItem.findUnique({
            where: { id },
            include: {
                documents: {
                    orderBy: { uploadedAt: 'desc' }
                }
            }
        });

        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        res.json(item);
    } catch (error: any) {
        console.error('Error fetching catalog item:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create a new catalog item
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { id, code, name, category, description } = req.body;

        if (!code || !name || !category) {
            return res.status(400).json({
                error: 'Campos obrigatórios: code, name, category'
            });
        }

        // Check if item with this code already exists
        const existing = await prisma.catalogItem.findUnique({
            where: { code }
        });

        if (existing) {
            return res.status(409).json({
                error: 'Já existe um item com este código'
            });
        }

        const item = await prisma.catalogItem.create({
            data: {
                id: id || undefined, // Use provided ID or let Prisma generate one
                code,
                name,
                category,
                description: description || null
            }
        });

        console.log(`[Catalog] Created item: ${item.name} (${item.id})`);
        res.status(201).json(item);
    } catch (error: any) {
        console.error('Error creating catalog item:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update a catalog item
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name, category, description } = req.body;

        const item = await prisma.catalogItem.findUnique({
            where: { id }
        });

        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        const updated = await prisma.catalogItem.update({
            where: { id },
            data: {
                code: code || item.code,
                name: name || item.name,
                category: category || item.category,
                description: description !== undefined ? description : item.description
            }
        });

        console.log(`[Catalog] Updated item: ${updated.name} (${updated.id})`);
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating catalog item:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a catalog item
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const item = await prisma.catalogItem.findUnique({
            where: { id }
        });

        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        await prisma.catalogItem.delete({
            where: { id }
        });

        console.log(`[Catalog] Deleted item: ${item.name} (${item.id})`);
        res.json({ success: true, message: 'Item deletado com sucesso' });
    } catch (error: any) {
        console.error('Error deleting catalog item:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
