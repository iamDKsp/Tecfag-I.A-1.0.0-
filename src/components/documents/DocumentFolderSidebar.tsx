import { useState } from "react";
import { documentsApi, type DocumentFolder } from "@/lib/api";
import { Folder, FolderPlus, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentFolderCreateDialog } from "./DocumentFolderCreateDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DocumentFolderSidebarProps {
    selectedFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    onFolderChange: () => void;
    folders: DocumentFolder[];
}

export const DocumentFolderSidebar = ({
    selectedFolderId,
    onSelectFolder,
    onFolderChange,
    folders,
}: DocumentFolderSidebarProps) => {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<DocumentFolder | null>(null);
    const [newFolderName, setNewFolderName] = useState("");

    const handleCreateFolder = async (name: string) => {
        try {
            await documentsApi.createFolder(name);
            onFolderChange();
        } catch (error) {
            console.error("Error creating folder:", error);
        }
    };

    const handleRenameFolder = async () => {
        if (!renamingFolder || !newFolderName.trim()) return;
        try {
            await documentsApi.renameFolder(renamingFolder.id, newFolderName.trim());
            onFolderChange();
            setRenameDialogOpen(false);
            setRenamingFolder(null);
            setNewFolderName("");
        } catch (error) {
            console.error("Error renaming folder:", error);
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm("Tem certeza? Os documentos serão movidos para 'Todos'.")) return;
        try {
            await documentsApi.deleteFolder(folderId);
            if (selectedFolderId === folderId) {
                onSelectFolder(null);
            }
            onFolderChange();
        } catch (error) {
            console.error("Error deleting folder:", error);
        }
    };

    const openRenameDialog = (folder: DocumentFolder) => {
        setRenamingFolder(folder);
        setNewFolderName(folder.name);
        setRenameDialogOpen(true);
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
                    {/* All Documents */}
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
                                <Folder className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left truncate">{folder.name}</span>
                                <span className="text-xs text-white/40 flex-shrink-0">
                                    {folder.documentCount}
                                </span>
                            </button>

                            {/* Folder Actions */}
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
                                        onClick={() => openRenameDialog(folder)}
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
            <DocumentFolderCreateDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={handleCreateFolder}
            />

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent className="bg-[#1a1a1a] border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Renomear Pasta</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
                        className="bg-[#252525] border-white/10 text-white"
                        autoFocus
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRenameDialogOpen(false)}
                            className="bg-white/5 text-white hover:bg-white/10 border-white/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRenameFolder}
                            className="bg-primary hover:bg-primary/90"
                            disabled={!newFolderName.trim()}
                        >
                            Renomear
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
