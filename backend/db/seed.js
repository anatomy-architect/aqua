const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  console.log('--- Seeding AQUA VAULT Database ---');

  // 1. Seed Plans if not exists
  const existingPlans = db.prepare('SELECT COUNT(*) as count FROM plans').get();
  if (existingPlans.count === 0) {
    const plans = [
      {
        name: 'Coral Stream Turbine',
        tier: 'Tier 1',
        minDeposit: 20,
        maxDeposit: 49,
        dailyRoi: 0.85,
        durationDays: 27,
        withdrawalFee: 10.0,
        description: 'Entry-level ocean surface tidal kinetic turbine generator. High accessibility with dependable daily yields.',
        speedRpm: 90
      },
      {
        name: 'Deep Current Turbine',
        tier: 'Tier 2',
        minDeposit: 50,
        maxDeposit: 99,
        dailyRoi: 1.30,
        durationDays: 23,
        withdrawalFee: 6.0,
        description: 'Sub-surface oceanic current turbine harnessing persistent deep-water hydrodynamic energy.',
        speedRpm: 130
      },
      {
        name: 'Ocean Pulse Turbine',
        tier: 'Tier 3',
        minDeposit: 100,
        maxDeposit: 299,
        dailyRoi: 1.70,
        durationDays: 21,
        withdrawalFee: 4.0,
        description: 'High-yield oceanic wave surge converter engineered for maximum kinetic amplitude capture.',
        speedRpm: 175
      },
      {
        name: 'Abyss Flow Turbine',
        tier: 'Tier 4',
        minDeposit: 300,
        maxDeposit: 499,
        dailyRoi: 2.30,
        durationDays: 35,
        withdrawalFee: 0.0,
        description: 'Deep abyss thermal & pressure hydrodynamic generator with zero withdrawal fee privilege.',
        speedRpm: 220
      },
      {
        name: 'Titan Current Turbine',
        tier: 'Tier 5',
        minDeposit: 500,
        maxDeposit: 1000000,
        dailyRoi: 3.50,
        durationDays: 48,
        withdrawalFee: 0.0,
        description: 'Industrial megawatt ocean floor thermal-hydro vortex power station. Elite yield & zero withdrawal fee.',
        speedRpm: 280
      }
    ];

    const insertPlan = db.prepare(`
      INSERT INTO plans (name, tier, minDeposit, maxDeposit, dailyRoi, durationDays, withdrawalFee, description, speedRpm)
      VALUES (@name, @tier, @minDeposit, @maxDeposit, @dailyRoi, @durationDays, @withdrawalFee, @description, @speedRpm)
    `);

    plans.forEach(plan => insertPlan.run(plan));
    console.log(`✓ Seeded ${plans.length} Turbine Plans`);
  }

  // 2. Seed Users & Referral Network
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count === 0) {
    const passwordHash = await bcrypt.hash('User@123', 10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password, role, referralCode, referredBy, balance, totalDeposited, bep20Address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Admin
    const adminResult = insertUser.run('admin', 'admin@aquavault.io', adminPasswordHash, 'admin', 'AQUAADMIN', null, 50000.0, 50000.0, '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461');
    const adminId = adminResult.lastInsertRowid;

    // User A (Top of tree)
    const alexResult = insertUser.run('alex', 'alex@aquavault.io', passwordHash, 'user', 'ALEX001', null, 540.0, 500.0, '0x3E8f29C1B92d9c02B89e55D3Fe52718E29851944');
    const alexId = alexResult.lastInsertRowid;

    // User B (L1 of Alex)
    const bobResult = insertUser.run('bob', 'bob@aquavault.io', passwordHash, 'user', 'BOB002', alexId, 780.0, 1000.0, '0x8892FeA37b822c9b13F93427E3AfF982B34f9a02');
    const bobId = bobResult.lastInsertRowid;

    // User C (L1 of Bob, L2 of Alex)
    const claraResult = insertUser.run('clara', 'clara@aquavault.io', passwordHash, 'user', 'CLARA03', bobId, 1200.0, 2000.0, '0x49811C8EFe0bA272C1502447990176BcDdE62192');
    const claraId = claraResult.lastInsertRowid;

    // User D (Main Demo User: L1 of Clara, L2 of Bob, L3 of Alex)
    const userResult = insertUser.run('aquatester', 'user@aquavault.io', passwordHash, 'user', 'AQUAVIP', claraId, 450.0, 500.0, '0x1234567890abcdef1234567890abcdef12345678');
    const userId = userResult.lastInsertRowid;

    console.log('✓ Seeded Demo Users & Referral Hierarchy: Alex -> Bob -> Clara -> DemoUser');

    // 3. Seed Sample Active Investments for Demo User
    // Using Titan Current Turbine ($500 min, 3.50%, 48 days)
    const titanPlan = db.prepare("SELECT * FROM plans WHERE name = 'Titan Current Turbine'").get();
    // Using Abyss Flow Turbine ($300 min, 2.30%, 35 days)
    const abyssPlan = db.prepare("SELECT * FROM plans WHERE name = 'Abyss Flow Turbine'").get();

    const insertInv = db.prepare(`
      INSERT INTO investments (
        userId, planId, planNameSnapshot, investedAmount, dailyRateSnapshot, durationDaysSnapshot, withdrawalFeeSnapshot,
        dailyEarnings, totalEarned, daysPassed, startDate, endDate, lastEarningDate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'), datetime('now', '+43 days'), datetime('now', '-1 days'), 'active')
    `);

    // Demo investment 1: Titan Current Turbine at $500 min
    // Daily: $500 × 3.50% = $17.50
    // Total earned so far (5 days): $87.50
    const inv1 = insertInv.run(
      userId,
      titanPlan.id,
      titanPlan.name,
      500.0,
      titanPlan.dailyRoi,
      titanPlan.durationDays,
      titanPlan.withdrawalFee,
      500.0 * (titanPlan.dailyRoi / 100),
      87.50,
      5
    );

    // Demo investment 2: Abyss Flow Turbine at $300 min
    // Daily: $300 × 2.30% = $6.90
    // Total earned so far (5 days): $34.50
    const inv2 = insertInv.run(
      userId,
      abyssPlan.id,
      abyssPlan.name,
      300.0,
      abyssPlan.dailyRoi,
      abyssPlan.durationDays,
      abyssPlan.withdrawalFee,
      300.0 * (abyssPlan.dailyRoi / 100),
      34.50,
      5
    );

    console.log('✓ Seeded 2 Active Turbine Investments for Demo User');

    // 4. Seed Earnings & Referral Records for previous 5 days
    const insertEarning = db.prepare(`
      INSERT INTO earnings_records (investmentId, userId, earningDay, amount, creditedAt)
      VALUES (?, ?, ?, ?, datetime('now', '-' || (5 - ?) || ' days'))
    `);
    for (let day = 1; day <= 5; day++) {
      insertEarning.run(inv1.lastInsertRowid, userId, day, 17.50, day); // Titan: $500 × 3.50%
      insertEarning.run(inv2.lastInsertRowid, userId, day, 6.90, day);  // Abyss: $300 × 2.30%
    }

    // Seed referral commissions for inv1 ($500 Titan Current Turbine)
    // Clara (L1: 3% for 3 days = $15/day)
    // Bob (L2: 2% for 3 days = $10/day)
    // Alex (L3: 0.8% for 5 days = $4/day)
    const insertRefComm = db.prepare(`
      INSERT INTO referral_commissions (investmentId, referredUserId, referrerId, level, ratePercent, maxDays, earningDay, amount, creditedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || (5 - ?) || ' days'))
    `);

    // Clara 3 days credited: 3% of $500 = $15/day
    for (let day = 1; day <= 3; day++) {
      insertRefComm.run(inv1.lastInsertRowid, userId, claraId, 1, 3.0, 3, day, 15.0, day);
    }
    // Bob 3 days credited: 2% of $500 = $10/day
    for (let day = 1; day <= 3; day++) {
      insertRefComm.run(inv1.lastInsertRowid, userId, bobId, 2, 2.0, 3, day, 10.0, day);
    }
    // Alex 5 days credited: 0.8% of $500 = $4/day
    for (let day = 1; day <= 5; day++) {
      insertRefComm.run(inv1.lastInsertRowid, userId, alexId, 3, 0.8, 5, day, 4.0, day);
    }

    // 5. Seed Initial Ledger Transactions
    const insertTx = db.prepare(`
      INSERT INTO balance_transactions (userId, type, amount, direction, referenceType, referenceId, balanceAfter, note, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-6 days'))
    `);

    insertTx.run(userId, 'deposit_credit', 500.0, 'credit', 'deposit', 1, 500.0, 'Approved BEP20 USDT Deposit');
    insertTx.run(userId, 'investment_profit', 122.0, 'credit', 'investment', inv1.lastInsertRowid, 622.0, 'Daily Turbine Earnings (5 Days)');

    // 6. Seed Pending Deposit for Admin Testing
    db.prepare(`
      INSERT INTO deposits (userId, planId, amount, network, receivingAddress, txHash, status, submittedAt)
      VALUES (?, ?, 500.0, 'BEP20', '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461', '0x9a3f81e7d2b489c67e81034c568912e7834190c1f54367980ef7190342378901', 'PENDING', datetime('now', '-2 hours'))
    `).run(userId, titanPlan.id);

    // 7. Seed Completed Deposit
    db.prepare(`
      INSERT INTO deposits (userId, planId, amount, network, receivingAddress, txHash, status, submittedAt, reviewedAt, adminId, adminNote)
      VALUES (?, ?, 500.0, 'BEP20', '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461', '0x1c8b37a4e930f71937402a5c90b6389f41703e8590d63892a01490234790184b', 'APPROVED', datetime('now', '-6 days'), datetime('now', '-6 days'), ?, 'Verified on BscScan')
    `).run(userId, titanPlan.id, adminId);

    // 8. Seed Audit Log entries
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (actorId, actorEmail, action, targetType, targetId, details, ipAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(adminId, 'admin@aquavault.io', 'SYSTEM_INITIALIZATION', 'SYSTEM', '1', 'Platform database and turbine matrices initialized', '127.0.0.1');
    insertAudit.run(adminId, 'admin@aquavault.io', 'DEPOSIT_APPROVAL', 'DEPOSIT', '2', 'Approved $500.00 BEP20 USDT deposit for user aquatester', '127.0.0.1');
  }

  console.log('✓ Database seeding complete!');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seed;
