const WebSocket = require('ws');

let wss = null;

// Initialize WebSocket Server
function initWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket client connected');

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connected successfully' }));
  });

  console.log('✅ WebSocket Server initialized');
  return wss;
}

// Broadcast to all connected clients
function broadcastToClients(data) {
  if (!wss) {
    console.warn('⚠️ WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify(data);
  let sentCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });

  console.log(`📡 Broadcasted to ${sentCount} client(s):`, data.type);
}

// Notify about new alert
function notifyNewAlert(alertsCount) {
  broadcastToClients({
    type: 'NEW_ALERT',
    count: alertsCount,
    timestamp: new Date().toISOString()
  });
}

// Notify about acknowledged alert
function notifyAlertAcknowledged(alertsCount) {
  broadcastToClients({
    type: 'ALERT_ACKNOWLEDGED',
    count: alertsCount,
    timestamp: new Date().toISOString()
  });
}

// Get active alerts count from database
async function getActiveAlertsCount(pool) {
  try {
    const result = await pool.request()
      .query('SELECT COUNT(*) AS count FROM Alerts WHERE alertAck = 0');
    return result.recordset[0].count;
  } catch (err) {
    console.error('❌ Error getting alerts count:', err.message);
    return 0;
  }
}

module.exports = {
  initWebSocketServer,
  notifyNewAlert,
  notifyAlertAcknowledged,
  getActiveAlertsCount
};
