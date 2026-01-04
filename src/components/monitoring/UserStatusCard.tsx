import { UserStatus } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Circle, Mail, Shield, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserStatusCardProps {
    user: UserStatus;
}

const UserStatusCard = ({ user }: UserStatusCardProps) => {
    return (
        <Card className={`transition-all hover:shadow-lg ${user.isOnline ? "border-green-500/30" : "border-border"
            }`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{user.name}</CardTitle>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                            <Circle
                                className={`w-2.5 h-2.5 fill-current ${user.isOnline ? "text-green-500" : "text-gray-400"
                                    }`}
                            />
                            <span className={`text-xs font-medium ${user.isOnline ? "text-green-500" : "text-gray-400"
                                }`}>
                                {user.isOnline ? "Online" : "Offline"}
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Permissão:</span>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role === "ADMIN" ? "Administrador" : "Operador"}
                    </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Última atividade:</span>
                    <span className="font-medium">
                        {formatDistanceToNow(new Date(user.lastActive), {
                            addSuffix: true,
                            locale: ptBR,
                        })}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export default UserStatusCard;
