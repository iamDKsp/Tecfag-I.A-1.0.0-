import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, adminOnly, AuthRequest } from '../middleware/auth.js';

export const mindmapsRouter = Router();

// Validation schemas
const nodeSchema = z.object({
    id: z.string().optional(),
    label: z.string().min(1, 'Label é obrigatório'),
    type: z.enum(['machine', 'process', 'parameter']),
    x: z.number(),
    y: z.number(),
    connections: z.array(z.string()).default([]),
});

const mindmapSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    nodes: z.array(nodeSchema).default([]),
});

// GET all mindmaps
mindmapsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const mindmaps = await prisma.mindMap.findMany({
            include: {
                nodes: {
                    include: {
                        connectionsFrom: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Transform to expected format
        const result = mindmaps.map((mindmap) => ({
            id: mindmap.id,
            name: mindmap.name,
            createdAt: mindmap.createdAt,
            updatedAt: mindmap.updatedAt,
            nodes: mindmap.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                type: node.type,
                x: node.x,
                y: node.y,
                connections: node.connectionsFrom.map((c) => c.toNodeId),
            })),
        }));

        res.json(result);
    } catch (error) {
        console.error('Get mindmaps error:', error);
        res.status(500).json({ error: 'Erro ao buscar mapas mentais' });
    }
});

// GET single mindmap
mindmapsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const mindmap = await prisma.mindMap.findUnique({
            where: { id: req.params.id },
            include: {
                nodes: {
                    include: {
                        connectionsFrom: true,
                    },
                },
            },
        });

        if (!mindmap) {
            res.status(404).json({ error: 'Mapa mental não encontrado' });
            return;
        }

        res.json({
            id: mindmap.id,
            name: mindmap.name,
            createdAt: mindmap.createdAt,
            updatedAt: mindmap.updatedAt,
            nodes: mindmap.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                type: node.type,
                x: node.x,
                y: node.y,
                connections: node.connectionsFrom.map((c) => c.toNodeId),
            })),
        });
    } catch (error) {
        console.error('Get mindmap error:', error);
        res.status(500).json({ error: 'Erro ao buscar mapa mental' });
    }
});

// POST create mindmap (admin only)
mindmapsRouter.post('/', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const { name, nodes } = mindmapSchema.parse(req.body);

        const mindmap = await prisma.$transaction(async (tx) => {
            // Create mindmap
            const newMindmap = await tx.mindMap.create({
                data: { name },
            });

            // Create nodes with temporary ID mapping
            const idMapping: Record<string, string> = {};

            for (const node of nodes) {
                const tempId = node.id || crypto.randomUUID();
                const createdNode = await tx.mindMapNode.create({
                    data: {
                        mindMapId: newMindmap.id,
                        label: node.label,
                        type: node.type,
                        x: node.x,
                        y: node.y,
                    },
                });
                idMapping[tempId] = createdNode.id;
            }

            // Create connections
            for (const node of nodes) {
                const tempId = node.id || '';
                const fromNodeId = idMapping[tempId];
                if (fromNodeId && node.connections) {
                    for (const targetTempId of node.connections) {
                        const toNodeId = idMapping[targetTempId];
                        if (toNodeId) {
                            await tx.mindMapConnection.create({
                                data: { fromNodeId, toNodeId },
                            });
                        }
                    }
                }
            }

            return tx.mindMap.findUnique({
                where: { id: newMindmap.id },
                include: {
                    nodes: {
                        include: { connectionsFrom: true },
                    },
                },
            });
        });

        res.status(201).json({
            id: mindmap?.id,
            name: mindmap?.name,
            nodes: mindmap?.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                type: node.type,
                x: node.x,
                y: node.y,
                connections: node.connectionsFrom.map((c) => c.toNodeId),
            })),
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Create mindmap error:', error);
        res.status(500).json({ error: 'Erro ao criar mapa mental' });
    }
});

// PUT update mindmap (admin only)
mindmapsRouter.put('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const { name, nodes } = mindmapSchema.partial().parse(req.body);

        const existingMindmap = await prisma.mindMap.findUnique({
            where: { id: req.params.id },
        });

        if (!existingMindmap) {
            res.status(404).json({ error: 'Mapa mental não encontrado' });
            return;
        }

        const mindmap = await prisma.$transaction(async (tx) => {
            // Update mindmap name if provided
            if (name) {
                await tx.mindMap.update({
                    where: { id: req.params.id },
                    data: { name },
                });
            }

            // If nodes provided, replace all nodes and connections
            if (nodes !== undefined) {
                // Delete existing nodes (cascade deletes connections)
                await tx.mindMapNode.deleteMany({
                    where: { mindMapId: req.params.id },
                });

                // Create new nodes
                const idMapping: Record<string, string> = {};

                for (const node of nodes) {
                    const tempId = node.id || crypto.randomUUID();
                    const createdNode = await tx.mindMapNode.create({
                        data: {
                            mindMapId: req.params.id,
                            label: node.label,
                            type: node.type,
                            x: node.x,
                            y: node.y,
                        },
                    });
                    idMapping[tempId] = createdNode.id;
                }

                // Create connections
                for (const node of nodes) {
                    const tempId = node.id || '';
                    const fromNodeId = idMapping[tempId];
                    if (fromNodeId && node.connections) {
                        for (const targetTempId of node.connections) {
                            const toNodeId = idMapping[targetTempId];
                            if (toNodeId) {
                                await tx.mindMapConnection.create({
                                    data: { fromNodeId, toNodeId },
                                });
                            }
                        }
                    }
                }
            }

            return tx.mindMap.findUnique({
                where: { id: req.params.id },
                include: {
                    nodes: {
                        include: { connectionsFrom: true },
                    },
                },
            });
        });

        res.json({
            id: mindmap?.id,
            name: mindmap?.name,
            nodes: mindmap?.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                type: node.type,
                x: node.x,
                y: node.y,
                connections: node.connectionsFrom.map((c) => c.toNodeId),
            })),
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Update mindmap error:', error);
        res.status(500).json({ error: 'Erro ao atualizar mapa mental' });
    }
});

// DELETE mindmap (admin only)
mindmapsRouter.delete('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const existingMindmap = await prisma.mindMap.findUnique({
            where: { id: req.params.id },
        });

        if (!existingMindmap) {
            res.status(404).json({ error: 'Mapa mental não encontrado' });
            return;
        }

        await prisma.mindMap.delete({
            where: { id: req.params.id },
        });

        res.json({ message: 'Mapa mental excluído com sucesso' });
    } catch (error) {
        console.error('Delete mindmap error:', error);
        res.status(500).json({ error: 'Erro ao excluir mapa mental' });
    }
});
