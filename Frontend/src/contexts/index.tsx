import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { AlertsProvider } from './AlertsContext';
import { TimeProvider } from './TimeContext';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <TimeProvider>
        <AlertsProvider>
          {children}
        </AlertsProvider>
      </TimeProvider>
    </AuthProvider>
  );
};

export { useAuth } from './AuthContext';
export { useAlerts } from './AlertsContext';
export { useTime } from './TimeContext';