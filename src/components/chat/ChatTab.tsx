import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Archive, History, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChatSound } from "@/hooks/useSound";
import ArchivedChatsList from "./ArchivedChatsList";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatModeSelector, type ChatMode } from "./ChatModeSelector";
import { ChatFunctionSelector, type ChatFunction } from "./ChatFunctionSelector";
import { ChatSuggestions } from "./ChatSuggestions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  sources?: string[];
}

type ViewMode = "active" | "archived-list" | "archived-detail";

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const getModeConfig = (mode: ChatMode) => {
  switch (mode) {
    case "direct":
      return { label: "Modelo Direto", color: "text-yellow-400", bgColor: "bg-yellow-500", borderColor: "border-yellow-500/20" };
    case "casual":
      return { label: "Modelo Casual", color: "text-green-400", bgColor: "bg-green-500", borderColor: "border-green-500/20" };
    case "educational":
      return { label: "Modelo Educativo", color: "text-cyan-400", bgColor: "bg-cyan-500", borderColor: "border-cyan-500/20" };
    case "professional":
      return { label: "Modelo Profissional", color: "text-red-400", bgColor: "bg-red-500", borderColor: "border-red-500/20" };
    default:
      return { label: "Modelo Padrão", color: "text-primary", bgColor: "bg-primary", borderColor: "border-primary/20" };
  }
};

