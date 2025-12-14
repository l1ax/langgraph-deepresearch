'use client';

import React from 'react';
import { Alert, CloseButton } from '@heroui/react';
import { useAlert } from './AlertContext';

export const AlertContainer: React.FC = () => {
    const { alerts, removeAlert } = useAlert();

    if (alerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {alerts.map((alert) => (
                <Alert key={alert.id} status={alert.type}>
                    <Alert.Indicator />
                    <Alert.Content>
                        <Alert.Title>{alert.message}</Alert.Title>
                    </Alert.Content>
                    <CloseButton onClick={() => removeAlert(alert.id)} />
                </Alert>
            ))}
        </div>
    );
};

