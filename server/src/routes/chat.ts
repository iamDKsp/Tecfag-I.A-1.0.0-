import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';

export const chatRouter = Router();

// Validation schema
const messageSchema = z.object({
    content: z.string().min(1, 'Mensagem não pode estar vazia'),
});

// POST send message and get AI response
chatRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { content } = messageSchema.parse(req.body);
        const userId = req.user!.id;

        // Save user message
        const userMessage = await prisma.chatMessage.create({
            data: {
                userId,
                role: 'user',
                content,
            },
        });

        // Generate AI response
        const aiResponse = await aiService.generateResponse(content, userId);

        // Save AI response
        const assistantMessage = await prisma.chatMessage.create({
            data: {
                userId,
                role: 'assistant',
                content: aiResponse,
            },
        });

        res.json({
            userMessage: {
                id: userMessage.id,
                role: userMessage.role,
                content: userMessage.content,
                createdAt: userMessage.createdAt,
            },
            assistantMessage: {
                id: assistantMessage.id,
                role: assistantMessage.role,
                content: assistantMessage.content,
                createdAt: assistantMessage.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Erro ao processar mensagem' });
    }
});

// GET chat history
chatRouter.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const messages = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            skip: offset,
            take: limit,
            select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
            },
        });

        const total = await prisma.chatMessage.count({
            where: { userId },
        });

        res.json({
            messages,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

// DELETE clear chat history
chatRouter.delete('/history', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        await prisma.chatMessage.deleteMany({
            where: { userId },
        });

        res.json({ message: 'Histórico limpo com sucesso' });
    } catch (error) {
        console.error('Clear chat history error:', error);
        res.status(500).json({ error: 'Erro ao limpar histórico' });
    }
});

// POST archive current chat
chatRouter.post('/archive', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { title } = req.body;

        // Get all current messages
        const messages = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
            },
        });

        if (messages.length === 0) {
            res.status(400).json({ error: 'Não há mensagens para arquivar' });
            return;
        }

        // Generate title from first user message if not provided
        const chatTitle = title || messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'Chat sem título';

        // Create archived chat
        const archivedChat = await prisma.archivedChat.create({
            data: {
                userId,
                title: chatTitle,
                messagesCount: messages.length,
                messages: JSON.stringify(messages),
                createdAt: messages[0].createdAt,
            },
        });

        // Clear current chat history
        await prisma.chatMessage.deleteMany({
            where: { userId },
        });

        res.json({
            id: archivedChat.id,
            title: archivedChat.title,
            messagesCount: archivedChat.messagesCount,
            createdAt: archivedChat.createdAt,
            archivedAt: archivedChat.archivedAt,
        });
    } catch (error) {
        console.error('Archive chat error:', error);
        res.status(500).json({ error: 'Erro ao arquivar chat' });
    }
});

// GET all archived chats
chatRouter.get('/archives', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const archives = await prisma.archivedChat.findMany({
            where: { userId },
            orderBy: { archivedAt: 'desc' },
            select: {
                id: true,
                title: true,
                messagesCount: true,
                createdAt: true,
                archivedAt: true,
                folderId: true,
                isPinned: true,
            },
        });

        res.json({ archives });
    } catch (error) {
        console.error('Get archives error:', error);
        res.status(500).json({ error: 'Erro ao buscar chats arquivados' });
    }
});

// GET specific archived chat with messages
chatRouter.get('/archives/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const whereClause: any = { id };

        // If not admin, restrict to own chats
        if (req.user!.role !== 'ADMIN') {
            whereClause.userId = userId;
        }

        // Debug logging
        console.log(`[GET Archive] Requesting chat ${id} by user ${userId} (${req.user?.role})`);
        console.log(`[GET Archive] Where clause:`, JSON.stringify(whereClause));

        const archive = await prisma.archivedChat.findFirst({
            where: whereClause,
        });

        if (!archive) {
            console.log(`[GET Archive] Chat not found!`);
            res.status(404).json({ error: 'Chat arquivado não encontrado' });
            return;
        }

        res.json({
            id: archive.id,
            title: archive.title,
            messagesCount: archive.messagesCount,
            messages: JSON.parse(archive.messages),
            createdAt: archive.createdAt,
            archivedAt: archive.archivedAt,
        });
    } catch (error) {
        console.error('Get archive error:', error);
        res.status(500).json({ error: 'Erro ao buscar chat arquivado' });
    }
});

