const modbus = require("./client");
const path = require('path');
const fs = require('fs');
const sqlDB = require('../database/myRepository');
const configPath = path.join(__dirname, '../config.json'); // go up one folder
const maxBreakers = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const SAMPLE_INTERVAL = 5000; // (use 900000 for 15 minutes)
const RETRY_INTERVAL = 5000;  // retry every 5 seconds
let writeToDbEvery1min = 0;
let interval = null;
let write
async function pollData() {
  console.log("📡 Polling data from breakers...");
  if (writeToDbEvery1min > 11) {
    write = true;
    writeToDbEvery1min = 0;

    // Clear LiveData table at the start of each minute (only once)
    console.log("🗑️ Clearing LiveData table...");
    await sqlDB.clearLiveData();
  } else {
    write = false;
    writeToDbEvery1min++;
  }
  for (let i = 0, reg = 0; i < maxBreakers.breakers.length; i++, reg += 50) {
    try {
      const data = await modbus.readRegisters(reg);
      if (!data) {
        console.log();
        console.log(`⚠️ Breaker ${i + 1}: no data`);
        continue;
      }
      console.log(`✅ Breaker ${i + 1}:`, data);

      // Always update LiveData
      const liveDataUpdate = await sqlDB.updateLiveData(data, i + 1);

      // Write to historical Switches table only every minute
      if (write) {
        const sendData = await sqlDB.writeBreakerData(data, i + 1);
        console.log("📤 DB response:", sendData);

        if (sendData.status === 200) {
          console.log("✅ Values sent successfully!");
        } else {
          console.log("⚠️ DB insert issue:", sendData.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error polling breaker ${i + 1}:`, error.message);
    }
  }
  console.log({ write: write, Counter: writeToDbEvery1min });
}

async function start() {
  const connected = await modbus.connect();
  if (connected) {
    console.log("✅ Connection established, starting polling...");
    // Clear any old interval before starting a new one
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    // Start sampling
    interval = setInterval(async () => {
      if (modbus.isConnected()) { // Return Connection status from clinet -> isConnected()
        await pollData();
      } else {
        console.log("🔌 Lost connection, stopping polling...");
        clearInterval(interval);
        interval = null;
        retryConnection();
      }
    }, SAMPLE_INTERVAL);
  } else {
    console.log("❌ Could not connect, retrying...");
    await retryConnection();
  }
}

async function retryConnection() {
  console.log("🔄 Attempting to reconnect...");

  const success = await modbus.connect();

  if (success) {
    console.log("🔁 Reconnected successfully! Resuming polling...");
    start(); // safe restart — old interval was cleared
  } else {
    console.log("⏳ Still offline, retrying in 5 seconds...");
    setTimeout(retryConnection, RETRY_INTERVAL);
  }
}

module.exports = { start, pollData };
