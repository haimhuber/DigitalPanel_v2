// API Configuration
// Automatically detects server IP dynamically

// Default fallback IP (used during initial load)
// let cachedServerUrl = 'http://192.168.1.148:5500';
const cachedServerUrl = `${window.location.protocol}//${window.location.hostname}:5500`;


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
