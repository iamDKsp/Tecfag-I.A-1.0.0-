import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lightbulb, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ChatMode } from "./ChatModeSelector";

interface ChatSuggestionsProps {
    onSelect: (suggestion: string) => void;
    mode: ChatMode;
}

const suggestions = [
    "Como posso usar a técnica spiced para vender mais?",
    "Por que devo oferecer manutenção preventiva?",
    "Quais são os tipos e modelos de seladoras?",
    "Gere uma tabela com todas as maquinas!",
    "Qual a realidade da importação direta?"
];

const getModeColors = (mode: ChatMode) => {
    switch (mode) {
        case "direct":
            return { icon: "text-yellow-400", bg: "bg-yellow-400/10 group-hover:bg-yellow-400/20", border: "hover:border-yellow-400/30", text: "text-yellow-100" };
        case "casual":
            return { icon: "text-green-400", bg: "bg-green-400/10 group-hover:bg-green-400/20", border: "hover:border-green-400/30", text: "text-green-100" };
        case "educational":
            return { icon: "text-cyan-400", bg: "bg-cyan-400/10 group-hover:bg-cyan-400/20", border: "hover:border-cyan-400/30", text: "text-cyan-100" };
        case "professional":
            return { icon: "text-red-400", bg: "bg-red-400/10 group-hover:bg-red-400/20", border: "hover:border-red-400/30", text: "text-red-100" };
        default:
            return { icon: "text-primary", bg: "bg-primary/10 group-hover:bg-primary/20", border: "hover:border-primary/30", text: "text-white/80" };
    }
};

export const ChatSuggestions = ({ onSelect, mode }: ChatSuggestionsProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);
    const colors = getModeColors(mode);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % suggestions.length);
        }, 4000); // Reduced time slightly for better flow

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 pl-1 pb-2 flex justify-start pointer-events-none overflow-visible">
            <AnimatePresence mode="popLayout">
                <motion.button
                    layout
                    key="suggestion-pill"
                    style={{ willChange: "transform, opacity, filter", transform: "translateZ(0)" }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{
                        opacity: 1,
                        y: [0, -5, 0], // Floating effect
                        width: isMinimized ? "auto" : "auto"
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                        layout: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.5, ease: "easeInOut" },
                        y: {
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            repeatType: "loop"
                        }
                    }}
                    onClick={(e) => {
                        if (isMinimized) {
                            setIsMinimized(false);
                            e.stopPropagation();
                        } else {
                            onSelect(suggestions[currentIndex]);
                        }
                    }}
                    className={cn(
                        "pointer-events-auto flex items-center gap-2 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 rounded-full shadow-lg group transition-all",
                        isMinimized ? "p-2 hover:bg-white/10" : "px-4 py-2 hover:bg-white/10",
                        !isMinimized && colors.border
                    )}
                >
                    <div className={cn("p-1 rounded-full transition-colors shrink-0", colors.bg)}>
                        <Lightbulb className={cn("transition-transform", colors.icon, isMinimized ? "w-4 h-4" : "w-3.5 h-3.5 group-hover:scale-110")} />
                    </div>

                    <AnimatePresence mode="wait">
                        {!isMinimized && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2 overflow-hidden"
                            >
                                <motion.span
                                    key={currentIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={cn("font-light truncate max-w-[280px] md:max-w-none text-left whitespace-nowrap", colors.text)}
                                >
                                    {suggestions[currentIndex]}
                                </motion.span>
                                <Sparkles className="w-3 h-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isMinimized && (
                        <div
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMinimized(true);
                            }}
                            className="ml-1 p-1 rounded-full hover:bg-white/20 text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Minimizar sugestão"
                        >
                            <ChevronDown className="w-3 h-3" />
                        </div>
                    )}
                </motion.button>
            </AnimatePresence>
        </div>
    );
};
