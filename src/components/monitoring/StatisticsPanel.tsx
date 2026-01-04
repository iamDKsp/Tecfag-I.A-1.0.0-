import { QuestionStatistics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, MessageSquare, TrendingUp, Users } from "lucide-react";

interface StatisticsPanelProps {
    statistics: QuestionStatistics;
}

const StatisticsPanel = ({ statistics }: StatisticsPanelProps) => {
    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Total de Perguntas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">{statistics.totalQuestions}</div>
                        <p className="text-sm text-muted-foreground mt-1">Perguntas feitas ao sistema</p>
                    </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Usuários Ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-blue-500">
                            {statistics.questionsByUser.length}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Usuários que fizeram perguntas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Most Asked Questions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Perguntas Mais Frequentes
                    </CardTitle>
                    <CardDescription>Top 10 perguntas mais feitas ao sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    {statistics.mostAskedQuestions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhuma pergunta registrada ainda</p>
                    ) : (
                        <div className="space-y-3">
                            {statistics.mostAskedQuestions.map((item, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium break-words">{item.question}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Perguntada {item.count} {item.count === 1 ? "vez" : "vezes"}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <div className="text-lg font-bold text-primary">{item.count}x</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Questions by User */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Perguntas por Usuário
                    </CardTitle>
                    <CardDescription>Quantidade de perguntas feitas por cada usuário</CardDescription>
                </CardHeader>
                <CardContent>
                    {statistics.questionsByUser.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhuma pergunta registrada ainda</p>
                    ) : (
                        <div className="space-y-2">
                            {statistics.questionsByUser.map((item) => (
                                <div key={item.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="font-medium">{item.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-3">
                                            <div className="text-lg font-bold text-primary">{item.count}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.count === 1 ? "pergunta" : "perguntas"}
                                            </div>
                                        </div>
                                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min((item.count / statistics.totalQuestions) * 100, 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StatisticsPanel;
