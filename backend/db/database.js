const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'aquavault.sqlite');

let sqlDb = null;
let SQL = null;

function saveDb() {
  if (sqlDb) {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Synchronously initialize SQL.js database
let isInitialized = false;

async function initDatabase() {
  if (isInitialized) return dbWrapper;

  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  initSchema();
  isInitialized = true;
  return dbWrapper;
}

function initSchema() {
  // Users table
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      referralCode TEXT UNIQUE NOT NULL,
      referredBy INTEGER,
      balance REAL DEFAULT 0.00,
      lockedBalance REAL DEFAULT 0.00,
      totalDeposited REAL DEFAULT 0.00,
      totalWithdrawn REAL DEFAULT 0.00,
      totalEarned REAL DEFAULT 0.00,
      totalReferralEarned REAL DEFAULT 0.00,
      bep20Address TEXT,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referredBy) REFERENCES users(id)
    );
  `);

  // Turbine Plans
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      minDeposit REAL NOT NULL,
      maxDeposit REAL NOT NULL,
      dailyRoi REAL NOT NULL,
      durationDays INTEGER NOT NULL,
      withdrawalFee REAL NOT NULL,
      description TEXT,
      speedRpm INTEGER DEFAULT 120,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Investments
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      planId INTEGER NOT NULL,
      planNameSnapshot TEXT NOT NULL,
      investedAmount REAL NOT NULL,
      dailyRateSnapshot REAL NOT NULL,
      durationDaysSnapshot INTEGER NOT NULL,
      withdrawalFeeSnapshot REAL NOT NULL,
      dailyEarnings REAL NOT NULL,
      totalEarned REAL DEFAULT 0.00,
      daysPassed INTEGER DEFAULT 0,
      startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      endDate DATETIME NOT NULL,
      lastEarningDate DATETIME,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (planId) REFERENCES plans(id)
    );
  `);

  // Investment Daily Earnings records
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS earnings_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investmentId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      earningDay INTEGER NOT NULL,
      amount REAL NOT NULL,
      creditedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (investmentId) REFERENCES investments(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(investmentId, earningDay)
    );
  `);

  // Referral Commissions
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS referral_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investmentId INTEGER NOT NULL,
      referredUserId INTEGER NOT NULL,
      referrerId INTEGER NOT NULL,
      level INTEGER NOT NULL,
      ratePercent REAL NOT NULL,
      maxDays INTEGER NOT NULL,
      earningDay INTEGER NOT NULL,
      amount REAL NOT NULL,
      creditedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (investmentId) REFERENCES investments(id),
      FOREIGN KEY (referredUserId) REFERENCES users(id),
      FOREIGN KEY (referrerId) REFERENCES users(id),
      UNIQUE(investmentId, referrerId, level, earningDay)
    );
  `);

  // Deposits
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      planId INTEGER,
      amount REAL NOT NULL,
      network TEXT DEFAULT 'BEP20',
      receivingAddress TEXT NOT NULL,
      txHash TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewedAt DATETIME,
      adminId INTEGER,
      adminNote TEXT,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (planId) REFERENCES plans(id)
    );
  `);

  // Withdrawals
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      amount REAL NOT NULL,
      feeRate REAL NOT NULL,
      feeAmount REAL NOT NULL,
      netAmount REAL NOT NULL,
      walletAddress TEXT NOT NULL,
      network TEXT DEFAULT 'BEP20',
      status TEXT DEFAULT 'SUBMITTED',
      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      processedAt DATETIME,
      txHash TEXT,
      adminId INTEGER,
      adminNote TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // Balance Transactions / Ledger
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS balance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT NOT NULL,
      referenceType TEXT,
      referenceId INTEGER,
      balanceAfter REAL NOT NULL,
      earningDay INTEGER,
      note TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // Audit Logs
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actorId INTEGER NOT NULL,
      actorEmail TEXT NOT NULL,
      action TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT,
      details TEXT,
      ipAddress TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // System Settings
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveDb();
}

// Convert parameter bindings
function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  if (typeof params === 'object') {
    const named = {};
    for (const [k, v] of Object.entries(params)) {
      named[k.startsWith(':') || k.startsWith('@') || k.startsWith('$') ? k : '@' + k] = v;
    }
    return named;
  }
  return [params];
}

const dbWrapper = {
  initDatabase,
  getSqlDb: () => sqlDb,
  exec: (sql) => {
    sqlDb.run(sql);
    saveDb();
  },
  prepare: (sql) => {
    return {
      run: (...args) => {
        let params = args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object') ? args[0] : args;
        params = normalizeParams(params);
        sqlDb.run(sql, params);
        
        // Get last insert ID and changes
        const idRes = sqlDb.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = idRes[0]?.values[0]?.[0] || 0;
        
        const changesRes = sqlDb.exec('SELECT changes() as changes');
        const changes = changesRes[0]?.values[0]?.[0] || 0;

        saveDb();
        return { lastInsertRowid, changes };
      },
      get: (...args) => {
        let params = args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object') ? args[0] : args;
        params = normalizeParams(params);
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          const row = stmt.getAsObject();
          result = row;
        }
        stmt.free();
        return result;
      },
      all: (...args) => {
        let params = args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object') ? args[0] : args;
        params = normalizeParams(params);
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  },
  transaction: (fn) => {
    return (...args) => {
      sqlDb.run('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        sqlDb.run('COMMIT;');
        saveDb();
        return result;
      } catch (err) {
        sqlDb.run('ROLLBACK;');
        saveDb();
        throw err;
      }
    };
  },
  save: saveDb
};

module.exports = dbWrapper;
