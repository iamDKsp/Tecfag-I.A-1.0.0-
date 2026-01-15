import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 10; // Manter apenas os 10 backups mais recentes

/**
 * Cria um backup do banco de dados SQLite
 * @param reason - Motivo do backup (ex: 'startup', 'scheduled', 'manual')
 * @returns Path do arquivo de backup criado ou null se falhou
 */
export function createBackup(reason: string = 'manual'): string | null {
    try {
        // Verificar se o banco existe
        if (!fs.existsSync(DB_PATH)) {
            console.log('[Backup] ⚠️ Banco de dados não encontrado, pulando backup');
            return null;
        }

        // Criar diretório de backups se não existir
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            console.log('[Backup] 📁 Diretório de backups criado');
        }

        // Gerar nome do arquivo com timestamp
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .replace('T', '_')
            .replace('Z', '');

        const backupFileName = `dev_${timestamp}_${reason}.db`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        // Copiar arquivo
        fs.copyFileSync(DB_PATH, backupPath);

        const stats = fs.statSync(backupPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`[Backup] ✅ Backup criado: ${backupFileName} (${sizeMB} MB)`);

        // Limpar backups antigos
        cleanOldBackups();

        return backupPath;
    } catch (error) {
        console.error('[Backup] ❌ Erro ao criar backup:', error);
        return null;
    }
}

/**
 * Remove backups antigos, mantendo apenas os N mais recentes
 */
function cleanOldBackups(): void {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return;

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Mais recente primeiro

        // Remover backups excedentes
        if (files.length > MAX_BACKUPS) {
            const toDelete = files.slice(MAX_BACKUPS);
            toDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`[Backup] 🗑️ Backup antigo removido: ${file.name}`);
            });
        }
    } catch (error) {
        console.error('[Backup] Erro ao limpar backups antigos:', error);
    }
}

/**
 * Lista todos os backups disponíveis
 */
export function listBackups(): Array<{ name: string; date: Date; sizeMB: string }> {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return [];

        return fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    date: stats.mtime,
                    sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error('[Backup] Erro ao listar backups:', error);
        return [];
    }
}

/**
 * Restaura um backup específico
 * @param backupName - Nome do arquivo de backup
 * @returns true se restaurado com sucesso
 */
export function restoreBackup(backupName: string): boolean {
    try {
        const backupPath = path.join(BACKUP_DIR, backupName);

        if (!fs.existsSync(backupPath)) {
            console.error(`[Backup] ❌ Backup não encontrado: ${backupName}`);
            return false;
        }

        // Criar backup do banco atual antes de restaurar
        createBackup('pre-restore');

        // Copiar o backup para o local do banco
        fs.copyFileSync(backupPath, DB_PATH);

        console.log(`[Backup] ✅ Backup restaurado: ${backupName}`);
        console.log('[Backup] ⚠️ REINICIE O SERVIDOR para aplicar as mudanças!');

        return true;
    } catch (error) {
        console.error('[Backup] ❌ Erro ao restaurar backup:', error);
        return false;
    }
}

/**
 * Inicia backup agendado (a cada N horas)
 * @param intervalHours - Intervalo em horas (padrão: 6)
 */
export function startScheduledBackup(intervalHours: number = 6): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    console.log(`[Backup] ⏰ Backup agendado a cada ${intervalHours} horas`);

    setInterval(() => {
        console.log('[Backup] 🔄 Executando backup agendado...');
        createBackup('scheduled');
    }, intervalMs);
}

// Exportar o diretório de backups para referência
export const BACKUPS_PATH = BACKUP_DIR;
