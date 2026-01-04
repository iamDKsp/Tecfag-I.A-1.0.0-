import { useState, useEffect } from "react";
import { ArchivedChatSummary, chatApi, ChatFolder } from "@/lib/api";
import ArchivedChatCard from "./ArchivedChatCard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Archive, RefreshCcw } from "lucide-react";
import { FolderSidebar } from "./FolderSidebar";
import { ChatRenameDialog } from "./ChatRenameDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ArchivedChatsListProps {
    onNewChat: () => void;
    onSelectArchive: (archiveId: string) => void;
}

const ArchivedChatsList = ({ onNewChat, onSelectArchive }: ArchivedChatsListProps) => {
    const { toast } = useToast();
    const [archives, setArchives] = useState<ArchivedChatSummary[]>([]);
    const [folders, setFolders] = useState<ChatFolder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renamingChat, setRenamingChat] = useState<ArchivedChatSummary | null>(null);

    const loadArchives = async () => {
        try {
            const response = await chatApi.getArchivedChats();
            setArchives(response.archives);
        } catch (error) {
            console.error("Error loading archives:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFolders = async () => {
        try {
            const response = await chatApi.getFolders();
            // Sort: default folder (Fixados) first, then by order
            const sorted = response.folders.sort((a, b) => {
                if (a.isDefault !== b.isDefault) {
                    return a.isDefault ? -1 : 1;
                }
                return a.order - b.order;
            });
            setFolders(sorted);
        } catch (error) {
            console.error("Error loading folders:", error);
        }
    };

    useEffect(() => {
        loadArchives();
        loadFolders();
    }, []);

    const handleDelete = async (archiveId: string) => {
        try {
            await chatApi.deleteArchivedChat(archiveId);
            setArchives((prev) => prev.filter((a) => a.id !== archiveId));
        } catch (error) {
            console.error("Error deleting archive:", error);
        }
    };

    const handleRename = async (newTitle: string) => {
        if (!renamingChat) return;
        try {
            const updated = await chatApi.renameChat(renamingChat.id, newTitle);
            setArchives((prev) =>
                prev.map((a) => (a.id === renamingChat.id ? { ...a, title: updated.title } : a))
            );
        } catch (error) {
            console.error("Error renaming chat:", error);
        }
    };

    const handleTogglePin = async (chat: ArchivedChatSummary) => {
        try {
            const result = await chatApi.pinChat(chat.id, !chat.isPinned);
            setArchives((prev) =>
                prev.map((a) =>
                    a.id === chat.id
                        ? { ...a, isPinned: result.isPinned, folderId: result.folderId }
                        : a
                )
            );
            // Reload to update folder counts
            loadArchives();
            loadFolders();
        } catch (error) {
            console.error("Error toggling pin:", error);
        }
    };

    const handleMoveToFolder = async (chatId: string, folderId: string | null) => {
        try {
            await chatApi.moveChat(chatId, folderId);
            setArchives((prev) =>
                prev.map((a) =>
                    a.id === chatId ? { ...a, folderId } : a
                )
            );
            // Reload to update folder counts
            loadFolders();
        } catch (error) {
            console.error("Error moving chat:", error);
        }
    };

    // Filter archives by selected folder
    const filteredArchives =
        selectedFolderId === null
            ? archives
            : archives.filter((a) => a.folderId === selectedFolderId);

    if (isLoading) {
        return (
            <div className="flex h-full">
                <FolderSidebar
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    onFolderCreated={() => { }}
                    folders={folders}
                />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex h-full bg-[#0d0d0d]">
                {/* Sidebar */}
                <FolderSidebar
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    onFolderCreated={() => {
                        loadArchives();
                        loadFolders();
                    }}
                    folders={folders}
                />

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Archive className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Chats Arquivados</h2>
                                <p className="text-sm text-white/40">
                                    {filteredArchives.length} {filteredArchives.length === 1 ? "conversa" : "conversas"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                    setIsRefreshing(true);
                                    const start = Date.now();

                                    await Promise.all([loadArchives(), loadFolders()]);

                                    // Ensure at least 500ms delay for visual feedback
                                    const elapsed = Date.now() - start;
                                    if (elapsed < 500) {
                                        await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
                                    }

                                    setIsRefreshing(false);
                                    toast({
                                        title: "Lista atualizada",
                                        description: "Seus chats e pastas foram sincronizados.",
                                        duration: 2000,
                                    });
                                }}
                                disabled={isRefreshing}
                                className="text-white/60 hover:text-white hover:bg-white/10"
                                title="Atualizar lista"
                            >
                                <RefreshCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            </Button>
                            <Button onClick={onNewChat} className="gap-2 bg-primary hover:bg-primary/90">
                                <Plus className="w-4 h-4" />
                                Novo Chat
                            </Button>
                        </div>
                    </div>

                    {/* Archives Grid */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredArchives.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                    <Archive className="w-10 h-10 text-white/20" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white/60 font-medium mb-1">Nenhum chat arquivado</h3>
                                    <p className="text-white/40 text-sm">
                                        {selectedFolderId
                                            ? "Nenhum chat nesta pasta"
                                            : "Seus chats arquivados aparecerão aqui"}
                                    </p>
                                </div>
                                <Button
                                    onClick={onNewChat}
                                    variant="outline"
                                    className="gap-2 border-white/10 text-white hover:bg-white/5"
                                >
                                    <Plus className="w-4 h-4" />
                                    Iniciar Novo Chat
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pb-2">
                                {filteredArchives.map((archive) => (
                                    <ArchivedChatCard
                                        key={archive.id}
                                        archive={archive}
                                        onClick={() => onSelectArchive(archive.id)}
                                        onDelete={() => handleDelete(archive.id)}
                                        onRename={() => {
                                            setRenamingChat(archive);
                                            setRenameDialogOpen(true);
                                        }}
                                        onTogglePin={() => handleTogglePin(archive)}
                                        onMoveToFolder={(folderId) => handleMoveToFolder(archive.id, folderId)}
                                        folders={folders}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rename Dialog */}
            {renamingChat && (
                <ChatRenameDialog
                    open={renameDialogOpen}
                    currentTitle={renamingChat.title}
                    onOpenChange={setRenameDialogOpen}
                    onRename={handleRename}
                />
            )}
        </>
    );
};

export default ArchivedChatsList;
