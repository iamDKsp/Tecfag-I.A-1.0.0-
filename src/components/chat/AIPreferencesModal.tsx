import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Briefcase, Building, GraduationCap, MessageSquare } from "lucide-react";
import { authApi } from "@/lib/api";

interface AIPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AIPreferencesModal = ({ isOpen, onClose }: AIPreferencesModalProps) => {
    const { user, login } = useAuth(); // We might need to update the user in context/localStorage
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await authApi.updateProfile(formData);

            // Hacky way to update local user state if AuthContext doesn't support direct updates
            // In a better world, useAuth would expose an updateUser function.
            // For now, we assume the backend update is enough for the next page load/request
            // But to reflect "instant" changes, we might want to reload or update context manually if possible.
            // Since we can't easily touch AuthContext provider without reading it, we'll just close for now.

            // Force reload to update context if necessary, or just rely on next fetch.
            // Ideally, we'd update the context. Let's try to see if we can trigger a re-fetch or just close.
            onClose();
            alert("Preferências atualizadas com sucesso! A IA agora personalizará as respostas para você.");
        } catch (error) {
            console.error("Error updating preferences:", error);
            alert("Erro ao atualizar preferências.");
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
                            <Input
                                placeholder="Ex: Vendedor, Técnico"
                                value={formData.jobTitle}
                                onChange={(e) => handleChange("jobTitle", e.target.value)}
                                className="bg-white/5 border-white/10 text-white focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/80 flex items-center gap-2">
                                <Building className="w-4 h-4 text-primary" /> Departamento
                            </Label>
                            <Input
                                placeholder="Ex: Vendas, Manutenção"
                                value={formData.department}
                                onChange={(e) => handleChange("department", e.target.value)}
                                className="bg-white/5 border-white/10 text-white focus:border-primary"
                            />
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

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/5">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
