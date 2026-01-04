import { motion, AnimatePresence } from "framer-motion";
import { Settings, MessageSquare, Table, List, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type ChatFunction = "normal" | "table" | "list";

interface ChatFunctionSelectorProps {
    currentFunction: ChatFunction;
    onFunctionChange: (func: ChatFunction) => void;
}

const functions: { id: ChatFunction; label: string; icon: any; color: string; description: string }[] = [
    {
        id: "normal",
        label: "Normal",
        icon: MessageSquare,
        color: "text-blue-400",
        description: "Conversa padrão"
    },
    {
        id: "table",
        label: "Tabela",
        icon: Table,
        color: "text-purple-400",
        description: "Gera dados em tabelas"
    },
    {
        id: "list",
        label: "Lista",
        icon: List,
        color: "text-orange-400",
        description: "Organiza em tópicos"
    },
];

export const ChatFunctionSelector = ({ currentFunction, onFunctionChange }: ChatFunctionSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentFuncData = functions.find((f) => f.id === currentFunction) || functions[0];

    return (
        <div className="relative" ref={containerRef}>
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300",
                    "bg-white/5 hover:bg-white/10",
                    isOpen ? "border-white/20" : "border-transparent"
                )}
            >
                <div className={cn("p-1.5 rounded-full bg-white/5", currentFuncData.color)}>
                    <currentFuncData.icon className="w-4 h-4" />
                </div>
                <span className={cn("text-sm font-medium hidden md:block", currentFuncData.color)}>
                    {currentFuncData.label}
                </span>
                <Settings className={cn("w-4 h-4 ml-1 opacity-50 transition-transform duration-300", isOpen && "rotate-180")} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full mb-3 right-0 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                    >
                        <div className="p-3 space-y-1">
                            <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">
                                Formato de Resposta
                            </div>
                            {functions.map((func) => (
                                <motion.button
                                    key={func.id}
                                    onClick={() => {
                                        onFunctionChange(func.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all",
                                        currentFunction === func.id ? "bg-white/10" : "hover:bg-white/5"
                                    )}
                                    whileHover={{ x: 4 }}
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        currentFunction === func.id ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10",
                                        func.color
                                    )}>
                                        <func.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className={cn("text-sm font-medium flex items-center justify-between", func.color)}>
                                            {func.label}
                                            {currentFunction === func.id && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    <Check className="w-3 h-3" />
                                                </motion.div>
                                            )}
                                        </div>
                                        <div className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                                            {func.description}
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
