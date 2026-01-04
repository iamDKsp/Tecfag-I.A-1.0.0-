import { useState, useEffect } from "react";
import { chatApi, type ChatFolder } from "@/lib/api";
import { Folder, FolderPlus, Pin, Loader2, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderCreateDialog } from "./FolderCreateDialog";
import { ChatRenameDialog } from "./ChatRenameDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FolderSidebarProps {
    selectedFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    onFolderCreated: () => void;
    folders: ChatFolder[];
}

export const FolderSidebar = ({
    selectedFolderId,
    onSelectFolder,
    onFolderCreated,
    folders,
}: FolderSidebarProps) => {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<ChatFolder | null>(null);

    const handleCreateFolder = async (name: string) => {
        try {
            await chatApi.createFolder(name);
            onFolderCreated();
        } catch (error) {
            console.error("Error creating folder:", error);
        }
    };

    const handleRenameFolder = async (newName: string) => {
        if (!renamingFolder) return;
        try {
            await chatApi.renameFolder(renamingFolder.id, newName);
            onFolderCreated();
        } catch (error) {
            console.error("Error renaming folder:", error);
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        try {
            await chatApi.deleteFolder(folderId);
            if (selectedFolderId === folderId) {
                onSelectFolder(null);
            }
            onFolderCreated();
        } catch (error) {
            console.error("Error deleting folder:", error);
        }
    };

    return (
        <>
            <div className="w-56 bg-[#0d0d0d] border-r border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white mb-2">Pastas</h3>
                </div>

                {/* Folder List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {/* All Chats */}
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
                            selectedFolderId === null
                                ? "bg-primary/20 text-primary"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Folder className="w-4 h-4" />
                        <span className="flex-1 text-left">Todos</span>
                    </button>

                    {/* Folders */}
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className={cn(
                                "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
                                selectedFolderId === folder.id
                                    ? "bg-primary/20 text-primary"
                                    : "text-white/70 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <button
                                onClick={() => onSelectFolder(folder.id)}
                                className="flex items-center gap-2 flex-1 min-w-0"
                            >
                                {folder.isDefault ? (
                                    <Pin className="w-4 h-4 flex-shrink-0" />
                                ) : (
                                    <Folder className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="flex-1 text-left truncate">{folder.name}</span>
                                <span className="text-xs text-white/40 flex-shrink-0">
                                    {folder.chatCount}
                                </span>
                            </button>

                            {/* Folder Actions */}
                            {!folder.isDefault && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreVertical className="w-3 h-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="bg-[#1a1a1a] border-white/10"
                                    >
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setRenamingFolder(folder);
                                                setRenameDialogOpen(true);
                                            }}
                                            className="text-white hover:bg-white/10 cursor-pointer"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Renomear
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleDeleteFolder(folder.id)}
                                            className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Deletar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    ))}
                </div>

                {/* Create Folder Button */}
                <div className="p-2 border-t border-white/5">
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        variant="ghost"
                        className="w-full justify-start gap-2 text-white/70 hover:bg-white/5 hover:text-white"
                        size="sm"
                    >
                        <FolderPlus className="w-4 h-4" />
                        Nova Pasta
                    </Button>
                </div>
            </div>

            {/* Dialogs */}
            <FolderCreateDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={handleCreateFolder}
            />
            {renamingFolder && (
                <ChatRenameDialog
                    open={renameDialogOpen}
                    currentTitle={renamingFolder.name}
                    onOpenChange={setRenameDialogOpen}
                    onRename={handleRenameFolder}
                />
            )}
        </>
    );
};
