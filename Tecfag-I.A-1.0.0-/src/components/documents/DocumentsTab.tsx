import { useState, useEffect, useMemo, useRef } from "react";
import { FileStack, Info, FolderInput, Search, CheckSquare, X, Trash2, Download, FolderInput as MoveIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DocumentUpload } from "@/components/ai/DocumentUpload";
import { DocumentList } from "@/components/ai/DocumentList";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentFolderSidebar } from "./DocumentFolderSidebar";
import { documentsApi, type DocumentFolder } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Document {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    indexed: boolean;
    processingProgress: number;
    processingError?: string | null;
    chunkCount?: number | null;
    totalTokens?: number | null;
    uploadedAt: string;
    indexedAt?: string | null;
    folderId?: string | null;
    catalogItem?: {
        code: string;
        name: string;
        category: string;
    } | null;
}

const DocumentsTab = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    // Multi-select state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Ref for auto-scroll
    const documentsListRef = useRef<HTMLDivElement>(null);

    const loadDocuments = async () => {
        try {
            const response = await fetch('/api/documents/all', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar documentos');
            }

            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFolders = async () => {
        try {
            const data = await documentsApi.getFolders();
            setFolders(data.folders);
        } catch (error) {
            console.error('Error loading folders:', error);
        }
    };

    const loadAll = async () => {
        await Promise.all([loadDocuments(), loadFolders()]);
    };

    useEffect(() => {
        loadAll();
    }, []);

    // Filter documents based on selected folder AND search query
    const filteredDocuments = useMemo(() => {
        let result = documents;

        // Filter by folder
        if (selectedFolderId !== null) {
            result = result.filter(doc => doc.folderId === selectedFolderId);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(doc =>
                doc.fileName.toLowerCase().includes(query)
            );
        }

        return result;
    }, [documents, selectedFolderId, searchQuery]);

    // Handle folder selection with auto-scroll
    const handleSelectFolder = (folderId: string | null) => {
        setSelectedFolderId(folderId);
        setSearchQuery(""); // Clear search when changing folders
        setSelectedIds([]); // Clear selection when changing folders

        // Auto-scroll to documents list when a folder is selected
        if (folderId !== null && documentsListRef.current) {
            setTimeout(() => {
                documentsListRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar este documento?')) {
            return;
        }

        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                loadAll();
            } else {
                alert('Erro ao deletar documento');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Erro ao deletar documento');
        }
    };

    const handleReindex = async (id: string) => {
        try {
            const response = await fetch(`/api/documents/${id}/reindex`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                // Atualizar status após alguns segundos
                setTimeout(loadAll, 3000);
            } else {
                alert('Erro ao reindexar documento');
            }
        } catch (error) {
            console.error('Error reindexing document:', error);
            alert('Erro ao reindexar documento');
        }
    };

    const handleDownload = async (id: string, fileName: string) => {
        try {
            const response = await fetch(`/api/documents/${id}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Erro ao baixar documento');
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            alert('Erro ao baixar documento');
        }
    };

    const handleMoveDocument = async (documentId: string, folderId: string | null) => {
        try {
            await documentsApi.moveDocument(documentId, folderId);
            loadAll();
        } catch (error) {
            console.error('Error moving document:', error);
            alert('Erro ao mover documento');
        }
    };

    // === BULK ACTIONS ===

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        if (!confirm(`Tem certeza que deseja deletar ${selectedIds.length} documento(s)?`)) {
            return;
        }

        try {
            for (const id of selectedIds) {
                await fetch(`/api/documents/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
            }
            setSelectedIds([]);
            setSelectionMode(false);
            loadAll();
        } catch (error) {
            console.error('Error bulk deleting:', error);
            alert('Erro ao deletar documentos');
        }
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;

        for (const id of selectedIds) {
            const doc = documents.find(d => d.id === id);
            if (doc) {
                await handleDownload(id, doc.fileName);
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    };

    const handleBulkMove = async (folderId: string | null) => {
        if (selectedIds.length === 0) return;

        try {
            for (const id of selectedIds) {
                await documentsApi.moveDocument(id, folderId);
            }
            setSelectedIds([]);
            setSelectionMode(false);
            loadAll();
        } catch (error) {
            console.error('Error bulk moving:', error);
            alert('Erro ao mover documentos');
        }
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        if (selectionMode) {
            setSelectedIds([]);
        }
    };

    // Create a custom action renderer for move to folder
    const renderMoveAction = (doc: Document) => {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                    >
                        <FolderInput className="w-4 h-4" />
                        Mover
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                    <DropdownMenuItem
                        onClick={() => handleMoveDocument(doc.id, null)}
                        className="text-white hover:bg-white/10 cursor-pointer"
                    >
                        📁 Sem pasta (Raiz)
                    </DropdownMenuItem>
                    {folders.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
                    {folders.map(folder => (
                        <DropdownMenuItem
                            key={folder.id}
                            onClick={() => handleMoveDocument(doc.id, folder.id)}
                            className="text-white hover:bg-white/10 cursor-pointer"
                        >
                            📂 {folder.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    const selectedFolderName = selectedFolderId
        ? folders.find(f => f.id === selectedFolderId)?.name || "Pasta"
        : "Todos";

    return (
        <div className="h-full flex bg-background">
            {/* Folder Sidebar */}
            <DocumentFolderSidebar
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
                onFolderChange={loadAll}
                folders={folders}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="container mx-auto px-4 py-6 space-y-6">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FileStack className="w-8 h-8 text-primary" />
                            Gestão de Documentos I.A
                        </h1>
                        <p className="text-muted-foreground">
                            Gerencie todos os documentos utilizados pela inteligência artificial
                        </p>
                    </div>

                    {/* Info Alert */}
                    <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-muted-foreground">
                                    <p>Os documentos indexados aqui estarão disponíveis para a I.A responder perguntas em todos os contextos do sistema.</p>
                                    <p className="mt-1">Apenas administradores têm acesso a este painel. Use as pastas para organizar os documentos.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upload Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Adicionar Novo Documento</CardTitle>
                            <CardDescription>
                                Faça upload de documentos técnicos (PDF, DOCX, TXT) para alimentar a I.A
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DocumentUpload onUploadComplete={loadAll} />
                        </CardContent>
                    </Card>

                    {/* Documents List */}
                    <Card ref={documentsListRef}>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>
                                        {selectedFolderName === "Todos"
                                            ? `Todos os Documentos (${filteredDocuments.length})`
                                            : `📂 ${selectedFolderName} (${filteredDocuments.length})`
                                        }
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedFolderId
                                            ? "Documentos nesta pasta. Use o botão 'Mover' para reorganizar."
                                            : "Visualize e gerencie todos os documentos disponíveis para a I.A"
                                        }
                                    </CardDescription>
                                </div>

                                {/* Search and Selection Toggle */}
                                <div className="flex items-center gap-2">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar documento..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 w-64"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Selection Mode Toggle */}
                                    <Button
                                        variant={selectionMode ? "default" : "outline"}
                                        size="sm"
                                        onClick={toggleSelectionMode}
                                        className="gap-2"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        {selectionMode ? "Cancelar" : "Selecionar"}
                                    </Button>
                                </div>
                            </div>

                            {/* Bulk Actions Bar (when items selected) */}
                            {selectionMode && selectedIds.length > 0 && (
                                <div className="mt-4 flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <span className="text-sm font-medium">
                                        {selectedIds.length} selecionado(s)
                                    </span>
                                    <div className="flex-1" />

                                    {/* Bulk Move */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <MoveIcon className="w-4 h-4" />
                                                Mover
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                                            <DropdownMenuItem
                                                onClick={() => handleBulkMove(null)}
                                                className="text-white hover:bg-white/10 cursor-pointer"
                                            >
                                                📁 Sem pasta (Raiz)
                                            </DropdownMenuItem>
                                            {folders.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
                                            {folders.map(folder => (
                                                <DropdownMenuItem
                                                    key={folder.id}
                                                    onClick={() => handleBulkMove(folder.id)}
                                                    className="text-white hover:bg-white/10 cursor-pointer"
                                                >
                                                    📂 {folder.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Bulk Download */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleBulkDownload}
                                    >
                                        <Download className="w-4 h-4" />
                                        Baixar
                                    </Button>

                                    {/* Bulk Delete */}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleBulkDelete}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            ) : (
                                <DocumentList
                                    documents={filteredDocuments}
                                    onDelete={handleDelete}
                                    onReindex={handleReindex}
                                    onDownload={handleDownload}
                                    renderExtraActions={renderMoveAction}
                                    selectionMode={selectionMode}
                                    selectedIds={selectedIds}
                                    onSelectionChange={setSelectedIds}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DocumentsTab;
