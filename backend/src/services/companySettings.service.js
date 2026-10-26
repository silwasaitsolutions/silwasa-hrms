import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { getBrandingDir, detectImageType } from '../utils/upload.js';

const COLUMN_BY_KIND = { logo: 'logo_file', signature: 'signature_file' };

export async function getSettingsRow(conn = pool) {
  const [rows] = await conn.query('SELECT * FROM company_settings WHERE id = 1');
  if (!rows[0]) throw new ApiError(500, 'Company settings are missing. Run npm run db:migrate.');
  return rows[0];
}

// What the admin UI sees: never the stored file names.
export async function getSettings() {
  const s = await getSettingsRow();
  const { logo_file, signature_file, templates_seeded, ...rest } = s;
  return { ...rest, has_logo: !!logo_file, has_signature: !!signature_file };
}

export async function updateSettings(updates) {
  const map = {
    companyName: 'company_name', address: 'address', phone: 'phone', email: 'email', website: 'website',
    registrationNo: 'registration_no', footerText: 'footer_text', signatoryName: 'signatory_name',
    signatoryDesignation: 'signatory_designation', currencySymbol: 'currency_symbol', currencyWord: 'currency_word',
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${column} = ?`);
      params.push(updates[key] === '' ? null : updates[key]);
    }
  }
  if (sets.length) await pool.query(`UPDATE company_settings SET ${sets.join(', ')} WHERE id = 1`, params);
  return getSettings();
}

export async function setAsset(kind, file) {
  const column = COLUMN_BY_KIND[kind];
  if (!column) throw new ApiError(400, 'Unknown image type');
  if (!file) throw new ApiError(400, 'No image uploaded');
  const type = detectImageType(file.buffer);
  if (!type) throw new ApiError(400, 'Only PNG or JPEG images are allowed');

  const dir = getBrandingDir();
  await fs.mkdir(dir, { recursive: true });
  const stored = `${kind}-${crypto.randomUUID()}.${type}`;
  await fs.writeFile(path.join(dir, stored), file.buffer);

  const old = (await getSettingsRow())[column];
  await pool.query(`UPDATE company_settings SET ${column} = ? WHERE id = 1`, [stored]);
  if (old) await fs.rm(path.join(dir, old), { force: true });
  return getSettings();
}

export async function removeAsset(kind) {
  const column = COLUMN_BY_KIND[kind];
  if (!column) throw new ApiError(400, 'Unknown image type');
  const old = (await getSettingsRow())[column];
  await pool.query(`UPDATE company_settings SET ${column} = NULL WHERE id = 1`);
  if (old) await fs.rm(path.join(getBrandingDir(), old), { force: true });
  return getSettings();
}

export async function getAssetPath(kind) {
  const column = COLUMN_BY_KIND[kind];
  if (!column) throw new ApiError(400, 'Unknown image type');
  const file = (await getSettingsRow())[column];
  if (!file) throw new ApiError(404, 'Image not set');
  return path.join(getBrandingDir(), file);
}

// Used by the PDF renderer: data URI or null (never throws; a missing file just means no image).
export async function readAssetDataUri(settingsRow, kind) {
  const file = settingsRow[COLUMN_BY_KIND[kind]];
  if (!file) return null;
  try {
    const buf = await fs.readFile(path.join(getBrandingDir(), file));
    const type = detectImageType(buf);
    if (!type) return null;
    return `data:image/${type === 'jpg' ? 'jpeg' : 'png'};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}
