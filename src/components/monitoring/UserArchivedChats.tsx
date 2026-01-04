import { useState } from "react";
import { UserArchivedChatsGroup } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, MessageSquare, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChatDetailDialog } from "./ChatDetailDialog";

interface UserArchivedChatsProps {
    group: UserArchivedChatsGroup;
}

const UserArchivedChats = ({ group }: UserArchivedChatsProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleChatClick = (chatId: string) => {
        setSelectedChatId(chatId);
        setIsDialogOpen(true);
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium">{group.userName}</p>
                        <p className="text-xs text-muted-foreground">{group.userEmail}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                        {group.archives.length} {group.archives.length === 1 ? "chat" : "chats"}
                    </Badge>
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 space-y-2">
                    {group.archives.map((archive) => (
                        <Card
                            key={archive.id}
                            className="p-3 hover:bg-muted/20 transition-colors cursor-pointer active:scale-[0.99]"
                            onClick={() => handleChatClick(archive.id)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                                        <p className="font-medium text-sm truncate">{archive.title}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{archive.messagesCount} mensagens</span>
                                        <span>•</span>
                                        <span>
                                            Arquivado{" "}
                                            {formatDistanceToNow(new Date(archive.archivedAt), {
                                                addSuffix: true,
                                                locale: ptBR,
                                            })}
                                        </span>
                                    </div>
                                </div>
                                {archive.isPinned && (
                                    <Badge variant="outline" className="text-xs">
                                        Fixado
                                    </Badge>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}


            <ChatDetailDialog
                chatId={selectedChatId}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </div >
    );
};

export default UserArchivedChats;
