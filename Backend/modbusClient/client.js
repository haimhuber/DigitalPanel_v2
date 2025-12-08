const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

let connected = false;

async function connect() {
  try {
    await client.connectTCP("192.168.1.52", { port: 502 });
    client.setID(1);
    connected = true;
    console.log("✅ Connected to Modbus server");
    return true;
  } catch (err) {
    console.log("❌ Connection failed:", err.message);
    connected = false;
    return false;
  }
}

async function readRegisters(start) {
  if (!connected) {
    console.log("⚠️ Not connected — skipping read");
    return null;
  }

  try {
    const result = await client.readHoldingRegisters(start, 15);
    return result.data;
  } catch (err) {
    console.log("⚠️ Read error:", err.message);
    connected = false; // נחשב מנותק
    return null;
  }
}

function isConnected() {
  return connected;
}

module.exports = { connect, readRegisters, isConnected };
