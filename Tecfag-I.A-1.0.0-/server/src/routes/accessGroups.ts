import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth.js';

export const accessGroupsRouter = Router();

// All routes require authentication and admin privileges
accessGroupsRouter.use(authenticate);
accessGroupsRouter.use(adminOnly);

// Validation schemas
const createGroupSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    description: z.string().optional(),
    canViewChat: z.boolean().optional().default(true),
    canViewMindMap: z.boolean().optional().default(true),
    canViewCatalog: z.boolean().optional().default(true),
    canViewUsers: z.boolean().optional().default(false),
    canViewMonitoring: z.boolean().optional().default(false),
    canViewDocuments: z.boolean().optional().default(false),
    canViewSettings: z.boolean().optional().default(false),
});

const updateGroupSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    description: z.string().optional().nullable(),
    canViewChat: z.boolean().optional(),
    canViewMindMap: z.boolean().optional(),
    canViewCatalog: z.boolean().optional(),
    canViewUsers: z.boolean().optional(),
    canViewMonitoring: z.boolean().optional(),
    canViewDocuments: z.boolean().optional(),
    canViewSettings: z.boolean().optional(),
});

const updateUsersSchema = z.object({
    userIds: z.array(z.string()),
});

// GET /api/access-groups - List all groups
accessGroupsRouter.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const groups = await prisma.accessGroup.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: {
                name: 'asc',
            },
        });

        res.json({
            groups: groups.map(g => ({
                ...g,
                userCount: g._count.users,
                _count: undefined
            }))
        });
    } catch (error) {
        console.error('Error fetching access groups:', error);
        res.status(500).json({ error: 'Erro ao buscar grupos de acesso' });
    }
});

// GET /api/access-groups/:id - Get group by ID with users
accessGroupsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const group = await prisma.accessGroup.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });

        if (!group) {
            res.status(404).json({ error: 'Grupo de acesso não encontrado' });
            return;
        }

        res.json({ group });
    } catch (error) {
        console.error('Error fetching access group:', error);
        res.status(500).json({ error: 'Erro ao buscar grupo de acesso' });
    }
});

// POST /api/access-groups - Create new group
accessGroupsRouter.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const data = createGroupSchema.parse(req.body);

        // Check if name already exists
        const existingGroup = await prisma.accessGroup.findUnique({
            where: { name: data.name },
        });

        if (existingGroup) {
            res.status(400).json({ error: 'Já existe um grupo com este nome' });
            return;
        }

        const group = await prisma.accessGroup.create({
            data,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        res.status(201).json({
            group: {
                ...group,
                userCount: group._count.users,
                _count: undefined
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Error creating access group:', error);
        res.status(500).json({ error: 'Erro ao criar grupo de acesso' });
    }
});

// PUT /api/access-groups/:id - Update group
accessGroupsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateGroupSchema.parse(req.body);

        // Check if group exists
        const existingGroup = await prisma.accessGroup.findUnique({
            where: { id },
        });

        if (!existingGroup) {
            res.status(404).json({ error: 'Grupo de acesso não encontrado' });
            return;
        }

        // If name is being updated, check if new name is already in use
        if (data.name && data.name !== existingGroup.name) {
            const nameInUse = await prisma.accessGroup.findUnique({
                where: { name: data.name },
            });

            if (nameInUse) {
                res.status(400).json({ error: 'Já existe um grupo com este nome' });
                return;
            }
        }

        const group = await prisma.accessGroup.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        res.json({
            group: {
                ...group,
                userCount: group._count.users,
                _count: undefined
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Error updating access group:', error);
        res.status(500).json({ error: 'Erro ao atualizar grupo de acesso' });
    }
});

// DELETE /api/access-groups/:id - Delete group
accessGroupsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check if group exists
        const existingGroup = await prisma.accessGroup.findUnique({
            where: { id },
        });

        if (!existingGroup) {
            res.status(404).json({ error: 'Grupo de acesso não encontrado' });
            return;
        }

        // Delete the group (users will have their accessGroupId set to null due to onDelete: SetNull)
        await prisma.accessGroup.delete({
            where: { id },
        });

        res.json({ message: 'Grupo de acesso excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting access group:', error);
        res.status(500).json({ error: 'Erro ao excluir grupo de acesso' });
    }
});

// PUT /api/access-groups/:id/users - Update users in group
accessGroupsRouter.put('/:id/users', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { userIds } = updateUsersSchema.parse(req.body);

        // Check if group exists
        const existingGroup = await prisma.accessGroup.findUnique({
            where: { id },
        });

        if (!existingGroup) {
            res.status(404).json({ error: 'Grupo de acesso não encontrado' });
            return;
        }

        // First, remove all users from this group
        await prisma.user.updateMany({
            where: { accessGroupId: id },
            data: { accessGroupId: null },
        });

        // Then, add the specified users to this group
        if (userIds.length > 0) {
            await prisma.user.updateMany({
                where: { id: { in: userIds } },
                data: { accessGroupId: id },
            });
        }

        // Return updated group with users
        const group = await prisma.accessGroup.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });

        res.json({ group });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Error updating users in access group:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuários do grupo' });
    }
});

// GET /api/access-groups/available-users - Get all users for assignment
accessGroupsRouter.get('/meta/available-users', async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                accessGroupId: true,
                accessGroup: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                name: 'asc',
            },
        });

        res.json({ users });
    } catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários disponíveis' });
    }
});
