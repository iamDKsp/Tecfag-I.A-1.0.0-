import { useState, useEffect } from "react";
import { Briefcase, Building, GraduationCap, MessageSquare, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface AIPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AIPreferencesModal = ({ isOpen, onClose }: AIPreferencesModalProps) => {
    const { user, login, refreshUser } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Local state for form
    const [formData, setFormData] = useState({
        jobTitle: (user as any)?.jobTitle || "",
        department: (user as any)?.department || "",
        technicalLevel: (user as any)?.technicalLevel || "",
        communicationStyle: (user as any)?.communicationStyle || "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Update form data when user context changes or modal opens
    // This ensures that after a refresh (where user might be null initially then loaded), 
    // the form reflects the actual user data.
    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                jobTitle: (user as any)?.jobTitle || "",
                department: (user as any)?.department || "",
                technicalLevel: (user as any)?.technicalLevel || "",
                communicationStyle: (user as any)?.communicationStyle || "",
            });
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await authApi.updateProfile(formData);

            // Atualiza o contexto do usuário para refletir as mudanças imediatamente
            await refreshUser();

            onClose();
            toast({
                title: "Preferências salvas!",
                description: "A IA agora personalizará as respostas para você.",
                className: "bg-green-600 text-white border-none"
            });
        } catch (error) {
            console.error("Error updating preferences:", error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível atualizar as preferências.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async () => {
        setIsLoading(true);
        try {
            const emptyData = {
                jobTitle: "",
                department: "",
                technicalLevel: "",
                communicationStyle: ""
            };

            await authApi.updateProfile(emptyData);
            await refreshUser();

            setFormData(emptyData);

            toast.success("Preferências resetadas.", {
                description: "As configurações foram limpas."
            });
        } catch (error) {
            console.error("Error resetting preferences:", error);
            toast.error("Erro ao resetar preferências.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#1a1a1a] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Briefcase className="w-4 h-4" />
                        </span>
                        Preferências do Robô
                    </DialogTitle>
                    <p className="text-sm text-white/60">
                        Personalize como a Tec I.A. deve interagir com você. Estas informações ajudam a IA a ser mais assertiva.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-white/80 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary" /> Cargo
                            </Label>
                            <Select
                                value={formData.jobTitle}
                                onValueChange={(val) => handleChange("jobTitle", val)}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Selecione seu cargo..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                    <SelectItem value="Vendedor">Vendedor</SelectItem>
                                    <SelectItem value="Técnico">Técnico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/80 flex items-center gap-2">
                                <Building className="w-4 h-4 text-primary" /> Setor
                            </Label>
                            <Select
                                value={formData.department}
                                onValueChange={(val) => handleChange("department", val)}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Selecione seu setor..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                    <SelectItem value="Comercial">Comercial</SelectItem>
                                    <SelectItem value="Assistência">Assistência</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white/80 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary" /> Nível de Conhecimento Técnico
                        </Label>
                        <Select
                            value={formData.technicalLevel}
                            onValueChange={(val) => handleChange("technicalLevel", val)}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Selecione seu nível..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                <SelectItem value="Iniciante">Iniciante (Explique tudo detalhadamente)</SelectItem>
                                <SelectItem value="Intermediário">Intermediário (Conheço o básico)</SelectItem>
                                <SelectItem value="Avançado">Avançado (Vá direto ao ponto técnico)</SelectItem>
                                <SelectItem value="Especialista">Especialista (Fale tecnicamente sem rodeios)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white/80 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" /> Estilo de Resposta Preferido
                        </Label>
                        <Select
                            value={formData.communicationStyle}
                            onValueChange={(val) => handleChange("communicationStyle", val)}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Como você prefere as respostas?" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                <SelectItem value="Direto">Direto e Objetivo (Poucas palavras)</SelectItem>
                                <SelectItem value="Detalhado">Detalhado e Explicativo (Gosto de ler)</SelectItem>
                                <SelectItem value="Visual">Visual (Use listas, tópicos e tabelas)</SelectItem>
                                <SelectItem value="Vendedor">Focado em Vendas (Argumentos comerciais)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4 flex justify-between sm:justify-between">
                        <Button type="button" variant="ghost" onClick={handleReset} className="text-red-400 hover:text-red-300 hover:bg-red-900/20" disabled={isLoading}>
                            Resetar
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/5">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
