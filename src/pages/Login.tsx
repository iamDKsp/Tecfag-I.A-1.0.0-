import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import LoginInfoPanel from "@/components/LoginInfoPanel";

const Login = () => {
    const { isLoading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex overflow-hidden">
            {/* Background Pattern */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(0_72%_51%_/_0.05),_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,_hsl(0_72%_51%_/_0.08),_transparent_40%)]" />

                {/* Animated Floating Orbs */}
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[120px] animate-orb-1" />
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[150px] animate-orb-2" />
                <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/6 rounded-full blur-[100px] animate-orb-3" />

                {/* Floating Particles */}
                <div className="absolute top-[10%] left-[15%] w-2 h-2 bg-primary/40 rounded-full animate-particle-1" />
                <div className="absolute top-[20%] right-[20%] w-1.5 h-1.5 bg-primary/30 rounded-full animate-particle-2" />
                <div className="absolute top-[60%] left-[10%] w-1 h-1 bg-primary/50 rounded-full animate-particle-3" />
                <div className="absolute top-[70%] right-[15%] w-2 h-2 bg-primary/25 rounded-full animate-particle-4" />
                <div className="absolute top-[40%] left-[5%] w-1.5 h-1.5 bg-primary/35 rounded-full animate-particle-5" />
                <div className="absolute top-[80%] left-[30%] w-1 h-1 bg-primary/45 rounded-full animate-particle-6" />
                <div className="absolute top-[15%] right-[40%] w-2 h-2 bg-primary/20 rounded-full animate-particle-7" />
                <div className="absolute top-[50%] right-[5%] w-1.5 h-1.5 bg-primary/30 rounded-full animate-particle-8" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_100%_/_0.02)_1px,_transparent_1px),_linear-gradient(90deg,_hsl(0_0%_100%_/_0.02)_1px,_transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,_black_20%,_transparent_70%)]" />
            </div>

            {/* Left Panel - Login Form */}
            <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
                <div className="absolute inset-0 bg-card/30 backdrop-blur-xl border-r border-border/50" />
                <div className="relative z-10 w-full max-w-md">
                    <LoginForm />
                </div>
            </div>

            {/* Right Panel - Info */}
            <div className="hidden lg:flex relative z-10 w-1/2 items-center justify-center">
                <LoginInfoPanel />
            </div>

            {/* Bottom Gradient Line */}
            <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
    );
};

export default Login;
