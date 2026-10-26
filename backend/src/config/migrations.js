import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { creditEmployee } from '../services/leaveBalance.service.js';
import { STARTER_TEMPLATES } from './starterTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', '..', 'sql', 'migrations');

// Applies all migrations to the currently selected database. Safe to run repeatedly.
// `connection` must be a mysql2/promise connection with multipleStatements enabled.
export async function runMigrations(connection) {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`Applying migration ${file} ...`);
    await connection.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  }

  // leave_types.uses_balance: which leave types draw from the shared monthly balance.
  const [cols] = await connection.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leave_types' AND COLUMN_NAME = 'uses_balance'`
  );
  if (cols[0].c === 0) {
    await connection.query('ALTER TABLE leave_types ADD COLUMN uses_balance BOOLEAN NOT NULL DEFAULT TRUE');
    await connection.query("UPDATE leave_types SET uses_balance = FALSE WHERE name = 'Unpaid Leave'");
    console.log('Added leave_types.uses_balance (Unpaid Leave excluded from balance).');
  }
  // Keep Unpaid Leave excluded even if the seed insert recreated it.
  await connection.query("UPDATE leave_types SET uses_balance = FALSE WHERE name = 'Unpaid Leave'");

  // Give every existing employee a balance row, credited for the current month.
  const [employees] = await connection.query(
    "SELECT id FROM employees WHERE employment_status IN ('active', 'on_leave')"
  );
  for (const { id } of employees) {
    await connection.beginTransaction();
    try {
      await creditEmployee(connection, id);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  }

  // Starter HR letter templates: created once (the flag stops them coming back if you delete them).
  const [settings] = await connection.query('SELECT templates_seeded FROM company_settings WHERE id = 1');
  if (settings[0] && !settings[0].templates_seeded) {
    await connection.beginTransaction();
    try {
      for (const t of STARTER_TEMPLATES) {
        await connection.query(
          `INSERT INTO document_templates (name, category, reference_prefix, body_html, show_signature)
           VALUES (?, ?, ?, ?, ?)`,
          [t.name, t.category, t.prefix, t.body, t.showSignature]
        );
      }
      await connection.query(
        "UPDATE company_settings SET templates_seeded = TRUE, currency_symbol = IF(currency_symbol = 'Rs.', ?, currency_symbol) WHERE id = 1",
        ['₹']
      );
      await connection.commit();
      console.log(`Created ${STARTER_TEMPLATES.length} starter HR document templates.`);
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  }
}
