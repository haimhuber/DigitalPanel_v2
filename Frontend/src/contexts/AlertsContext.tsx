import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const wsRef = useRef<WebSocket | null>(null);

  const refreshAlerts = async () => {
    let alertCounter = 0;
    try {
      const response = await getAlerts();
      const data = response?.data;

      if (Array.isArray(data)) {
        for (let index = 0; index < data.length; index++) {
          if (data[index].alertAck === 0) {
            ++alertCounter;
          }
        }
      }
      console.log('🔔 Active alerts count (from API):', alertCounter);
      setAlertsNumber(alertCounter);
    } catch (err) {
      console.error('❌ Error fetching alerts:', err);
      setAlertsNumber(0);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshAlerts();

    // Connect to WebSocket
    const connectWebSocket = () => {
      const wsUrl = 'ws://localhost:5500';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected to alerts server');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket message received:', data);

          if (data.type === 'NEW_ALERT' || data.type === 'ALERT_ACKNOWLEDGED') {
            console.log(`🔔 Updating alerts count to: ${data.count}`);
            setAlertsNumber(data.count);
          } else if (data.type === 'CONNECTED') {
            console.log('✅ WebSocket connection confirmed');
            // Don't update alertsNumber on CONNECTED message
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting in 3 seconds...');
        setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <AlertsContext.Provider value={{ alertsNumber, refreshAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
};