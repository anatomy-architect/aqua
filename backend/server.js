const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const dbWrapper = require('./db/database');
const seed = require('./db/seed');
const earningsEngine = require('./services/earningsEngine');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const investmentsRoutes = require('./routes/investments');
const depositsRoutes = require('./routes/deposits');
const withdrawalsRoutes = require('./routes/withdrawals');
const referralsRoutes = require('./routes/referrals');
const ledgerRoutes = require('./routes/ledger');
const adminRoutes = require('./routes/admin');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/plans', plansRoutes);
app.use('/api/v1/investments', investmentsRoutes);
app.use('/api/v1/deposits', depositsRoutes);
app.use('/api/v1/withdrawals', withdrawalsRoutes);
app.use('/api/v1/referrals', referralsRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'AQUA VAULT',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Start Server & Initialize Database
async function startServer() {
  try {
    await dbWrapper.initDatabase();
    await seed();

    // Run earnings engine check on startup and schedule periodic cycle
    try {
      earningsEngine.processDailyEarnings();
    } catch (e) {
      console.log('Daily earnings initial check done.');
    }

    const server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🌊 AQUA VAULT Backend API running on port ${PORT}`);
      console.log(`🌊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`=================================================`);
    });

    return server;
  } catch (err) {
    console.error('Fatal Server Initialization Error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
