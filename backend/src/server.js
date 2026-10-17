import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import app from './app.js';
import { creditAllEmployees } from './services/leaveBalance.service.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HRMS API listening on http://localhost:${PORT}`);
});

async function runLeaveCredit(trigger) {
  try {
    const count = await creditAllEmployees();
    console.log(`[leave-credit] ${trigger}: credited ${count} employee(s)`);
  } catch (err) {
    console.error('[leave-credit] failed:', err.message);
  }
}

// 00:05 on the 1st of every month (company timezone)
cron.schedule('5 0 1 * *', () => runLeaveCredit('monthly job'), {
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
});

// Catch-up on start: credits anything missed while the server was down. Idempotent.
runLeaveCredit('startup catch-up');
