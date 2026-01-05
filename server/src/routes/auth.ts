import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
});

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

// Change Password
const changePasswordSchema = z.object({
    newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

// Register
authRouter.post('/register', async (req, res: Response) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

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
                role: 'USER',
            },
            select: { id: true, email: true, name: true, role: true, mustChangePassword: true },
        });

        // Create default "Fixados" folder
        await prisma.chatFolder.create({
            data: {
                userId: user.id,
                name: 'Fixados',
                isDefault: true,
                order: 0,
            },
        });

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({ user, token });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});

// Login
authRouter.post('/login', async (req, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            },
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// Change Password (for forced updates)
authRouter.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { newPassword } = changePasswordSchema.parse(req.body);
        const userId = req.user!.id;

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
            },
        });

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// Update Profile Schema
const updateProfileSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    technicalLevel: z.string().optional(),
    communicationStyle: z.string().optional(),
});

// Update Profile
authRouter.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const data = updateProfileSchema.parse(req.body);

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                jobTitle: true,
                department: true,
                technicalLevel: true,
                communicationStyle: true,
            }
        });

        res.json({ user });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

// Get current user
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
});

// Update user's last active timestamp (heartbeat)
authRouter.put('/heartbeat', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        await prisma.user.update({
            where: { id: userId },
            data: { lastActive: new Date() },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

