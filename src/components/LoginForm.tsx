import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const LoginForm = () => {
    const { login, register, isLoading: authLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao processar");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-md animate-slide-up" style={{
            animationDelay: "0.1s"
        }}>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
                <span className="text-sm font-medium tracking-widest text-foreground/90">
                    SEU ASSISTENTE <span className="text-primary">TECFAG</span>
                </span>
            </div>

            {/* Header */}
            <div className="mb-8">
                <p className="text-xs tracking-[0.2em] text-muted-foreground mb-2 uppercase">
                    Bem-vindo de volta
                </p>
                <h1 className="text-4xl font-bold text-foreground mb-3">
                    {isLogin ? "Acesse sua conta" : "Criar Conta"}
                </h1>
                <p className="text-muted-foreground">
                    {isLogin
                        ? "Use as credenciais fornecidas para continuar."
                        : "Preencha os dados abaixo para criar sua conta."}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Input - Only for Register */}
                {!isLogin && (
                    <div className="relative group">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="login-input pl-12"
                            required={!isLogin}
                        />
                    </div>
                )}

                {/* Email Input */}
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input pl-12"
                        required
                    />
                </div>

                {/* Password Input */}
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input pl-12 pr-12"
                        required
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                {/* Remember & Forgot - Only for Login */}
                {isLogin && (
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${rememberMe ? "bg-primary border-primary" : "border-muted-foreground/50 group-hover:border-muted-foreground"}`}>
                                    {rememberMe && (
                                        <svg className="w-full h-full p-0.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                Lembrar-me
                            </span>
                        </label>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                alert("Por favor, entre em contato com a equipe de Tecnologia da Informação (T.I.) para solicitar a redefinição de sua senha.");
                            }}
                            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="text-destructive text-sm text-center p-2 bg-destructive/10 rounded">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button type="submit" className="btn-primary mt-6" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    ) : isLogin ? (
                        <LogIn className="w-4 h-4 inline-block mr-2" />
                    ) : (
                        <UserPlus className="w-4 h-4 inline-block mr-2" />
                    )}
                    {isLogin ? "Entrar" : "Criar Conta"}
                </button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-6 text-center">
                {isLogin ? (
                    <span className="text-sm text-muted-foreground cursor-default">
                        É um prazer te ver aqui <span className="text-red-500 font-medium">novamente</span>
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        Já tem conta? Entrar
                    </button>
                )}
            </div>

            {/* Test credentials hint - Only for Login */}
            {isLogin && (
                <div className="mt-6 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Credenciais de teste:</p>
                    <p>Admin: admin@tecia.com / admin123</p>
                    <p>User: user@tecia.com / user123</p>
                </div>
            )}
        </div>
    );
};

export default LoginForm;
