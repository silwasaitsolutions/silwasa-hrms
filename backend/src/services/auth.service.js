import crypto from 'crypto';
import pool from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function login(email, password) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.is_active, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?`,
    [email]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, hashToken(refreshToken), expiresAt]
  );

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function refresh(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const [rows] = await pool.query(
    'SELECT id, revoked, expires_at FROM refresh_tokens WHERE token_hash = ? AND user_id = ?',
    [tokenHash, decoded.id]
  );

  const stored = rows[0];
  if (!stored || stored.revoked || new Date(stored.expires_at) < new Date()) {
    throw new ApiError(401, 'Refresh token is no longer valid');
  }

  const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const accessToken = signAccessToken(payload);
  return { accessToken };
}

export async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [tokenHash]);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  const user = rows[0];
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

  const newHash = await hashPassword(newPassword);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
  // Revoke all existing refresh tokens on password change
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?', [userId]);
}

export async function getMe(userId) {
  const [rows] = await pool.query(
    `SELECT u.id AS user_id, u.email, r.name AS role,
            e.id AS employee_id, e.employee_code, e.first_name, e.last_name,
            e.department_id, e.designation_id, e.profile_photo_url
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN employees e ON e.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  if (!rows[0]) throw new ApiError(404, 'User not found');
  return rows[0];
}
