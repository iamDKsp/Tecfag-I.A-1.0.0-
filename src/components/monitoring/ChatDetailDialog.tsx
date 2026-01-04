import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { chatApi, ArchivedChatDetail } from "@/lib/api";
import { MessageSquare, Calendar, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatDetailDialogProps {
    chatId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChatDetailDialog({ chatId, open, onOpenChange }: ChatDetailDialogProps) {
    const [chat, setChat] = useState<ArchivedChatDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && chatId) {
            loadChat();
        } else {
            setChat(null);
        }
    }, [open, chatId]);

    const loadChat = async () => {
        if (!chatId) return;
        setIsLoading(true);
        try {
            const data = await chatApi.getArchivedChat(chatId);
            setChat(data);
        } catch (error) {
            console.error("Error loading chat:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        {chat?.title || "Detalhes do Chat"}
                    </DialogTitle>
                    <DialogDescription>
                        {chat && (
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(chat.createdAt), "PPp", { locale: ptBR })}
                                </span>
                                <Badge variant="outline">{chat.messagesCount} mensagens</Badge>
                                {chat.isPinned && <Badge>Fixado</Badge>}
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4 bg-muted/10 rounded-lg border">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : chat ? (
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {chat.messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            "flex gap-3 max-w-[80%]",
                                            message.role === "assistant" ? "ml-0" : "ml-auto flex-row-reverse"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                                message.role === "assistant"
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-secondary text-secondary-foreground"
                                            )}
                                        >
                                            {message.role === "assistant" ? (
                                                <Bot className="w-5 h-5" />
                                            ) : (
                                                <User className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div
                                            className={cn(
                                                "rounded-lg p-3 text-sm",
                                                message.role === "assistant"
                                                    ? "bg-muted"
                                                    : "bg-primary text-primary-foreground"
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                            <div
                                                className={cn(
                                                    "text-[10px] mt-1 opacity-70",
                                                    message.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground"
                                                )}
                                            >
                                                {format(new Date(message.createdAt), "HH:mm", { locale: ptBR })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            Não foi possível carregar as mensagens.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
