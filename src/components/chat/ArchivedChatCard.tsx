import { ArchivedChatSummary, ChatFolder } from "@/lib/api";
import { Clock, MessageSquare, Trash2, Edit2, Pin, PinOff, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ArchivedChatCardProps {
    archive: ArchivedChatSummary;
    onClick: () => void;
    onDelete: () => void;
    onRename: () => void;
    onTogglePin: () => void;
    onMoveToFolder: (folderId: string | null) => void;
    folders: ChatFolder[];
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const ArchivedChatCard = ({
    archive,
    onClick,
    onDelete,
    onRename,
    onTogglePin,
    onMoveToFolder,
    folders
}: ArchivedChatCardProps) => {
    return (
        <div
            className="group relative bg-[#1a1a1a] rounded-lg p-2.5 border border-white/5 hover:border-primary/40 transition-colors duration-200 cursor-pointer"
            onClick={onClick}
        >
            {/* Action Buttons */}
            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Edit Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/40 hover:text-blue-400 hover:bg-blue-400/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRename();
                    }}
                >
                    <Edit2 className="w-3 h-3" />
                </Button>

                {/* Move to Folder Button */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/40 hover:text-yellow-400 hover:bg-yellow-400/10"
                        >
                            <FolderInput className="w-3 h-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                        <DropdownMenuLabel className="text-white/60 text-xs">Mover para...</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Root Option */}
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveToFolder(null);
                            }}
                            className="text-white hover:bg-white/10 cursor-pointer"
                        >
                            Sem pasta
                        </DropdownMenuItem>

                        {/* Folder Options */}
                        {folders.map((folder) => (
                            <DropdownMenuItem
                                key={folder.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveToFolder(folder.id);
                                }}
                                className={`text-white hover:bg-white/10 cursor-pointer ${archive.folderId === folder.id ? "bg-white/5" : ""
                                    }`}
                            >
                                {folder.isDefault ? "📌" : "📁"} {folder.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Pin Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${archive.isPinned
                            ? "text-primary"
                            : "text-white/40 hover:text-primary"
                        } hover:bg-primary/10`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin();
                    }}
                >
                    {archive.isPinned ? (
                        <Pin className="w-3 h-3 fill-current" />
                    ) : (
                        <PinOff className="w-3 h-3" />
                    )}
                </Button>

                {/* Delete Button */}
                <AlertDialog>
                    <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/40 hover:text-red-500 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Deletar chat arquivado?</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/60">
                                Esta ação não pode ser desfeita. O chat será permanentemente deletado.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 text-white hover:bg-white/10 border-white/10">
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="bg-red-500/90 text-white hover:bg-red-500"
                            >
                                Deletar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Card Content */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2 pr-24">
                    <h3 className="text-white font-medium line-clamp-1 text-sm leading-tight flex-1">
                        {archive.isPinned && <Pin className="w-3 h-3 inline mr-1 text-primary" />}
                        {archive.title}
                    </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{archive.messagesCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(archive.archivedAt)}</span>
                    </div>
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-lg bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

export default ArchivedChatCard;
