/**
 * Initializes the database: runs schema.sql, seed.sql, then creates
 * a default admin user (idempotent) with a properly bcrypt-hashed password.
 *
 * Usage: npm run db:init
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { runMigrations } from './migrations.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', '..', 'sql');

async function runSqlFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // mysql2 supports multiple statements when multipleStatements: true
  await connection.query(sql);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  console.log('Running schema.sql ...');
  await runSqlFile(connection, path.join(sqlDir, 'schema.sql'));

  console.log('Running seed.sql ...');
  await connection.query(`USE ${process.env.DB_NAME || 'hrms_db'};`);
  await runSqlFile(connection, path.join(sqlDir, 'seed.sql'));

  console.log('Running migrations ...');
  await runMigrations(connection);

  console.log('Creating default admin user ...');
  const adminEmail = 'admin@hrms.com';
  const adminPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const [existing] = await connection.query(
    'SELECT id FROM users WHERE email = ?',
    [adminEmail]
  );

  if (existing.length === 0) {
    await connection.query(
      'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, (SELECT id FROM roles WHERE name = "admin"))',
      [adminEmail, passwordHash]
    );
    console.log(`Default admin created -> email: ${adminEmail}  password: ${adminPassword}`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  await connection.end();
  console.log('Database initialization complete.');
}

main().catch((err) => {
  console.error('DB init failed:', err);
  process.exit(1);
});
