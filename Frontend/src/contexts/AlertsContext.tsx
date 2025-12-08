import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getAlerts } from '../Types/CombinedData';

interface AlertsContextType {
  alertsNumber: number;
  refreshAlerts: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};

interface AlertsProviderProps {
  children: ReactNode;
}

export const AlertsProvider: React.FC<AlertsProviderProps> = ({ children }) => {
  const [alertsNumber, setAlertsNumber] = useState(0);

  const refreshAlerts = async () => {
    let alertCounter = 0;
    try {
      const response = await getAlerts();
      const data = response?.data;

      if (Array.isArray(data)) {
        for (let index = 0; index < data.length; index++) {
          const alert = data[index];
          
          // alertAck is boolean: false = active, true = acknowledged
          if (alert.alertAck === false || alert.alertAck === 0) {
            ++alertCounter;
          }
        }
      }
      setAlertsNumber(alertCounter);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      // Don't reset to 0 on error, keep previous value
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshAlerts();

    // Poll every 5 seconds for new alerts
    const intervalId = setInterval(() => {
      refreshAlerts();
    }, 5000); // 5 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <AlertsContext.Provider value={{ alertsNumber, refreshAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
};