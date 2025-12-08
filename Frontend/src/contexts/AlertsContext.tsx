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
      console.log('🔄 Fetching alerts...');
      const response = await getAlerts();
      console.log('📦 getAlerts() response:', response);
      const data = response?.data;
      console.log('📋 Alerts data:', data);

      if (Array.isArray(data)) {
        console.log(`📊 Total alerts in array: ${data.length}`);
        for (let index = 0; index < data.length; index++) {
          const alert = data[index];
          console.log(`  Alert ${index}:`, alert);
          console.log(`    alertAck value:`, alert.alertAck, `(type: ${typeof alert.alertAck})`);
          
          // alertAck is boolean: false = active, true = acknowledged
          if (alert.alertAck === false || alert.alertAck === 0) {
            ++alertCounter;
            console.log(`    ✅ Active alert found! Count: ${alertCounter}`);
          } else {
            console.log(`    ⏭️  Acknowledged alert (alertAck = ${alert.alertAck}), skipping`);
          }
        }
      } else {
        console.log('⚠️ Data is not an array:', typeof data, data);
      }
      console.log(`🎯 Final alerts count: ${alertCounter}`);
      setAlertsNumber(alertCounter);
    } catch (err) {
      console.error('❌ Error fetching alerts:', err);
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