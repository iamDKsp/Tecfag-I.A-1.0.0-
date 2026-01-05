const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to get auth headers
export const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Generic fetch wrapper with error handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro de conexão' }));
        throw new Error(error.error || 'Erro na requisição');
    }

    return response.json();
}

// ============ MACHINES API ============

export interface Machine {
    id: string;
    name: string;
    category: string;
    capacity: string;
    model: string;
    price: string;
    maintenanceStatus: 'ok' | 'attention' | 'critical';
    lastMaintenance: string;
    specifications: string[];
}

export interface MachinesFilter {
    search?: string;
    category?: string;
    status?: string;
}

export const machinesApi = {
    getAll: (filters?: MachinesFilter) => {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.status) params.append('status', filters.status);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiFetch<Machine[]>(`/api/machines${query}`);
    },

    getById: (id: string) => apiFetch<Machine>(`/api/machines/${id}`),

    getCategories: () => apiFetch<string[]>('/api/machines/meta/categories'),

    create: (machine: Omit<Machine, 'id'>) =>
        apiFetch<Machine>('/api/machines', {
            method: 'POST',
            body: JSON.stringify(machine),
        }),

    update: (id: string, machine: Partial<Machine>) =>
        apiFetch<Machine>(`/api/machines/${id}`, {
            method: 'PUT',
            body: JSON.stringify(machine),
        }),

    delete: (id: string) =>
        apiFetch<{ message: string }>(`/api/machines/${id}`, {
            method: 'DELETE',
        }),
};

// ============ MINDMAPS API ============

export interface MindMapNode {
    id: string;
    label: string;
    type: 'machine' | 'process' | 'parameter';
    x: number;
    y: number;
    connections: string[];
}

export interface MindMap {
    id: string;
    name: string;
    nodes: MindMapNode[];
    createdAt?: string;
    updatedAt?: string;
}

export const mindmapsApi = {
    getAll: () => apiFetch<MindMap[]>('/api/mindmaps'),

    getById: (id: string) => apiFetch<MindMap>(`/api/mindmaps/${id}`),

    create: (mindmap: { name: string; nodes: MindMapNode[] }) =>
        apiFetch<MindMap>('/api/mindmaps', {
            method: 'POST',
            body: JSON.stringify(mindmap),
        }),

    update: (id: string, mindmap: Partial<{ name: string; nodes: MindMapNode[] }>) =>
        apiFetch<MindMap>(`/api/mindmaps/${id}`, {
            method: 'PUT',
            body: JSON.stringify(mindmap),
        }),

    delete: (id: string) =>
        apiFetch<{ message: string }>(`/api/mindmaps/${id}`, {
            method: 'DELETE',
        }),
};

// ============ CHAT API ============

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface ChatResponse {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
}

export interface ChatHistoryResponse {
    messages: ChatMessage[];
    total: number;
    limit: number;
    offset: number;
}

export interface ArchivedChatSummary {
    id: string;
    title: string;
    messagesCount: number;
    createdAt: string;
    archivedAt: string;
    folderId: string | null;
    isPinned: boolean;
}

export interface ArchivedChatDetail extends ArchivedChatSummary {
    messages: ChatMessage[];
}

export interface ArchivedChatsResponse {
    archives: ArchivedChatSummary[];
}

export interface ChatFolder {
    id: string;
    name: string;
    isDefault: boolean;
    order: number;
    chatCount: number;
    createdAt: string;
}

export interface FoldersResponse {
    folders: ChatFolder[];
}

