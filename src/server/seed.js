const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting NIBOLODA live production database initialization...');

  // 1. Subscription Plans (Ensure exists or upsert)
  console.log('Initializing Subscription Plans...');
  const plans = [
    {
      name: 'Daily Pass',
      code: 'DAILY',
      price: 1500.0,
      durationDays: 1,
      description: 'Unlimited trip access for 24 hours. 0% trip commission.'
    },
    {
      name: 'Weekly Driver Pass',
      code: 'WEEKLY',
      price: 8500.0,
      durationDays: 7,
      description: '7 days unlimited passenger matching. Keep 100% fare.'
    },
    {
      name: 'Monthly Pro Pass',
      code: 'MONTHLY',
      price: 28000.0,
      durationDays: 30,
      description: 'Best value 30 days unlimited access for full-time drivers.'
    },
    {
      name: 'Quarterly Executive',
      code: 'QUARTERLY',
      price: 75000.0,
      durationDays: 90,
      description: '90 days premium access with priority driver support.'
    },
    {
      name: 'Yearly Champion',
      code: 'YEARLY',
      price: 250000.0,
      durationDays: 365,
      description: 'Full year unlimited marketplace access.'
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        description: plan.description,
        isActive: true
      },
      create: plan
    });
  }

  // 2. Service Areas
  console.log('Initializing Service Areas...');
  const serviceAreas = [
    { name: 'Lagos Metropolis', city: 'Lagos', centerLat: 6.5244, centerLng: 3.3792, radiusKm: 35.0 },
    { name: 'Abuja Federal Capital Territory', city: 'Abuja', centerLat: 9.0765, centerLng: 7.3986, radiusKm: 40.0 },
    { name: 'Port Harcourt Urban', city: 'Port Harcourt', centerLat: 4.8156, centerLng: 7.0498, radiusKm: 25.0 }
  ];

  for (const area of serviceAreas) {
    const existing = await prisma.serviceArea.findFirst({
      where: { name: area.name }
    });
    if (!existing) {
      await prisma.serviceArea.create({ data: area });
    }
  }

  // 3. Super Admin User (ibrahimdev200@gmail.com / @Dherinosha1)
  console.log('Verifying Super Admin user...');
  const superAdminPasswordHash = await bcrypt.hash('@Dherinosha1', 10);

  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'ibrahimdev200@gmail.com' },
    include: { adminProfile: true }
  });

  if (!existingAdmin) {
    const superAdminUser = await prisma.user.create({
      data: {
        phone: '+2348000000000',
        email: 'ibrahimdev200@gmail.com',
        passwordHash: superAdminPasswordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        isPhoneVerified: true,
        adminProfile: {
          create: {
            firstName: 'Ibrahim',
            lastName: 'SuperAdmin',
            permissions: JSON.stringify([
              'VERIFY_DRIVERS',
              'MANAGE_PASSENGERS',
              'MANAGE_RIDES',
              'MANAGE_SUBSCRIPTIONS',
              'MANAGE_SUBADMINS',
              'VIEW_ANALYTICS'
            ])
          }
        }
      }
    });
    console.log(`Created Super Admin user: ${superAdminUser.email}`);
  } else {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash: superAdminPasswordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        isPhoneVerified: true
      }
    });

    if (existingAdmin.adminProfile) {
      await prisma.adminProfile.update({
        where: { id: existingAdmin.adminProfile.id },
        data: {
          firstName: 'Ibrahim',
          lastName: 'SuperAdmin',
          permissions: JSON.stringify([
            'VERIFY_DRIVERS',
            'MANAGE_PASSENGERS',
            'MANAGE_RIDES',
            'MANAGE_SUBSCRIPTIONS',
            'MANAGE_SUBADMINS',
            'VIEW_ANALYTICS'
          ])
        }
      });
    } else {
      await prisma.adminProfile.create({
        data: {
          userId: existingAdmin.id,
          firstName: 'Ibrahim',
          lastName: 'SuperAdmin',
          permissions: JSON.stringify([
            'VERIFY_DRIVERS',
            'MANAGE_PASSENGERS',
            'MANAGE_RIDES',
            'MANAGE_SUBSCRIPTIONS',
            'MANAGE_SUBADMINS',
            'VIEW_ANALYTICS'
          ])
        }
      });
    }
    console.log(`Updated Super Admin user: ${existingAdmin.email}`);
  }

  // Record audit log for live init
  await prisma.auditLog.create({
    data: {
      userId: existingAdmin?.id,
      userRole: 'SUPER_ADMIN',
      action: 'LIVE_INIT',
      details: 'Live system initialized with zero demo accounts.'
    }
  });

  console.log('✅ Live production database configured successfully (0 demo accounts).');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
