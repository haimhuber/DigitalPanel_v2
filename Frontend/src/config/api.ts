// API Configuration
// Automatically detects server IP dynamically

// Default fallback IP (used during initial load)
let cachedServerUrl = 'http://localhost:5500';

// Function to fetch server IP dynamically from the server
export const initializeServerUrl = async (): Promise<string> => {
    try {
        // Try to get server IP from the server itself
        const response = await fetch('http://localhost:5500/api/server-ip');
        const data = await response.json();
        if (data.status === 200 && data.ip) {
            cachedServerUrl = `http://${data.ip}:${data.port || 5500}`;
        }
    } catch (error) {
        // Silently use fallback URL
        console.log('Using localhost fallback');
    }
    return cachedServerUrl;
};

// Get current server URL (call initializeServerUrl first in App.tsx)
export const getServerUrl = () => cachedServerUrl;

export const API_BASE_URL = cachedServerUrl;

// API Endpoints
export const API_ENDPOINTS = {
    breakersMainData: `${API_BASE_URL}/api/breakersMainData`,
    breakersNames: `${API_BASE_URL}/api/breakersNames`,
    breakersPositions: `${API_BASE_URL}/api/breakerspositions`,
    batchActivePower: `${API_BASE_URL}/api/batchActivePower`,
    batchActiveEnergy: `${API_BASE_URL}/api/batchActiveEnergy`,
    email: `${API_BASE_URL}/api/email`,
    activePower: (switchId: number) => `${API_BASE_URL}/api/activePower/${switchId}`,
    activeEnergy: (switchId: number) => `${API_BASE_URL}/api/activeEnergy/${switchId}`,
    alerts: `${API_BASE_URL}/api/alerts`,
    ackData: `${API_BASE_URL}/api/ack-data`,
    ackBy: `${API_BASE_URL}/api/ack-by`,
    ack: `${API_BASE_URL}/api/ack`,
    consumption: (switchId: string, start: string, end: string) =>
        `${API_BASE_URL}/api/consumption-billing/${switchId}?start=${start}&end=${end}`,
    tariffRates: `${API_BASE_URL}/api/tariff-rates`,
    efficiencySettings: `${API_BASE_URL}/api/efficiency-settings`,
    breakerInfo: `${API_BASE_URL}/api/breaker-info`,
    resetPassword: `${API_BASE_URL}/api/reset-password`,
    forgotPassword: `${API_BASE_URL}/api/forgot-password`,
    users: `${API_BASE_URL}/api/users`,
    deleteUser: (userId: number) => `${API_BASE_URL}/api/users/${userId}`,
    audit: `${API_BASE_URL}/api/audit`,
    addUser: `${API_BASE_URL}/api/adduser`,
    login: `${API_BASE_URL}/api/login`,
    report: `${API_BASE_URL}/api/report`,
};
