import { useEffect, useState, useRef } from "react";

interface WelcomeAnimationProps {
    userName: string;
    onComplete: () => void;
}

const WelcomeAnimation = ({ userName, onComplete }: WelcomeAnimationProps) => {
    const [stage, setStage] = useState<'fade-in' | 'show-text' | 'fade-out'>('fade-in');
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        // Fase 1: Fade-in do overlay (500ms)
        const fadeInTimer = setTimeout(() => {
            setStage('show-text');
        }, 500);

        // Fase 2: Mostrar texto (2000ms adicional = 2500ms total)
        const showTextTimer = setTimeout(() => {
            setStage('fade-out');
        }, 3000); // Aumentei um pouco para garantir leitura

        // Fase 3: Fade-out e conclusão (1000ms adicional = 4000ms total)
        const fadeOutTimer = setTimeout(() => {
            onComplete();
        }, 4000);

        return () => {
            clearTimeout(fadeInTimer);
            clearTimeout(showTextTimer);
            clearTimeout(fadeOutTimer);
        };
    }, []); // Dependência vazia para rodar apenas na montagem inicial

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-transparent`}
        >
            {/* Overlay Background - Controlled separately */}
            <div
                className={`absolute inset-0 bg-background transition-opacity duration-700 ease-in-out
                    ${stage === 'fade-in' ? 'opacity-0' : ''}
                    ${stage === 'show-text' ? 'opacity-100' : ''}
                    ${stage === 'fade-out' ? 'opacity-0' : ''}
                `}
            >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(0_72%_51%_/_0.15),_transparent_50%)]" />
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px] animate-orb-1" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[150px] animate-orb-2" />
                </div>
            </div>

            {/* Welcome Text - Independent Transition State */}
            <div
                className={`relative z-10 text-center transition-all duration-1000 ease-out transform
                    ${stage === 'fade-in' ? 'opacity-0 scale-90 translate-y-8' : ''}
                    ${stage === 'show-text' ? 'opacity-100 scale-100 translate-y-0' : ''}
                    ${stage === 'fade-out' ? 'opacity-0 scale-110 -translate-y-8' : ''}
                `}
            >
                <div className="space-y-4">
                    <h1 className="text-5xl md:text-6xl font-bold text-foreground">
                        Seja bem-vindo
                    </h1>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
                        <p className="text-3xl md:text-4xl font-semibold text-gradient">
                            {userName}
                        </p>
                        <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeAnimation;
