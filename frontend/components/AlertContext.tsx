'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Alert {
    id: string;
    message: string;
    type: "default" | "success" | "accent" | "danger" | "warning" | undefined;
    duration: number;
}

interface AlertContextValue {
    alerts: Alert[];
    showAlert: (message: string, type: Alert["type"], duration?: number) => string;
    removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within AlertProvider');
    }
    return context;
};

interface AlertProviderProps {
    children: React.ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const removeAlert = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, []);

    const showAlert = useCallback((message: string, type: Alert["type"], duration: number = 3000) => {
        const id = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const alert: Alert = { id, message, type, duration };

        setAlerts((prev) => [...prev, alert]);

        if (duration > 0) {
            setTimeout(() => {
                removeAlert(id);
            }, duration);
        }

        return id;
    }, [removeAlert]);

    return (
        <AlertContext.Provider value={{ alerts, showAlert, removeAlert }}>
            {children}
        </AlertContext.Provider>
    );
};

