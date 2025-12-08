const startModbusClient = require('./modbusClient/checkConnection');
const express = require('express');
const createDatabase = require('./database/createDatabase');
const { initWebSocketServer } = require('./websocketServer');
const app = express();
const bodyparser = require('body-parser');
const port = 5500;
const screenRouters = require('./routers/screens');
const myIp = require('./ipAddress/getPcIp');
const emailTest = require('./controller/email');
app.use(bodyparser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cors = require('cors');
const ips = myIp.getLocalIPs(); // returns array
host = myIp.getLocalIPs();


app.use(cors({ origin: true, credentials: true }));

// Root route for GET /
app.get('/', (req, res) => {
  res.status(200).send('API is running');
});

createDatabase.createDatabase();
startModbusClient.start();
app.use('/api', screenRouters);

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});

// Initialize WebSocket Server
initWebSocketServer(server);