// DELETE archived chat
chatRouter.delete('/archives/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const archive = await prisma.archivedChat.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!archive) {
            res.status(404).json({ error: 'Chat arquivado não encontrado' });
            return;
        }

        await prisma.archivedChat.delete({
            where: { id },
        });

        res.json({ message: 'Chat arquivado deletado com sucesso' });
    } catch (error) {
        console.error('Delete archive error:', error);
        res.status(500).json({ error: 'Erro ao deletar chat arquivado' });
    }
});

// POST restore archived chat to active conversation
chatRouter.post('/archives/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const archive = await prisma.archivedChat.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!archive) {
            res.status(404).json({ error: 'Chat arquivado não encontrado' });
            return;
        }

        const messages = JSON.parse(archive.messages);

        // Clear current chat
        await prisma.chatMessage.deleteMany({
            where: { userId },
        });

        // Restore messages
        await prisma.chatMessage.createMany({
            data: messages.map((msg: any) => ({
                userId,
                role: msg.role,
                content: msg.content,
            })),
        });

        // Delete the archive
        await prisma.archivedChat.delete({
            where: { id },
        });

        res.json({ message: 'Chat restaurado com sucesso' });
    } catch (error) {
        console.error('Restore archive error:', error);
        res.status(500).json({ error: 'Erro ao restaurar chat' });
    }
});

// ========== FOLDER MANAGEMENT ==========

// POST create folder
chatRouter.post('/folders', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;
        const userId = req.user!.id;

        if (!name || name.trim().length === 0) {
            res.status(400).json({ error: 'Nome da pasta não pode estar vazio' });
            return;
        }

        // Get current max order
        const maxOrderFolder = await prisma.chatFolder.findFirst({
            where: { userId },
            orderBy: { order: 'desc' },
        });

        const folder = await prisma.chatFolder.create({
            data: {
                userId,
                name: name.trim(),
                order: (maxOrderFolder?.order || 0) + 1,
            },
        });

        res.json({
            id: folder.id,
            name: folder.name,
            isDefault: folder.isDefault,
            order: folder.order,
            createdAt: folder.createdAt,
        });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: 'Erro ao criar pasta' });
    }
});

// GET all folders with chat counts
chatRouter.get('/folders', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const folders = await prisma.chatFolder.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
            include: {
                _count: {
                    select: { archivedChats: true },
                },
            },
        });

        res.json({
            folders: folders.map(f => ({
                id: f.id,
                name: f.name,
                isDefault: f.isDefault,
                order: f.order,
                chatCount: f._count.archivedChats,
                createdAt: f.createdAt,
            })),
        });
    } catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ error: 'Erro ao buscar pastas' });
    }
});

// PUT rename folder
chatRouter.put('/folders/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user!.id;

        if (!name || name.trim().length === 0) {
            res.status(400).json({ error: 'Nome da pasta não pode estar vazio' });
            return;
        }

        const folder = await prisma.chatFolder.findFirst({
            where: { id, userId },
        });

        if (!folder) {
            res.status(404).json({ error: 'Pasta não encontrada' });
            return;
        }

        if (folder.isDefault) {
            res.status(400).json({ error: 'Não é possível renomear a pasta padrão' });
            return;
        }

        const updated = await prisma.chatFolder.update({
            where: { id },
            data: { name: name.trim() },
        });

        res.json({
            id: updated.id,
            name: updated.name,
            isDefault: updated.isDefault,
            order: updated.order,
        });
    } catch (error) {
        console.error('Rename folder error:', error);
        res.status(500).json({ error: 'Erro ao renomear pasta' });
    }
});

// DELETE folder
chatRouter.delete('/folders/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const folder = await prisma.chatFolder.findFirst({
            where: { id, userId },
        });

        if (!folder) {
            res.status(404).json({ error: 'Pasta não encontrada' });
            return;
        }

        if (folder.isDefault) {
            res.status(400).json({ error: 'Não é possível deletar a pasta padrão' });
            return;
        }

        // Move all chats in this folder to root (null folder)
        await prisma.archivedChat.updateMany({
            where: { folderId: id },
            data: { folderId: null },
        });

        await prisma.chatFolder.delete({
            where: { id },
        });

        res.json({ message: 'Pasta deletada com sucesso' });
    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ error: 'Erro ao deletar pasta' });
    }
});

// ========== CHAT OPERATIONS ==========

