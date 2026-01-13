import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useHeartbeat } from '@/hooks/useHeartbeat';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
    mustChangePassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAdmin: boolean;
    showWelcomeAnimation: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    hideWelcomeAnimation: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

    // Start heartbeat for online status tracking
    useHeartbeat(!!user);

    // Check for existing token on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        if (savedToken) {
            setToken(savedToken);
            fetchCurrentUser(savedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchCurrentUser = async (authToken: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                // Token invalid, clear it
                localStorage.removeItem('auth_token');
                setToken(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            localStorage.removeItem('auth_token');
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = useCallback(async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowWelcomeAnimation(true);
    }, []);

    const register = useCallback(async (email: string, password: string, name: string) => {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao criar conta');
        }

        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowWelcomeAnimation(true);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setShowWelcomeAnimation(false);
    }, []);

    const hideWelcomeAnimation = useCallback(() => {
        setShowWelcomeAnimation(false);
    }, []);

    const refreshUser = useCallback(async () => {
        if (token) {
            await fetchCurrentUser(token);
        }
    }, [token]);

    const value = {
        user,
        token,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        showWelcomeAnimation,
        login,
        register,
        logout,
        hideWelcomeAnimation,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
