import { Router, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth.js';

export const monitoringRouter = Router();

// All routes require authentication and admin privileges
monitoringRouter.use(authenticate);
monitoringRouter.use(adminOnly);

// GET /api/monitoring/users - Get all users with online/offline status
monitoringRouter.get('/users', async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                lastActive: true,
                createdAt: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Calculate online status (user is online if last active within 60 seconds)
        const now = new Date();
        const ONLINE_THRESHOLD_MS = 60 * 1000; // 60 seconds

        const usersWithStatus = users.map(user => {
            const lastActiveTime = new Date(user.lastActive).getTime();
            const timeDiff = now.getTime() - lastActiveTime;
            const isOnline = timeDiff < ONLINE_THRESHOLD_MS;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isOnline,
                lastActive: user.lastActive,
                createdAt: user.createdAt,
            };
        });

        res.json({ users: usersWithStatus });
    } catch (error) {
        console.error('Error fetching users status:', error);
        res.status(500).json({ error: 'Erro ao buscar status dos usuários' });
    }
});

// GET /api/monitoring/archived-chats - Get all archived chats organized by user
monitoringRouter.get('/archived-chats', async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                archivedChats: {
                    select: {
                        id: true,
                        title: true,
                        messagesCount: true,
                        createdAt: true,
                        archivedAt: true,
                        folderId: true,
                        isPinned: true,
                    },
                    orderBy: {
                        archivedAt: 'desc',
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        const groups = users.map(user => ({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            archives: user.archivedChats,
        }));

        res.json({ groups });
    } catch (error) {
        console.error('Error fetching archived chats by user:', error);
        res.status(500).json({ error: 'Erro ao buscar chats arquivados por usuário' });
    }
});

// GET /api/monitoring/statistics - Get question statistics
monitoringRouter.get('/statistics', async (req: AuthRequest, res: Response) => {
    try {
        // Get all user messages
        const userMessages = await prisma.chatMessage.findMany({
            where: {
                role: 'user',
            },
            select: {
                content: true,
                userId: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Total questions count
        const totalQuestions = userMessages.length;

        // Count questions by content (find most asked)
        const questionCounts = new Map<string, number>();
        userMessages.forEach(msg => {
            const count = questionCounts.get(msg.content) || 0;
            questionCounts.set(msg.content, count + 1);
        });

        // Get top 10 most asked questions
        const mostAskedQuestions = Array.from(questionCounts.entries())
            .map(([question, count]) => ({ question, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Count questions by user
        const userQuestionCounts = new Map<string, { userId: string; userName: string; count: number }>();
        userMessages.forEach(msg => {
            const existing = userQuestionCounts.get(msg.userId);
            if (existing) {
                existing.count++;
            } else {
                userQuestionCounts.set(msg.userId, {
                    userId: msg.userId,
                    userName: msg.user.name,
                    count: 1,
                });
            }
        });

        const questionsByUser = Array.from(userQuestionCounts.values())
            .sort((a, b) => b.count - a.count);

        res.json({
            totalQuestions,
            mostAskedQuestions,
            questionsByUser,
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});
