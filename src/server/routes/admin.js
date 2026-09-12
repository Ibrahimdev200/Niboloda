const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// Protect all admin routes with JWT and ADMIN or SUPER_ADMIN role
router.use(authenticateToken, requireRoles('ADMIN', 'SUPER_ADMIN'));

/**
 * GET /api/admin/me
 * Returns currently logged-in admin profile & permissions
 */
router.get('/me', async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { adminProfile: true }
    });

    if (!adminUser) return res.status(404).json({ error: 'Admin profile not found' });

    let permissions = [];
    if (adminUser.role === 'SUPER_ADMIN') {
      permissions = ['VERIFY_DRIVERS', 'MANAGE_PASSENGERS', 'MANAGE_RIDES', 'MANAGE_SUBSCRIPTIONS', 'MANAGE_SUBADMINS', 'VIEW_ANALYTICS'];
    } else if (adminUser.adminProfile?.permissions) {
      try {
        permissions = JSON.parse(adminUser.adminProfile.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    res.json({
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
        firstName: adminUser.adminProfile?.firstName || 'Admin',
        lastName: adminUser.adminProfile?.lastName || 'User',
        permissions
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

/**
 * GET /api/admin/dashboard-stats
 * Comprehensive KPI statistics for Admin Dashboard
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalPassengers = await prisma.passenger.count();
    const totalDrivers = await prisma.driver.count();
    const verifiedDrivers = await prisma.driver.count({ where: { isVerified: true, verificationStatus: 'APPROVED' } });
    const pendingDrivers = await prisma.driver.count({ where: { verificationStatus: 'PENDING' } });
    const onlineDrivers = await prisma.driver.count({ where: { isOnline: true } });

    const activeRides = await prisma.ride.count({ where: { status: { in: ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED'] } } });
    const completedRides = await prisma.ride.count({ where: { status: 'TRIP_COMPLETED' } });
    const cancelledRides = await prisma.ride.count({ where: { status: { in: ['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'] } } });

    const activeSubs = await prisma.subscription.count({ where: { status: 'ACTIVE', expiryDate: { gt: new Date() } } });
    const expiredSubs = await prisma.subscription.count({ where: { OR: [{ status: 'EXPIRED' }, { expiryDate: { lte: new Date() } }] } });

    const subPayments = await prisma.payment.aggregate({
      where: { type: 'DRIVER_SUBSCRIPTION', status: 'SUCCESS' },
      _sum: { amount: true }
    });
    const totalSubRevenue = subPayments._sum.amount || 0;

    const ridePayments = await prisma.payment.aggregate({
      where: { type: 'RIDE_FARE', status: 'SUCCESS' },
      _sum: { amount: true }
    });
    const totalRideValue = ridePayments._sum.amount || 0;

    const driverRatings = await prisma.driver.aggregate({
      where: { isVerified: true },
      _avg: { rating: true }
    });
    const avgDriverRating = Math.round((driverRatings._avg.rating || 5.0) * 10) / 10;

    const activeSOSCount = await prisma.emergencyEvent.count({ where: { status: 'ACTIVE' } });

    res.json({
      stats: {
        totalPassengers,
        totalDrivers,
        verifiedDrivers,
        pendingDrivers,
        onlineDrivers,
        activeRides,
        completedRides,
        cancelledRides,
        activeSubs,
        expiredSubs,
        totalSubRevenue,
        totalRideValue,
        avgDriverRating,
        activeSOSCount,
        platformCommissionRate: '0%'
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /api/admin/passengers
 */
router.get('/passengers', async (req, res) => {
  try {
    const passengers = await prisma.passenger.findMany({
      include: { user: true, savedLocations: true, rides: { take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ passengers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch passengers' });
  }
});

/**
 * GET /api/admin/drivers
 * Supports query filter ?status=PENDING_VERIFICATION or ?search=query
 */
router.get('/drivers', async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {
      ...(status && status !== 'ALL' ? { verificationStatus: status } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { id: { contains: search } },
          { user: { phone: { contains: search } } },
          { user: { email: { contains: search } } },
          { vehicle: { plateNumber: { contains: search } } }
        ]
      } : {})
    };

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        user: true,
        vehicle: true,
        pricing: true,
        documents: true,
        verificationHistory: { orderBy: { createdAt: 'desc' } },
        subscriptions: { orderBy: { expiryDate: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ drivers });
  } catch (err) {
    console.error('Fetch admin drivers error:', err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

/**
 * GET /api/admin/drivers/:id/dossier
 * Returns full driver verification dossier with uploaded documents, vehicle photos, and history
 */
router.get('/drivers/:id/dossier', async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        vehicle: { include: { verificationHistory: true } },
        pricing: true,
        documents: true,
        verificationHistory: { orderBy: { createdAt: 'desc' } },
        subscriptions: { orderBy: { expiryDate: 'desc' } }
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ driver });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch driver dossier' });
  }
});

/**
 * PUT /api/admin/drivers/:id/verify
 * Actions: APPROVE, REJECT, REQUEST_MORE_INFO, SUSPEND
 */
router.put('/drivers/:id/verify', async (req, res) => {
  try {
    const { action, notes, reason } = req.body;
    const driverId = req.params.id;
    const noteReason = reason || notes;

    if (action === 'REJECT' && (!noteReason || !noteReason.trim())) {
      return res.status(400).json({ error: 'A reason for rejection is required when rejecting a driver application.' });
    }

    let status = 'PENDING_VERIFICATION';
    let isVerified = false;

    if (action === 'APPROVE') {
      status = 'APPROVED';
      isVerified = true;
    } else if (action === 'REJECT') {
      status = 'REJECTED';
      isVerified = false;
    } else if (action === 'REQUEST_MORE_INFO') {
      status = 'MORE_INFO_REQUESTED';
      isVerified = false;
    } else if (action === 'SUSPEND') {
      status = 'SUSPENDED';
      isVerified = false;
    }

    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        verificationStatus: status,
        isVerified,
        verificationNotes: noteReason || null,
        // If rejected or suspended, force offline
        ...(!isVerified && { isOnline: false })
      },
      include: { user: true, vehicle: true }
    });

    if (driver.vehicle) {
      await prisma.vehicle.update({
        where: { id: driver.vehicle.id },
        data: {
          isVerified,
          verificationStatus: isVerified ? 'APPROVED' : (action === 'REJECT' ? 'REJECTED' : 'PENDING')
        }
      });

      await prisma.vehicleVerificationHistory.create({
        data: {
          vehicleId: driver.vehicle.id,
          status: isVerified ? 'APPROVED' : status,
          adminUserId: req.user.id,
          reason: noteReason || null
        }
      });
    }

    // Create Verification History record
    await prisma.driverVerificationHistory.create({
      data: {
        driverId: driver.id,
        status,
        adminUserId: req.user.id,
        reason: noteReason || null
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userRole: req.user.role,
        action: `DRIVER_VERIFICATION_${action}`,
        details: `Driver ${driver.firstName} ${driver.lastName} (${driverId}) set to ${status}. Reason: ${noteReason || 'None'}`
      }
    });

    // Create Notification for Driver
    await prisma.notification.create({
      data: {
        userId: driver.userId,
        title: `Driver Application Update: ${status}`,
        message: action === 'APPROVE'
          ? 'Congratulations! Your NIBOLODA driver account and vehicle have been APPROVED. You can now subscribe and go online.'
          : action === 'REJECT'
            ? `Your driver application was rejected. Reason: ${noteReason}`
            : `Your verification status has been updated to ${status}. Notes: ${noteReason || 'Check profile for details.'}`,
        type: 'DRIVER_VERIFICATION'
      }
    });

    res.json({ driver, message: `Driver verification status updated to ${status}` });
  } catch (err) {
    console.error('Verify driver error:', err);
    res.status(500).json({ error: 'Failed to update driver verification' });
  }
});

/**
 * GET /api/admin/vehicles
 */
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ vehicles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

/**
 * GET /api/admin/rides
 */
router.get('/rides', async (req, res) => {
  try {
    const rides = await prisma.ride.findMany({
      include: {
        passenger: true,
        driver: { include: { vehicle: true } },
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ rides });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

/**
 * GET /api/admin/live-map
 * Real-time map data showing online drivers & active rides
 */
router.get('/live-map', async (req, res) => {
  try {
    const onlineDrivers = await prisma.driver.findMany({
      where: { isOnline: true },
      include: {
        vehicle: true,
        locations: true,
        subscriptions: { where: { status: 'ACTIVE' }, take: 1 }
      }
    });

    const activeRides = await prisma.ride.findMany({
      where: {
        status: { in: ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED'] }
      },
      include: {
        passenger: true,
        driver: { include: { vehicle: true, locations: true } }
      }
    });

    res.json({ onlineDrivers, activeRides });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live map data' });
  }
});

/**
 * GET & POST /api/admin/subscription-plans
 */
router.get('/subscription-plans', async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { price: 'asc' } });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

router.post('/subscription-plans', async (req, res) => {
  try {
    const { name, code, price, durationDays, description } = req.body;
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        code: code.toUpperCase(),
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        description: description || null
      }
    });
    res.status(201).json({ plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subscription plan' });
  }
});

/**
 * GET /api/admin/subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: { driver: { include: { user: true } }, plan: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ subscriptions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/admin/payments
 */
router.get('/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        ride: true,
        subscription: { include: { plan: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * GET /api/admin/ratings
 */
router.get('/ratings', async (req, res) => {
  try {
    const ratings = await prisma.rating.findMany({
      include: {
        passenger: true,
        driver: { include: { vehicle: true } },
        ride: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ ratings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

/**
 * GET /api/admin/support
 */
router.get('/support', async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: true, ride: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

/**
 * GET /api/admin/emergency
 */
router.get('/emergency', async (req, res) => {
  try {
    const events = await prisma.emergencyEvent.findMany({
      include: { user: true, ride: { include: { driver: true, passenger: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch emergency events' });
  }
});

/**
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/sub-admins
 * List all admin and sub-admin team members with permissions
 */
router.get('/sub-admins', async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      include: {
        adminProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedAdmins = admins.map(a => {
      let permissions = [];
      if (a.role === 'SUPER_ADMIN') {
        permissions = ['VERIFY_DRIVERS', 'MANAGE_PASSENGERS', 'MANAGE_RIDES', 'MANAGE_SUBSCRIPTIONS', 'MANAGE_SUBADMINS', 'VIEW_ANALYTICS'];
      } else if (a.adminProfile?.permissions) {
        try {
          permissions = JSON.parse(a.adminProfile.permissions);
        } catch (e) {
          permissions = [];
        }
      }
      return {
        id: a.id,
        email: a.email,
        phone: a.phone,
        role: a.role,
        isActive: a.isActive,
        createdAt: a.createdAt,
        firstName: a.adminProfile?.firstName || 'Admin',
        lastName: a.adminProfile?.lastName || 'User',
        permissions
      };
    });

    res.json({ subAdmins: formattedAdmins });
  } catch (err) {
    console.error('Fetch sub-admins error:', err);
    res.status(500).json({ error: 'Failed to fetch sub-admins' });
  }
});

/**
 * POST /api/admin/sub-admins
 * Super Admin creates a new Sub-Admin with custom granular permissions
 */
router.post('/sub-admins', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, permissions = [] } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: 'First name, last name, email, phone, and initial password are required' });
    }

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A user account with this email or phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newSubAdminUser = await prisma.user.create({
      data: {
        phone,
        email,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isPhoneVerified: true
      }
    });

    const adminProfile = await prisma.adminProfile.create({
      data: {
        userId: newSubAdminUser.id,
        firstName,
        lastName,
        createdById: req.user.id,
        permissions: JSON.stringify(permissions)
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userRole: req.user.role,
        action: 'SUB_ADMIN_CREATED',
        details: `Created Sub-Admin ${email} (${firstName} ${lastName}) with permissions: ${permissions.join(', ')}`
      }
    });

    res.status(201).json({
      message: 'Sub-Admin created successfully',
      subAdmin: {
        id: newSubAdminUser.id,
        email: newSubAdminUser.email,
        phone: newSubAdminUser.phone,
        role: newSubAdminUser.role,
        isActive: newSubAdminUser.isActive,
        firstName: adminProfile.firstName,
        lastName: adminProfile.lastName,
        permissions
      }
    });
  } catch (err) {
    console.error('Create sub-admin error:', err);
    res.status(500).json({ error: 'Failed to create sub-admin' });
  }
});

/**
 * PUT /api/admin/sub-admins/:id/permissions
 * Update sub-admin permissions or active status
 */
router.put('/sub-admins/:id/permissions', async (req, res) => {
  try {
    const { permissions, isActive } = req.body;
    const targetUserId = req.params.id;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { adminProfile: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Sub-Admin user not found' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify Super Admin permissions' });
    }

    // Update User active status if provided
    if (isActive !== undefined) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive: Boolean(isActive) }
      });
    }

    // Update AdminProfile permissions if provided
    let updatedProfile = targetUser.adminProfile;
    if (permissions && Array.isArray(permissions)) {
      updatedProfile = await prisma.adminProfile.upsert({
        where: { userId: targetUserId },
        update: {
          permissions: JSON.stringify(permissions)
        },
        create: {
          userId: targetUserId,
          firstName: 'Admin',
          lastName: 'User',
          createdById: req.user.id,
          permissions: JSON.stringify(permissions)
        }
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userRole: req.user.role,
        action: 'SUB_ADMIN_PERMISSIONS_UPDATED',
        details: `Updated permissions for ${targetUser.email}. Active: ${isActive ?? targetUser.isActive}`
      }
    });

    let currentPerms = [];
    try {
      currentPerms = JSON.parse(updatedProfile.permissions);
    } catch (e) {
      currentPerms = [];
    }

    res.json({
      message: 'Sub-Admin permissions updated successfully',
      subAdmin: {
        id: targetUser.id,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        isActive: isActive !== undefined ? Boolean(isActive) : targetUser.isActive,
        permissions: currentPerms
      }
    });
  } catch (err) {
    console.error('Update sub-admin permissions error:', err);
    res.status(500).json({ error: 'Failed to update sub-admin permissions' });
  }
});

module.exports = router;
