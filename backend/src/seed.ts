import { prisma } from './prisma';
import { TURBINE_PLANS } from './catalog';
import { hashPassword } from './auth';
import { config } from './config';
import { money } from './money';

export async function seed(): Promise<void> {
  for (const plan of TURBINE_PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        minDeposit: plan.minDeposit,
        maxDeposit: plan.maxDeposit,
        dailyRoi: plan.dailyRoi,
        durationDays: plan.durationDays,
        payoutFee: plan.payoutFee,
        description: plan.description,
        speedRpm: plan.speedRpm,
        tier: plan.tier,
        status: 'active'
      },
      create: { ...plan }
    });
  }

  await prisma.setting.upsert({
    where: { key: 'bep20_deposit_address' },
    update: {},
    create: { key: 'bep20_deposit_address', value: config.bep20ReceivingAddress }
  });

  const userCount = await prisma.user.count();
  if (userCount > 0) return;

  const passwordHash = await hashPassword('User@1234');
  const adminHash = await hashPassword('Admin@1234');

  const admin = await prisma.user.create({
    data: {
      fullName: 'AquaVault Admin',
      email: 'admin@aquavault.io',
      passwordHash: adminHash,
      role: 'admin',
      referralCode: 'AQUAADMIN',
      availableBalance: money(0),
      bep20Address: config.bep20ReceivingAddress,
      termsAcceptedAt: new Date()
    }
  });

  const alex = await prisma.user.create({
    data: {
      fullName: 'Alex Rivera',
      email: 'alex@aquavault.io',
      passwordHash,
      referralCode: 'ALEX001',
      termsAcceptedAt: new Date()
    }
  });
  const bob = await prisma.user.create({
    data: {
      fullName: 'Bob Chen',
      email: 'bob@aquavault.io',
      passwordHash,
      referralCode: 'BOB002',
      referredById: alex.id,
      termsAcceptedAt: new Date()
    }
  });
  const clara = await prisma.user.create({
    data: {
      fullName: 'Clara Mensah',
      email: 'clara@aquavault.io',
      passwordHash,
      referralCode: 'CLARA03',
      referredById: bob.id,
      termsAcceptedAt: new Date()
    }
  });
  await prisma.user.create({
    data: {
      fullName: 'Aqua Tester',
      email: 'user@aquavault.io',
      passwordHash,
      referralCode: 'AQUAVIP',
      referredById: clara.id,
      availableBalance: '50.00',
      bep20Address: '0x1234567890abcdef1234567890abcdef12345678',
      termsAcceptedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'SYSTEM_INITIALIZATION',
      targetType: 'SYSTEM',
      targetId: '1',
      details: 'Platform seeded with five turbine plans',
      ipAddress: '127.0.0.1'
    }
  });
}

if (require.main === module) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