// PUT rename chat
chatRouter.put('/archives/:id/rename', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const userId = req.user!.id;

        if (!title || title.trim().length === 0) {
            res.status(400).json({ error: 'Título não pode estar vazio' });
            return;
        }

        const chat = await prisma.archivedChat.findFirst({
            where: { id, userId },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat não encontrado' });
            return;
        }

        const updated = await prisma.archivedChat.update({
            where: { id },
            data: { title: title.trim() },
        });

        res.json({
            id: updated.id,
            title: updated.title,
            messagesCount: updated.messagesCount,
            folderId: updated.folderId,
            isPinned: updated.isPinned,
        });
    } catch (error) {
        console.error('Rename chat error:', error);
        res.status(500).json({ error: 'Erro ao renomear chat' });
    }
});

// PUT move chat to folder
chatRouter.put('/archives/:id/move', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { folderId } = req.body;
        const userId = req.user!.id;

        const chat = await prisma.archivedChat.findFirst({
            where: { id, userId },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat não encontrado' });
            return;
        }

        // Verify folder exists and belongs to user
        if (folderId) {
            const folder = await prisma.chatFolder.findFirst({
                where: { id: folderId, userId },
            });

            if (!folder) {
                res.status(404).json({ error: 'Pasta não encontrada' });
                return;
            }
        }

        const updated = await prisma.archivedChat.update({
            where: { id },
            data: { folderId: folderId || null },
        });

        res.json({
            id: updated.id,
            folderId: updated.folderId,
            isPinned: updated.isPinned,
        });
    } catch (error) {
        console.error('Move chat error:', error);
        res.status(500).json({ error: 'Erro ao mover chat' });
    }
});

// PUT toggle pin
chatRouter.put('/archives/:id/pin', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { isPinned } = req.body;
        const userId = req.user!.id;

        const chat = await prisma.archivedChat.findFirst({
            where: { id, userId },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat não encontrado' });
            return;
        }

        // If pinning, move to default "Fixados" folder
        let targetFolderId = chat.folderId;
        if (isPinned) {
            const defaultFolder = await prisma.chatFolder.findFirst({
                where: { userId, isDefault: true },
            });

            if (defaultFolder) {
                targetFolderId = defaultFolder.id;
            }
        }

        const updated = await prisma.archivedChat.update({
            where: { id },
            data: {
                isPinned,
                folderId: targetFolderId,
            },
        });

        res.json({
            id: updated.id,
            isPinned: updated.isPinned,
            folderId: updated.folderId,
        });
    } catch (error) {
        console.error('Pin chat error:', error);
        res.status(500).json({ error: 'Erro ao fixar chat' });
    }
});

// ========== RAG AI ENDPOINTS ==========

import { answerQuestion, generateSuggestedQuestions } from '../services/ai/chatService';

// POST send message with RAG (document-based responses)
chatRouter.post('/rag', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { content, catalogId, mode, isTableMode } = req.body;
        const userId = req.user!.id;

        if (!content || content.trim().length === 0) {
            res.status(400).json({ error: 'Mensagem não pode estar vazia' });
            return;
        }

        // Get recent chat history for context
        const recentMessages = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: {
                role: true,
                content: true,
            },
        });

        const chatHistory = recentMessages.reverse().map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }));

        // Generate RAG response
        const { response, sources } = await answerQuestion(
            content,
            catalogId,
            chatHistory,
            mode,
            isTableMode
        );

        // Save user message
        const userMessage = await prisma.chatMessage.create({
            data: {
                userId,
                role: 'user',
                content,
            },
        });

        // Save AI response
        const assistantMessage = await prisma.chatMessage.create({
            data: {
                userId,
                role: 'assistant',
                content: response,
            },
        });

        res.json({
            userMessage: {
                id: userMessage.id,
                role: userMessage.role,
                content: userMessage.content,
                createdAt: userMessage.createdAt,
            },
            assistantMessage: {
                id: assistantMessage.id,
                role: assistantMessage.role,
                content: assistantMessage.content,
                createdAt: assistantMessage.createdAt,
            },
            sources,
        });
    } catch (error: any) {
        console.error('RAG chat error:', error);
        res.status(500).json({ error: error.message || 'Erro ao processar mensagem' });
    }
});

// GET suggested questions based on available documents
chatRouter.get('/suggestions', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { catalogId } = req.query;

        const suggestions = await generateSuggestedQuestions(
            catalogId as string | undefined,
            5
        );

        res.json({ suggestions });
    } catch (error: any) {
        console.error('Get suggestions error:', error);
        res.status(500).json({ error: error.message || 'Erro ao gerar sugestões' });
    }
});
