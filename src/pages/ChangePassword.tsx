import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, LogOut } from "lucide-react";

export default function ChangePassword() {
    const { token, logout, user } = useAuth();
    const { toast } = useToast();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: "Erro",
                description: "As senhas não coincidem",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Erro",
                description: "A senha deve ter no mínimo 6 caracteres",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newPassword: password }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Sucesso",
                    description: "Senha alterada com sucesso! Faça login novamente.",
                });
                logout();
            } else {
                toast({
                    title: "Erro",
                    description: data.error || "Erro ao alterar senha",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast({
                title: "Erro",
                description: "Erro ao conectar com o servidor",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 glass-card p-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Alteração de Senha Necessária</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Olá, {user?.name}. Por motivos de segurança, você precisa definir uma nova senha para continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nova Senha</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Confirmar Nova Senha</label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Alterando..." : "Alterar Senha"}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={logout}
                        disabled={isLoading}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair e tentar depois
                    </Button>
                </form>
            </div>
        </div>
    );
}
