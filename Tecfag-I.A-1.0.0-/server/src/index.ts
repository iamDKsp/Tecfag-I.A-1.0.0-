import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { machinesRouter } from './routes/machines.js';
import { mindmapsRouter } from './routes/mindmaps.js';
import { chatRouter } from './routes/chat.js';
import { monitoringRouter } from './routes/monitoring.js';
import documentsRouter from './routes/documents.js';
import catalogRouter from './routes/catalog.js';
import { createBackup, startScheduledBackup } from './services/backupService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
import morgan from 'morgan';
app.use(morgan('dev'));
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:8080', 'http://localhost:8081'],
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/mindmaps', mindmapsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/catalog', catalogRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Tec I.A Backend is running!' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`[VERSION CHECK] Server started at ${new Date().toISOString()} - Includes Admin Chat Fix & User Delete Fix`);
    console.log(`📚 API docs available at http://localhost:${PORT}/api/health`);

    // 🔒 BACKUP AUTOMÁTICO
    // Cria backup no startup do servidor
    createBackup('startup');

    // Agenda backups a cada 6 horas
    startScheduledBackup(6);
});

export default app;
