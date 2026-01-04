import { Cog, MessageSquare, BarChart3 } from "lucide-react";
import RotatingText from "./RotatingText";

const LoginInfoPanel = () => {
    return (
        <div className="relative h-full flex flex-col justify-center p-8 lg:p-12 animate-slide-right" style={{
            animationDelay: "0.3s"
        }}>
            {/* Background Glow Effect */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-glow" />
                <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6">
                    <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                        <RotatingText />
                    </span>
                </div>

                {/* Title Section */}
                <p className="text-xs tracking-[0.2em] text-muted-foreground mb-2 uppercase">
                    Assistente Tecfag
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight my-[10px]">
                    Conecte-se, aprenda e<br />
                    pratique com seu time em um<br />
                    só lugar.
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm">
                    Chat inteligente, Catálogos instantâneos e insights para decisões rápidas e seguras.
                </p>

                {/* Feature Dots */}
                <div className="flex items-center gap-3 mb-10">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-muted" />
                        </div>
                    ))}
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse-grow" />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-1">
                            <Cog className="w-4 h-4 text-primary" />
                            <span className="text-2xl font-bold text-primary">+132</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Máquinas<br />Catalogadas
                        </p>
                    </div>
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <span className="text-2xl font-bold text-primary">99,9%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Conversões Com<br />Técnica Spiced
                        </p>
                    </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -right-4 top-20 animate-float" style={{
                    animationDelay: "0s"
                }}>
                    <div className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center glow-card">
                        <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                </div>
                <div className="absolute right-20 bottom-20 animate-float" style={{
                    animationDelay: "1s"
                }}>
                    <div className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center glow-card">
                        <Cog className="w-5 h-5 text-success" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginInfoPanel;