const ChatTab = () => {
  const { user } = useAuth();
  const { playSend, playReceive, startThinking, stopThinking } = useChatSound();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [chatMode, setChatMode] = useState<ChatMode>("educational");
  const [functionMode, setFunctionMode] = useState<ChatFunction>("normal");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Olá! Sou a Tec I.A, sua assistente de inteligência artificial. Como posso ajudá-lo hoje?`,
      timestamp: formatTime(new Date()),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [currentArchivedChatTitle, setCurrentArchivedChatTitle] = useState("");
  const [shouldLoadHistory, setShouldLoadHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!shouldLoadHistory) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const response = await chatApi.getHistory(50, 0);
        if (response.messages.length > 0) {
          const historyMessages: Message[] = response.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: formatTime(new Date()),
          }));
          setMessages((prev) => [...prev, ...historyMessages]);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [shouldLoadHistory]);

  const handleSend = async (customContent?: string) => {
    const contentToSend = customContent || input.trim();
    if (!contentToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: contentToSend,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customContent) setInput("");
    setIsLoading(true);
    playSend();
    startThinking();

    try {
      let finalInput = contentToSend;
      if (functionMode === 'list') {
        finalInput += "\n\nPor favor, forneça a resposta em formato de lista estruturada.";
      }

      // Use RAG endpoint for document-based responses
      const response = await chatApi.sendMessageRAG(
        finalInput,
        undefined,
        chatMode,
        functionMode === 'table' // isTableMode
      );

      stopThinking();
      playReceive();

      // Update user message with real ID
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id
            ? { ...m, id: response.userMessage.id }
            : m
        )
      );

      // Add assistant response
      const sources = response.sources?.map(s => s.fileName) || [];
      const aiMessage: Message = {
        id: response.assistantMessage.id,
        role: "assistant",
        content: response.assistantMessage.content,
        timestamp: formatTime(new Date()),
        sources: sources.length > 0 ? sources : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Log sources if available
      if (response.sources && response.sources.length > 0) {
        console.log('📚 Fontes consultadas:', response.sources);
      }
    } catch (error) {
      console.error("Chat error:", error);
      stopThinking();
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        timestamp: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      stopThinking();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Auto-mode detection
    const lowerValue = value.toLowerCase();
    if (lowerValue.includes("tabela") && functionMode !== "table" && functionMode !== "list") {
      setFunctionMode("table");
    } else if (lowerValue.includes("lista") && functionMode !== "list" && functionMode !== "table") {
      setFunctionMode("list");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Check for keywords in suggestion too
    const lowerSuggestion = suggestion.toLowerCase();
    if (lowerSuggestion.includes("tabela")) setFunctionMode("table");
    if (lowerSuggestion.includes("lista")) setFunctionMode("list");

    handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleArchive = async () => {
    // Check if there are messages to archive (excluding welcome message)
    const messagesToArchive = messages.filter(m => m.id !== "welcome");
    if (messagesToArchive.length === 0) {
      return;
    }

    setIsArchiving(true);
    try {
      await chatApi.archiveChat();
      // Reset to welcome message and mark that we shouldn't load history
      setShouldLoadHistory(false);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Olá! Sou a Tec I.A, sua assistente de inteligência artificial. Como posso ajudá-lo hoje?`,
          timestamp: formatTime(new Date()),
        },
      ]);
      // Switch to archived list view with animation delay
      setTimeout(() => {
        setViewMode("archived-list");
      }, 100);
    } catch (error) {
      console.error("Error archiving chat:", error);
      alert("Erro ao arquivar chat. Tente novamente.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleViewArchives = () => {
    setViewMode("archived-list");
  };

  const handleNewChat = () => {
    // Don't load history for new chat
    setShouldLoadHistory(false);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Olá! Sou a Tec I.A, sua assistente de inteligência artificial. Como posso ajudá-lo hoje?`,
        timestamp: formatTime(new Date()),
      },
    ]);
    setViewMode("active");
  };

  const handleSelectArchive = async (archiveId: string) => {
    try {
      const archive = await chatApi.getArchivedChat(archiveId);
      const archivedMessages: Message[] = archive.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: formatTime(new Date(msg.createdAt)),
      }));
      setMessages(archivedMessages);
      setCurrentArchivedChatTitle(archive.title);
      setViewMode("archived-detail");
    } catch (error) {
      console.error("Error loading archived chat:", error);
    }
  };

  const handleBackToArchives = () => {
    setViewMode("archived-list");
  };

  // Theme configuration based on mode
  const getThemeConfig = (mode: ChatMode) => {
    switch (mode) {
      case "direct":
        return {
          primary: "text-yellow-400",
          bgFull: "bg-yellow-500/5",
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/20",
          userBubble: "bg-yellow-600/90 text-white",
          iconBg: "bg-yellow-500/20",
          glow: "shadow-[0_0_50px_-10px_rgba(234,179,8,0.15)]",
        };
      case "casual":
        return {
          primary: "text-green-400",
          bgFull: "bg-green-500/5",
          bg: "bg-green-500/10",
          border: "border-green-500/20",
          userBubble: "bg-green-600/90 text-white",
          iconBg: "bg-green-500/20",
          glow: "shadow-[0_0_50px_-10px_rgba(34,197,94,0.15)]",
        };
      case "educational":
        return {
          primary: "text-cyan-400",
          bgFull: "bg-cyan-500/5",
          bg: "bg-cyan-500/10",
          border: "border-cyan-500/20",
          userBubble: "bg-cyan-600/90 text-white",
          iconBg: "bg-cyan-500/20",
          glow: "shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)]",
        };
      case "professional":
        return {
          primary: "text-red-400",
          bgFull: "bg-red-500/5",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          userBubble: "bg-red-600/90 text-white",
          iconBg: "bg-red-500/20",
          glow: "shadow-[0_0_50px_-10px_rgba(239,68,68,0.15)]",
        };
      default:
        return {
          primary: "text-primary",
          bgFull: "bg-primary/5",
          bg: "bg-primary/5",
          border: "border-white/5",
          userBubble: "bg-primary text-primary-foreground",
          iconBg: "bg-primary/20",
          glow: "shadow-none",
        };
    }
  };

  const theme = getThemeConfig(chatMode);

  // Render archived list view with animation
  if (viewMode === "archived-list") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="archived-list"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-[#0d0d0d]"
        >
          <ArchivedChatsList
            onNewChat={handleNewChat}
            onSelectArchive={handleSelectArchive}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Render active chat or archived detail view with animation
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex items-center justify-center h-full bg-[#0d0d0d] p-4"
      >
        <motion.div
          layout
          className={cn(
            "flex flex-col h-full w-full max-w-[95%] rounded-xl overflow-hidden shadow-2xl transition-all duration-700",
            "bg-[#1a1a1a]",
            theme.border,
            theme.glow
          )}
          style={{ borderWidth: "1px" }}
        >
          {/* Chat Header */}
          <div className={cn("flex items-center justify-between px-4 py-3 border-b transition-colors duration-700", theme.border, theme.bg)}>
            <div className="flex items-center gap-3">
              {viewMode === "archived-detail" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToArchives}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  title="Voltar para arquivados"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="relative">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700", theme.iconBg)}>
                  <Bot className={cn("w-5 h-5 transition-colors duration-700", theme.primary)} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {viewMode === "archived-detail" ? currentArchivedChatTitle : "Tec I.A"}
                </span>
                <span className={cn("text-xs transition-colors duration-700", theme.primary)}>
                  {viewMode === "archived-detail" ? "Chat Arquivado" : getModeConfig(chatMode).label}
                </span>
              </div>
            </div>
            {viewMode === "active" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleViewArchives}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  title="Ver chats arquivados"
                >
                  <History className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleArchive}
                  disabled={isArchiving || messages.filter(m => m.id !== "welcome").length === 0}
                  className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50"
                  title="Arquivar chat"
                >
                  {isArchiving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Archive className="w-5 h-5" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className={cn("flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-4 transition-colors duration-700", theme.bgFull)}>
            {isLoadingHistory && viewMode === "active" && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2.5 animate-fade-in",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-700",
                    theme.iconBg
                  )}
                >
                  {message.role === "user" ? (
                    <User className={cn("w-4 h-4 transition-colors duration-700", theme.primary)} />
                  ) : (
                    <Bot className={cn("w-4 h-4 transition-colors duration-700", theme.primary)} />
                  )}
                </div>

                {/* Message Bubble - Improved with basic Markdown rendering */}
                <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[70%]">
                  <div
                    className={cn(
                      "rounded-xl px-3.5 py-2.5 shadow-sm transition-colors duration-700",
                      message.role === "user"
                        ? cn("rounded-tr-sm", theme.userBubble)
                        : "bg-[#2a2a2a] text-white/90 rounded-tl-sm border relative group"
                    )}
                    style={{ borderColor: message.role !== "user" ? theme.border : undefined }}
                  >
                    {message.role === "assistant" && message.sources && (
                      <div className="absolute -top-3 -right-2 z-10">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <button className="bg-[#0d0d0d] hover:bg-black/80 border border-white/10 text-[10px] text-white/60 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors shadow-sm">
                              <BookOpen className="w-3 h-3" />
                              <span>Fontes</span>
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64 bg-[#1a1a1a] border-white/10 text-white p-3 z-50">
                            <h4 className="text-xs font-semibold mb-2 text-white/90 uppercase tracking-wider">Fontes Consultadas</h4>
                            <ul className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                              {message.sources.map((source, i) => (
                                <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                  <span className={cn("mt-0.5 transition-colors duration-700", theme.primary)}>•</span>
                                  <span className="break-words leading-tight">{source}</span>
                                </li>
                              ))}
                            </ul>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    )}
                    <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-white/10">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="w-full text-sm text-left" {...props} /></div>,
                          thead: ({ node, ...props }) => <thead className="bg-white/5 text-white/90 uppercase text-xs" {...props} />,
                          tbody: ({ node, ...props }) => <tbody className="divide-y divide-white/10" {...props} />,
                          tr: ({ node, ...props }) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
                          th: ({ node, ...props }) => <th className="px-4 py-3 font-medium border-b border-white/10" {...props} />,
                          td: ({ node, ...props }) => <td className="px-4 py-3 text-white/70" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="text-white/80" {...props} />,
                          strong: ({ node, ...props }) => <strong className={cn("font-bold transition-colors duration-700", theme.primary)} {...props} />,
                          h3: ({ node, ...props }) => <h3 className={cn("text-base font-bold mt-4 mb-2 border-b pb-1 transition-colors duration-700", theme.primary, theme.border)} {...props} />,
                          code: ({ node, ...props }) => <code className={cn("bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono transition-colors duration-700", theme.primary)} {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {/* Timestamp */}
                  <span className={cn(
                    "text-[10px] text-white/40 px-1",
                    message.role === "user" ? "text-right" : "text-left"
                  )}>
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-700", theme.iconBg)}>
                  <Bot className={cn("w-4 h-4 transition-colors duration-700", theme.primary)} />
                </div>
                <div className={cn("bg-[#2a2a2a] rounded-xl rounded-tl-sm px-4 py-3 border transition-colors duration-700", theme.border)}>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="flex gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.span
                        className={cn("w-1.5 h-1.5 rounded-full transition-colors duration-700", theme.userBubble)}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                      />
                      <motion.span
                        className={cn("w-1.5 h-1.5 rounded-full transition-colors duration-700", theme.userBubble)}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      />
                      <motion.span
                        className={cn("w-1.5 h-1.5 rounded-full transition-colors duration-700", theme.userBubble)}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                      />
                    </motion.div>
                    <span className="text-sm text-white/50 ml-1.5 font-light animate-pulse">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Only show in active mode */}
          {viewMode === "active" && (
            <div className={cn("border-t p-4 transition-colors duration-700", theme.border, theme.bg)}>
              <div className="relative flex items-center gap-3 bg-[#252525] rounded-lg px-4 py-2 max-w-4xl mx-auto border border-white/5">
                <ChatSuggestions onSelect={handleSuggestionClick} mode={chatMode} />
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-transparent border-0 text-white/90 placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                  disabled={isLoading}
                />

                <ChatFunctionSelector currentFunction={functionMode} onFunctionChange={setFunctionMode} />
                <ChatModeSelector currentMode={chatMode} onModeChange={setChatMode} />

                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className={cn("w-9 h-9 rounded-lg text-white shrink-0 transition-all duration-700", theme.userBubble)}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Archived Detail View Footer */}
          {viewMode === "archived-detail" && (
            <div className={cn("border-t p-4 transition-colors duration-700", theme.border, theme.bg)}>
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-white/40">Este é um chat arquivado</span>
                <Button
                  onClick={handleBackToArchives}
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  Voltar para arquivados
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatTab;
