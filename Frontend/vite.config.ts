import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';

function getLocalIP(): string {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    const ifaceList = nets[name]; // can be undefined

    if (!ifaceList) continue; // <-- fix

    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  // fallback
  return '127.0.0.1';
}

const localIP = getLocalIP();

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: false,
    proxy: {
      '/api': {
        target: `http://${localIP}:5500`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
