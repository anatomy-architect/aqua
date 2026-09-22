const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'aquavault_super_secret_jwt_key_2026';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, role, balance, lockedBalance, status, referralCode, bep20Address FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found or account invalidated.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact Aqua Vault compliance.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }
  next();
}

function recordAudit(actorId, actorEmail, action, targetType, targetId, details, req) {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (actorId, actorEmail, action, targetType, targetId, details, ipAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(actorId, actorEmail, action, targetType, String(targetId), details, ipAddress);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  recordAudit,
  JWT_SECRET
};
