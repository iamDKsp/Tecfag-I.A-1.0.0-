import { useEffect } from 'react';
import { authApi } from '@/lib/api';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const useHeartbeat = (isAuthenticated: boolean) => {
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        // Send initial heartbeat
        authApi.heartbeat().catch(err => console.error('Heartbeat error:', err));

        // Set up interval to send heartbeat every 30 seconds
        const intervalId = setInterval(() => {
            authApi.heartbeat().catch(err => console.error('Heartbeat error:', err));
        }, HEARTBEAT_INTERVAL);

        // Cleanup on unmount or when authentication changes
        return () => {
            clearInterval(intervalId);
        };
    }, [isAuthenticated]);
};
