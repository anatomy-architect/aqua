const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

function generateReferralCode(username) {
  const clean = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AQ${clean}${rand}`;
}

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, referralCode, bep20Address } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check existing
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email or username already exists.' });
    }

    // Resolve referrer if provided
    let referredBy = null;
    if (referralCode && referralCode.trim() !== '') {
      const referrer = db.prepare('SELECT id FROM users WHERE referralCode = ?').get(referralCode.trim().toUpperCase());
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newRefCode = generateReferralCode(username);

    const result = db.prepare(`
      INSERT INTO users (username, email, password, referralCode, referredBy, bep20Address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, email, passwordHash, newRefCode, referredBy, bep20Address || null);

    const user = db.prepare('SELECT id, username, email, role, referralCode, referredBy, balance, lockedBalance, totalDeposited, totalWithdrawn, totalEarned, totalReferralEarned, bep20Address FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. ' + err.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const user = db.prepare(`
      SELECT id, username, email, password, role, referralCode, referredBy, balance, lockedBalance, totalDeposited, totalWithdrawn, totalEarned, totalReferralEarned, bep20Address, status 
      FROM users 
      WHERE email = ? OR username = ?
    `).get(identifier, identifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...safeUser } = user;

    return res.json({
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. ' + err.message });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, role, referralCode, referredBy, balance, lockedBalance, totalDeposited, totalWithdrawn, totalEarned, totalReferralEarned, bep20Address, status, createdAt
    FROM users 
    WHERE id = ?
  `).get(req.user.id);

  let referrerName = null;
  if (user.referredBy) {
    const ref = db.prepare('SELECT username FROM users WHERE id = ?').get(user.referredBy);
    if (ref) referrerName = ref.username;
  }

  // Active investments summary
  const activeStats = db.prepare(`
    SELECT 
      COUNT(*) as activeCount,
      COALESCE(SUM(investedAmount), 0) as activeInvested,
      COALESCE(SUM(dailyEarnings), 0) as dailyExpectedEarning
    FROM investments 
    WHERE userId = ? AND status = 'active'
  `).get(user.id);

  return res.json({
    user: {
      ...user,
      referrerName,
      activeTurbinesCount: activeStats.activeCount,
      activeInvestedAmount: activeStats.activeInvested,
      dailyExpectedEarning: Math.round(activeStats.dailyExpectedEarning * 100) / 100
    }
  });
});

// POST /api/v1/auth/update-wallet
router.post('/update-wallet', authenticate, (req, res) => {
  const { bep20Address } = req.body;
  if (!bep20Address || !/^0x[a-fA-F0-9]{40}$/.test(bep20Address.trim())) {
    return res.status(400).json({ error: 'Invalid BEP20 wallet address. Must start with 0x and have 40 hex characters.' });
  }

  db.prepare('UPDATE users SET bep20Address = ? WHERE id = ?').run(bep20Address.trim(), req.user.id);
  return res.json({ message: 'BEP20 destination address updated successfully.', bep20Address: bep20Address.trim() });
});

module.exports = router;