export const chatApi = {
    sendMessage: (content: string) =>
        apiFetch<ChatResponse>('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ content }),
        }),

    getHistory: (limit = 50, offset = 0) =>
        apiFetch<ChatHistoryResponse>(`/api/chat/history?limit=${limit}&offset=${offset}`),

    clearHistory: () =>
        apiFetch<{ message: string }>('/api/chat/history', {
            method: 'DELETE',
        }),

    archiveChat: (title?: string) =>
        apiFetch<ArchivedChatSummary>('/api/chat/archive', {
            method: 'POST',
            body: JSON.stringify({ title }),
        }),

    getArchivedChats: () =>
        apiFetch<ArchivedChatsResponse>('/api/chat/archives'),

    getArchivedChat: (id: string) =>
        apiFetch<ArchivedChatDetail>(`/api/chat/archives/${id}`),

    deleteArchivedChat: (id: string) =>
        apiFetch<{ message: string }>(`/api/chat/archives/${id}`, {
            method: 'DELETE',
        }),

    restoreArchivedChat: (id: string) =>
        apiFetch<{ message: string }>(`/api/chat/archives/${id}/restore`, {
            method: 'POST',
        }),

    // Folder management
    createFolder: (name: string) =>
        apiFetch<ChatFolder>('/api/chat/folders', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),

    getFolders: () =>
        apiFetch<FoldersResponse>('/api/chat/folders'),

    renameFolder: (id: string, name: string) =>
        apiFetch<ChatFolder>(`/api/chat/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
        }),

    deleteFolder: (id: string) =>
        apiFetch<{ message: string }>(`/api/chat/folders/${id}`, {
            method: 'DELETE',
        }),

    // Chat operations
    renameChat: (id: string, title: string) =>
        apiFetch<ArchivedChatSummary>(`/api/chat/archives/${id}/rename`, {
            method: 'PUT',
            body: JSON.stringify({ title }),
        }),

    moveChat: (id: string, folderId: string | null) =>
        apiFetch<{ id: string; folderId: string | null; isPinned: boolean }>(`/api/chat/archives/${id}/move`, {
            method: 'PUT',
            body: JSON.stringify({ folderId }),
        }),

    pinChat: (id: string, isPinned: boolean) =>
        apiFetch<{ id: string; isPinned: boolean; folderId: string | null }>(`/api/chat/archives/${id}/pin`, {
            method: 'PUT',
            body: JSON.stringify({ isPinned }),
        }),

    // RAG AI endpoints
    sendMessageRAG: (content: string, catalogId?: string, mode?: string, isTableMode?: boolean) =>
        apiFetch<ChatResponse & { sources?: Array<{ fileName: string; chunkIndex: number; similarity: number }> }>('/api/chat/rag', {
            method: 'POST',
            body: JSON.stringify({ content, catalogId, mode, isTableMode }),
        }),

    getSuggestions: (catalogId?: string) =>
        apiFetch<{ suggestions: string[] }>(`/api/chat/suggestions${catalogId ? `?catalogId=${catalogId}` : ''}`),
};

// ============ AUTH API ============

export const authApi = {
    heartbeat: () =>
        apiFetch<{ success: boolean }>('/api/auth/heartbeat', {
            method: 'PUT',
        }),

    updateProfile: (data: { name?: string; jobTitle?: string; department?: string; technicalLevel?: string; communicationStyle?: string }) =>
        apiFetch<{ user: any }>('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// ============ MONITORING API ============

export interface UserStatus {
    id: string;
    name: string;
    email: string;
    role: string;
    isOnline: boolean;
    lastActive: string;
    createdAt: string;
}

export interface UserArchivedChatsGroup {
    userId: string;
    userName: string;
    userEmail: string;
    archives: ArchivedChatSummary[];
}

export interface QuestionStatistics {
    totalQuestions: number;
    mostAskedQuestions: { question: string; count: number }[];
    questionsByUser: { userId: string; userName: string; count: number }[];
}

export const monitoringApi = {
    getUsersStatus: () =>
        apiFetch<{ users: UserStatus[] }>('/api/monitoring/users'),

    getArchivedChatsByUser: () =>
        apiFetch<{ groups: UserArchivedChatsGroup[] }>('/api/monitoring/archived-chats'),

    getStatistics: () =>
        apiFetch<QuestionStatistics>('/api/monitoring/statistics'),
};

