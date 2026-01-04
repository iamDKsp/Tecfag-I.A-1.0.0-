import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, adminOnly, AuthRequest } from '../middleware/auth.js';

export const machinesRouter = Router();

// Validation schema
const machineSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    capacity: z.string().min(1, 'Capacidade é obrigatória'),
    model: z.string().min(1, 'Modelo é obrigatório'),
    price: z.string().min(1, 'Preço é obrigatório'),
    maintenanceStatus: z.enum(['ok', 'attention', 'critical']).default('ok'),
    lastMaintenance: z.string().min(1, 'Data da última manutenção é obrigatória'),
    specifications: z.array(z.string()).default([]),
});

// GET all machines (with optional filters)
machinesRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { search, category, status } = req.query;

        const where: any = {};

        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search } },
                { model: { contains: search } },
                { category: { contains: search } },
            ];
        }

        if (category && typeof category === 'string' && category !== 'all') {
            where.category = category;
        }

        if (status && typeof status === 'string' && status !== 'all') {
            where.maintenanceStatus = status;
        }

        const machines = await prisma.machine.findMany({
            where,
            include: { specifications: true },
            orderBy: { createdAt: 'desc' },
        });

        // Transform specifications to array of strings
        const result = machines.map((machine) => ({
            ...machine,
            specifications: machine.specifications.map((s) => s.content),
        }));

        res.json(result);
    } catch (error) {
        console.error('Get machines error:', error);
        res.status(500).json({ error: 'Erro ao buscar máquinas' });
    }
});

// GET single machine
machinesRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const machine = await prisma.machine.findUnique({
            where: { id: req.params.id },
            include: { specifications: true },
        });

        if (!machine) {
            res.status(404).json({ error: 'Máquina não encontrada' });
            return;
        }

        res.json({
            ...machine,
            specifications: machine.specifications.map((s) => s.content),
        });
    } catch (error) {
        console.error('Get machine error:', error);
        res.status(500).json({ error: 'Erro ao buscar máquina' });
    }
});

// GET categories
machinesRouter.get('/meta/categories', async (req: Request, res: Response) => {
    try {
        const machines = await prisma.machine.findMany({
            select: { category: true },
            distinct: ['category'],
        });

        const categories = machines.map((m) => m.category).sort();
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// POST create machine (admin only)
machinesRouter.post('/', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const data = machineSchema.parse(req.body);
        const { specifications, ...machineData } = data;

        const machine = await prisma.machine.create({
            data: {
                ...machineData,
                specifications: {
                    create: specifications.map((content) => ({ content })),
                },
            },
            include: { specifications: true },
        });

        res.status(201).json({
            ...machine,
            specifications: machine.specifications.map((s) => s.content),
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Create machine error:', error);
        res.status(500).json({ error: 'Erro ao criar máquina' });
    }
});

// PUT update machine (admin only)
machinesRouter.put('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const data = machineSchema.partial().parse(req.body);
        const { specifications, ...machineData } = data;

        const existingMachine = await prisma.machine.findUnique({
            where: { id: req.params.id },
        });

        if (!existingMachine) {
            res.status(404).json({ error: 'Máquina não encontrada' });
            return;
        }

        // Update machine and specifications in a transaction
        const machine = await prisma.$transaction(async (tx) => {
            // Update machine data
            const updated = await tx.machine.update({
                where: { id: req.params.id },
                data: machineData,
            });

            // If specifications provided, replace them
            if (specifications !== undefined) {
                await tx.machineSpecification.deleteMany({
                    where: { machineId: req.params.id },
                });

                await tx.machineSpecification.createMany({
                    data: specifications.map((content) => ({
                        machineId: req.params.id,
                        content,
                    })),
                });
            }

            return tx.machine.findUnique({
                where: { id: req.params.id },
                include: { specifications: true },
            });
        });

        res.json({
            ...machine,
            specifications: machine?.specifications.map((s) => s.content) || [],
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Update machine error:', error);
        res.status(500).json({ error: 'Erro ao atualizar máquina' });
    }
});

// DELETE machine (admin only)
machinesRouter.delete('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const existingMachine = await prisma.machine.findUnique({
            where: { id: req.params.id },
        });

        if (!existingMachine) {
            res.status(404).json({ error: 'Máquina não encontrada' });
            return;
        }

        await prisma.machine.delete({
            where: { id: req.params.id },
        });

        res.json({ message: 'Máquina excluída com sucesso' });
    } catch (error) {
        console.error('Delete machine error:', error);
        res.status(500).json({ error: 'Erro ao excluir máquina' });
    }
});
