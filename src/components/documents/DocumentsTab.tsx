import { useState, useEffect, useMemo } from "react";
import { FileStack, Info, FolderInput } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DocumentUpload } from "@/components/ai/DocumentUpload";
import { DocumentList } from "@/components/ai/DocumentList";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentFolderSidebar } from "./DocumentFolderSidebar";
import { documentsApi, type DocumentFolder } from "@/lib/api";
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

    // Filter documents based on selected folder
    const filteredDocuments = useMemo(() => {
        if (selectedFolderId === null) {
            return documents; // Show all documents
        }
        return documents.filter(doc => doc.folderId === selectedFolderId);
    }, [documents, selectedFolderId]);

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
                onSelectFolder={setSelectedFolderId}
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
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedFolderName === "Todos"
                                    ? `Todos os Documentos (${documents.length})`
                                    : `📂 ${selectedFolderName} (${filteredDocuments.length})`
                                }
                            </CardTitle>
                            <CardDescription>
                                {selectedFolderId
                                    ? "Documentos nesta pasta. Use o botão 'Mover' para reorganizar."
                                    : "Visualize e gerencie todos os documentos disponíveis para a I.A"
                                }
                            </CardDescription>
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
