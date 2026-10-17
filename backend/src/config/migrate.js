/**
 * Applies pending schema changes to an EXISTING database (keeps all your data).
 * Usage: npm run db:migrate
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { runMigrations } from './migrations.js';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrms_db',
  multipleStatements: true,
  dateStrings: true,
});

try {
  await runMigrations(connection);
  console.log('Migration complete.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await connection.end();
}
