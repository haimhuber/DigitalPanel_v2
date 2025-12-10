// Scheduled job to run daily summary SP at midnight
const cron = require('node-cron');
const axios = require('axios');

// Adjust the URL if your backend runs on a different port or path
const SUMMARY_URL = 'http://localhost:5500/api/screens/summarize-daily-consumption';

// רץ כל יום ב-00:00
cron.schedule('0 0 * * *', async () => {
  try {
    const today = new Date();
    const targetDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const res = await axios.post(SUMMARY_URL, { targetDate });
    console.log(`[DailySummary] Success for ${targetDate}:`, res.data.message);
  } catch (err) {
    console.error('[DailySummary] Error:', err.message);
  }
});

console.log('Daily summary cron job scheduled for 00:00 every day.');
