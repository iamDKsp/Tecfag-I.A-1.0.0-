import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth.js';

export const usersRouter = Router();

// All routes require authentication and admin privileges
usersRouter.use(authenticate);
usersRouter.use(adminOnly);

// Validation schemas
const createUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    role: z.enum(['USER', 'ADMIN'], { errorMap: () => ({ message: 'Permissão inválida' }) }),
    mustChangePassword: z.boolean().optional(),
});

const updateUserSchema = z.object({
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    role: z.enum(['USER', 'ADMIN'], { errorMap: () => ({ message: 'Permissão inválida' }) }).optional(),
    mustChangePassword: z.boolean().optional(),
});

// GET /api/users - List all users
usersRouter.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// POST /api/users - Create new user
usersRouter.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, name, role, mustChangePassword } = createUserSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            res.status(400).json({ error: 'Email já cadastrado' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
                mustChangePassword: mustChangePassword || false,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.status(201).json({ user });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// PUT /api/users/:id - Update user
usersRouter.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateUserSchema.parse(req.body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // If email is being updated, check if new email is already in use
        if (data.email && data.email !== existingUser.email) {
            const emailInUse = await prisma.user.findUnique({
                where: { email: data.email },
            });

            if (emailInUse) {
                res.status(400).json({ error: 'Email já cadastrado' });
                return;
            }
        }

        // Hash password if provided
        const updateData: any = { ...data };
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.json({ user });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// DELETE /api/users/:id - Delete user
usersRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent user from deleting themselves
        if (req.user?.id === id) {
            res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
            return;
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // Use a transaction to delete everything in order
        await prisma.$transaction(async (tx) => {
            // 1. Delete all chat messages from this user (assistant and user roles linked to this userId)
            // Note: Assistant messages also have the userId of the user they are replying to
            await tx.chatMessage.deleteMany({
                where: { userId: id },
            });

            // 2. Delete all archived chats
            // This avoids the ChatFolder SetNull conflict
            await tx.archivedChat.deleteMany({
                where: { userId: id },
            });

            // 3. Delete all chat folders
            await tx.chatFolder.deleteMany({
                where: { userId: id },
            });

            // 4. Finally delete the user
            await tx.user.delete({
                where: { id },
            });
        });

        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
        res.status(500).json({ error: 'Erro ao excluir usuário: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
});
