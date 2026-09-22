/**
 * AQUA VAULT — Database Migration Script
 * Migrates all plan data to the FINAL specification:
 *
 * Plan 1: Coral Stream Turbine  — $20 | 0.85% | 27d | 10% fee
 * Plan 2: Deep Current Turbine  — $50 | 1.30% | 23d | 6% fee
 * Plan 3: Ocean Pulse Turbine   — $100 | 1.70% | 21d | 4% fee
 * Plan 4: Abyss Flow Turbine    — $300 | 2.30% | 35d | 0% fee
 * Plan 5: Titan Current Turbine — $500 | 3.50% | 48d | 0% fee
 */

const db = require('./database');

async function migrate() {
  await db.initDatabase();

  console.log('--- AQUA VAULT: Migrating Plan Data ---');

  // Final plan configuration
  const finalPlans = [
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

  const existingPlans = db.prepare('SELECT * FROM plans ORDER BY id').all();
  console.log(`Found ${existingPlans.length} existing plans in DB`);

  if (existingPlans.length === 0) {
    // Insert fresh
    const insertPlan = db.prepare(`
      INSERT INTO plans (name, tier, minDeposit, maxDeposit, dailyRoi, durationDays, withdrawalFee, description, speedRpm)
      VALUES (@name, @tier, @minDeposit, @maxDeposit, @dailyRoi, @durationDays, @withdrawalFee, @description, @speedRpm)
    `);
    finalPlans.forEach(p => insertPlan.run(p));
    console.log('✓ Inserted 5 fresh plans');
  } else {
    // Update existing plans by position/order
    const updatePlan = db.prepare(`
      UPDATE plans SET
        name = @name,
        tier = @tier,
        minDeposit = @minDeposit,
        maxDeposit = @maxDeposit,
        dailyRoi = @dailyRoi,
        durationDays = @durationDays,
        withdrawalFee = @withdrawalFee,
        description = @description,
        speedRpm = @speedRpm
      WHERE id = @id
    `);

    // Match by position (plan 1→id1, plan 2→id2, etc.)
    for (let i = 0; i < Math.min(existingPlans.length, finalPlans.length); i++) {
      const oldPlan = existingPlans[i];
      const newPlan = finalPlans[i];
      console.log(`  Updating plan ${oldPlan.id}: "${oldPlan.name}" → "${newPlan.name}"`);
      updatePlan.run({ ...newPlan, id: oldPlan.id });
    }

    // If there are more existing plans than needed, remove extras
    if (existingPlans.length > finalPlans.length) {
      for (let i = finalPlans.length; i < existingPlans.length; i++) {
        const extraPlan = existingPlans[i];
        console.log(`  Removing extra plan ${extraPlan.id}: "${extraPlan.name}"`);
        db.prepare('UPDATE plans SET status = ? WHERE id = ?').run('inactive', extraPlan.id);
      }
    }

    // If we need to insert additional plans
    if (existingPlans.length < finalPlans.length) {
      const insertPlan = db.prepare(`
        INSERT INTO plans (name, tier, minDeposit, maxDeposit, dailyRoi, durationDays, withdrawalFee, description, speedRpm)
        VALUES (@name, @tier, @minDeposit, @maxDeposit, @dailyRoi, @durationDays, @withdrawalFee, @description, @speedRpm)
      `);
      for (let i = existingPlans.length; i < finalPlans.length; i++) {
        insertPlan.run(finalPlans[i]);
        console.log(`  Inserted new plan: "${finalPlans[i].name}"`);
      }
    }

    console.log('✓ Updated all existing plans to final specification');
  }

  // Verify results
  const updatedPlans = db.prepare('SELECT * FROM plans WHERE status = "active" OR status IS NULL ORDER BY id').all();
  console.log('\n--- VERIFIED FINAL PLAN TABLE ---');
  updatedPlans.forEach(p => {
    console.log(`  [ID:${p.id}] ${p.name} | Min: $${p.minDeposit} | ROI: ${p.dailyRoi}% | Duration: ${p.durationDays}d | Fee: ${p.withdrawalFee}%`);
  });

  // Verify Titan Current has 48 days (NOT 60)
  const titan = updatedPlans.find(p => p.name === 'Titan Current Turbine');
  if (titan) {
    if (titan.durationDays === 48) {
      console.log('\n✅ TITAN CURRENT TURBINE: durationDays = 48 ✓ CORRECT');
    } else {
      console.error(`\n❌ TITAN CURRENT TURBINE: durationDays = ${titan.durationDays} ✗ WRONG (expected 48)`);
    }
  }

  console.log('\n✓ Migration complete!');
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
