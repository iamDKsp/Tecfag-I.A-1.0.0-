import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, Save, X, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface User {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    createdAt: string;
    updatedAt: string;
    mustChangePassword?: boolean;
}

interface UserFormData {
    name: string;
    email: string;
    password: string;
    role: "USER" | "ADMIN";
    mustChangePassword: boolean;
}

const UsersTab = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        name: "",
        email: "",
        password: "",
        role: "USER",
        mustChangePassword: false,
    });
    const { token } = useAuth();
    const { toast } = useToast();

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            } else {
                toast({
                    title: "Erro",
                    description: "Erro ao carregar usuários",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({
                title: "Erro",
                description: "Erro ao conectar com o servidor",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            toast({
                title: "Erro",
                description: "Preencha todos os campos",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setUsers([data.user, ...users]);
                setIsDialogOpen(false);
                resetForm();
                toast({
                    title: "Sucesso",
                    description: "Usuário criado com sucesso",
                });
            } else {
                toast({
                    title: "Erro",
                    description: data.error || "Erro ao criar usuário",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error creating user:", error);
            toast({
                title: "Erro",
                description: "Erro ao conectar com o servidor",
                variant: "destructive",
            });
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser || !formData.name || !formData.email) {
            toast({
                title: "Erro",
                description: "Preencha todos os campos obrigatórios",
                variant: "destructive",
            });
            return;
        }

        try {
            const updateData: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                mustChangePassword: formData.mustChangePassword,
            };

            // Only include password if it was changed
            if (formData.password) {
                updateData.password = formData.password;
            }

            const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (response.ok) {
                setUsers(users.map((u) => (u.id === editingUser.id ? data.user : u)));
                setIsDialogOpen(false);
                setEditingUser(null);
                resetForm();
                toast({
                    title: "Sucesso",
                    description: "Usuário atualizado com sucesso",
                });
            } else {
                toast({
                    title: "Erro",
                    description: data.error || "Erro ao atualizar usuário",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast({
                title: "Erro",
                description: "Erro ao conectar com o servidor",
                variant: "destructive",
            });
        }
    };

    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

    const handleDeleteUser = async (userId: string) => {
        setDeleteUserId(userId);
    };

    const confirmDeleteUser = async () => {
        if (!deleteUserId) return;

        const userId = deleteUserId;
        setDeleteUserId(null);

        try {
            console.log("Deleting user:", userId);
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setUsers(users.filter((u) => u.id !== userId));
                toast({
                    title: "Sucesso",
                    description: "Usuário excluído com sucesso",
                });
            } else {
                console.error("Delete failed:", data);
                toast({
                    title: "Erro",
                    description: data.error || "Erro ao excluir usuário",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                title: "Erro",
                description: "Erro ao conectar com o servidor",
                variant: "destructive",
            });
        }
    };

    const openCreateDialog = () => {
        setEditingUser(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            mustChangePassword: user.mustChangePassword || false,
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            password: "",
            role: "USER",
            mustChangePassword: false,
        });
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingUser(null);
        resetForm();
    };

    const getRoleIcon = (role: string) => {
        return role === "ADMIN" ? Shield : UserIcon;
    };

    const getRoleText = (role: string) => {
        return role === "ADMIN" ? "Administrador" : "Operador";
    };

    const getRoleColor = (role: string) => {
        return role === "ADMIN"
            ? "bg-primary/20 text-primary border-primary/30"
            : "bg-blue-500/20 text-blue-400 border-blue-500/30";
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto scrollbar-thin p-4">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            Gerenciamento de Usuários
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Novo Usuário
                    </Button>
                </div>

                {/* User Cards */}
                {users.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium mb-2">Nenhum usuário cadastrado</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Clique em "Novo Usuário" para começar
                        </p>
                    </div>
                ) : (
                    users.map((user, index) => {
                        const RoleIcon = getRoleIcon(user.role);
                        return (
                            <div
                                key={user.id}
                                className="glass-card p-4 animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <RoleIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                            <h3 className="text-lg font-semibold truncate">{user.name}</h3>
                                            <span
                                                className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full border",
                                                    getRoleColor(user.role)
                                                )}
                                            >
                                                {getRoleText(user.role)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate mb-1">
                                            {user.email}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Criado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEditDialog(user)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingUser ? "Editar Usuário" : "Novo Usuário"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingUser
                                    ? "Atualize as informações do usuário"
                                    : "Preencha os dados para criar um novo usuário"}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <Input
                                    placeholder="Nome completo"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    placeholder="email@exemplo.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Senha {editingUser && "(deixe vazio para não alterar)"}
                                </label>
                                <Input
                                    type="password"
                                    placeholder={editingUser ? "Nova senha (opcional)" : "Senha"}
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Permissão</label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: "USER" | "ADMIN") =>
                                        setFormData({ ...formData, role: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">Operador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="mustChangePassword"
                                    checked={formData.mustChangePassword}
                                    onChange={(e) => setFormData({ ...formData, mustChangePassword: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label
                                    htmlFor="mustChangePassword"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Alterar senha no próximo login
                                </label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleDialogClose}>
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {editingUser ? "Salvar" : "Criar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário e todos os seus dados associados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default UsersTab;
