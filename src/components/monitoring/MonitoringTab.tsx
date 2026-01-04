import { useState, useEffect } from "react";
import { monitoringApi, UserStatus, UserArchivedChatsGroup, QuestionStatistics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, BarChart3, MessageSquare, Users } from "lucide-react";
import UserStatusCard from "./UserStatusCard";
import UserArchivedChats from "./UserArchivedChats";
import StatisticsPanel from "./StatisticsPanel";

const MonitoringTab = () => {
    const [users, setUsers] = useState<UserStatus[]>([]);
    const [archivedChatsGroups, setArchivedChatsGroups] = useState<UserArchivedChatsGroup[]>([]);
    const [statistics, setStatistics] = useState<QuestionStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<"users" | "chats" | "stats">("users");

    useEffect(() => {
        loadData();
        // Refresh data every 10 seconds for real-time updates
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [usersData, chatsData, statsData] = await Promise.all([
                monitoringApi.getUsersStatus(),
                monitoringApi.getArchivedChatsByUser(),
                monitoringApi.getStatistics(),
            ]);

            setUsers(usersData.users);
            setArchivedChatsGroups(chatsData.groups);
            setStatistics(statsData);
        } catch (error) {
            console.error("Error loading monitoring data:", error);
        } finally {
            setLoading(false);
        }
    };

    const onlineCount = users.filter(u => u.isOnline).length;
    const offlineCount = users.filter(u => u.isOnline === false).length;

    return (
        <div className="h-full overflow-auto bg-background scrollbar-thin">
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="w-8 h-8 text-primary" />
                        Monitoramento
                    </h1>
                    <p className="text-muted-foreground">
                        Visualize o status dos usuários, chats arquivados e estatísticas do sistema
                    </p>
                </div>

                {/* Section Tabs */}
                <div className="flex gap-2 border-b border-border pb-2">
                    <button
                        onClick={() => setActiveSection("users")}
                        className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${activeSection === "users"
                            ? "bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Usuários ({users.length})
                    </button>
                    <button
                        onClick={() => setActiveSection("chats")}
                        className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${activeSection === "chats"
                            ? "bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chats Arquivados
                    </button>
                    <button
                        onClick={() => setActiveSection("stats")}
                        className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${activeSection === "stats"
                            ? "bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Estatísticas
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : (
                    <>
                        {/* Users Section */}
                        {activeSection === "users" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="border-green-500/20 bg-green-500/5">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg text-green-500">Online</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-green-500">{onlineCount}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-gray-500/20 bg-gray-500/5">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg text-gray-500">Offline</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-gray-500">{offlineCount}</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {users.map((user) => (
                                        <UserStatusCard key={user.id} user={user} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Archived Chats Section */}
                        {activeSection === "chats" && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Chats Arquivados por Usuário</CardTitle>
                                        <CardDescription>
                                            Visualize todos os chats arquivados organizados por usuário
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {archivedChatsGroups.filter(g => g.archives.length > 0).length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">
                                                Nenhum chat arquivado encontrado
                                            </p>
                                        ) : (
                                            archivedChatsGroups
                                                .filter(g => g.archives.length > 0)
                                                .map((group) => (
                                                    <UserArchivedChats key={group.userId} group={group} />
                                                ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Statistics Section */}
                        {activeSection === "stats" && statistics && (
                            <StatisticsPanel statistics={statistics} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MonitoringTab;
