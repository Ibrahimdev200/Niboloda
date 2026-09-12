const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * GET /api/drivers/me
 */
router.get('/me', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id },
      include: {
        vehicle: true,
        pricing: true,
        locations: true,
        subscriptions: {
          orderBy: { expiryDate: 'desc' },
          take: 5
        }
      }
    });
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch driver profile' });
  }
});

/**
 * PUT /api/drivers/documents
 * Driver submits government ID and driver license
 */
router.put('/documents', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { address, licenseNumber, governmentId, profilePhoto } = req.body;
    const driver = await prisma.driver.update({
      where: { userId: req.user.id },
      data: {
        ...(address && { address }),
        ...(licenseNumber && { licenseNumber }),
        ...(governmentId && { governmentId }),
        ...(profilePhoto && { profilePhoto }),
        verificationStatus: 'PENDING' // Triggers admin review
      }
    });

    // Create Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userRole: 'DRIVER',
        action: 'DRIVER_DOCUMENTS_SUBMITTED',
        details: `License: ${licenseNumber}, ID: ${governmentId}`
      }
    });

    res.json({ driver, message: 'Documents submitted for verification' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update driver documents' });
  }
});

/**
 * POST /api/drivers/onboarding
 * Driver submits complete 6-step onboarding profile, vehicle, documents, and pricing
 */
router.post('/onboarding', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const {
      ninNumber,
      driversLicenseNumber,
      licenseExpiry,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      plateNumber,
      vehicleColor,
      seatingCapacity,
      serviceType,
      minFare,
      baseFare,
      ratePerKm,
      ratePerMin,
      documents
    } = req.body;

    let driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    // 1. Update Driver personal identity details
    driver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        ...(ninNumber && { governmentIdNumber: ninNumber, governmentIdType: 'NIN' }),
        ...(driversLicenseNumber && { licenseNumber: driversLicenseNumber, governmentId: driversLicenseNumber }),
        verificationStatus: 'UNDER_REVIEW'
      }
    });

    // 2. Upsert Vehicle info
    let vehicle = null;
    if (vehicleMake && vehicleModel && plateNumber) {
      vehicle = await prisma.vehicle.upsert({
        where: { driverId: driver.id },
        update: {
          make: vehicleMake,
          model: vehicleModel,
          year: parseInt(vehicleYear) || 2020,
          color: vehicleColor || 'Silver',
          plateNumber: String(plateNumber).toUpperCase(),
          seats: parseInt(seatingCapacity) || 4,
          verificationStatus: 'PENDING',
          isVerified: false,
          ...(documents?.vehicleInsuranceDoc && { insuranceDocUrl: documents.vehicleInsuranceDoc }),
          ...(documents?.vehicleRegistrationDoc && { registrationDocUrl: documents.vehicleRegistrationDoc }),
          ...(documents?.inspectionCertDoc && { roadworthinessDocUrl: documents.inspectionCertDoc }),
          ...(documents?.vehicleExteriorPhoto && { photoFrontUrl: documents.vehicleExteriorPhoto }),
          ...(documents?.vehicleInteriorPhoto && { photoInteriorUrl: documents.vehicleInteriorPhoto })
        },
        create: {
          driverId: driver.id,
          make: vehicleMake,
          model: vehicleModel,
          year: parseInt(vehicleYear) || 2020,
          color: vehicleColor || 'Silver',
          plateNumber: String(plateNumber).toUpperCase(),
          seats: parseInt(seatingCapacity) || 4,
          verificationStatus: 'PENDING',
          isVerified: false,
          insuranceDocUrl: documents?.vehicleInsuranceDoc || null,
          registrationDocUrl: documents?.vehicleRegistrationDoc || null,
          roadworthinessDocUrl: documents?.inspectionCertDoc || null,
          photoFrontUrl: documents?.vehicleExteriorPhoto || null,
          photoInteriorUrl: documents?.vehicleInteriorPhoto || null
        }
      });
    }

    // 3. Upsert Pricing Settings (ensuring non-negative values)
    const pricing = await prisma.driverPricing.upsert({
      where: { driverId: driver.id },
      update: {
        ...(minFare !== undefined && { minFare: Math.max(0, parseFloat(minFare)) }),
        ...(baseFare !== undefined && { preferredFare: Math.max(0, parseFloat(baseFare)) }),
        ...(ratePerKm !== undefined && { pricePerKm: Math.max(0, parseFloat(ratePerKm)) }),
        ...(ratePerMin !== undefined && { pricePerMin: Math.max(0, parseFloat(ratePerMin)) })
      },
      create: {
        driverId: driver.id,
        minFare: Math.max(0, parseFloat(minFare || 2500)),
        preferredFare: Math.max(0, parseFloat(baseFare || 2500)),
        pricePerKm: Math.max(0, parseFloat(ratePerKm || 300)),
        pricePerMin: Math.max(0, parseFloat(ratePerMin || 50)),
        minDistance: 1,
        maxDistance: 50
      }
    });

    // 4. Save uploaded document references
    if (documents && typeof documents === 'object') {
      const docEntries = [
        { type: 'DRIVER_LICENSE', url: documents.driversLicenseDoc },
        { type: 'GOVT_ID', url: documents.ninDoc },
        { type: 'VEHICLE_INSURANCE', url: documents.vehicleInsuranceDoc },
        { type: 'VEHICLE_REG', url: documents.vehicleRegistrationDoc },
        { type: 'ROADWORTHINESS', url: documents.inspectionCertDoc },
        { type: 'PROFILE_PHOTO', url: documents.vehicleExteriorPhoto }
      ].filter(d => Boolean(d.url));

      for (const doc of docEntries) {
        await prisma.driverDocument.create({
          data: {
            driverId: driver.id,
            docType: doc.type,
            fileUrl: doc.url,
            fileType: 'image/jpeg',
            fileSize: 1024,
            verificationStatus: 'PENDING'
          }
        });
      }
    }

    // 5. Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userRole: 'DRIVER',
        action: 'DRIVER_ONBOARDING_SUBMITTED',
        details: `Driver completed 6-step onboarding wizard. Status set to UNDER_REVIEW.`
      }
    });

    res.json({
      message: 'Onboarding application submitted successfully! Under review by NIBOLODA Admin team.',
      driver: {
        ...driver,
        vehicle,
        pricing
      }
    });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to submit driver onboarding application' });
  }
});


/**
 * PUT /api/drivers/pricing
 * Driver updates custom pricing settings
 */
router.put('/pricing', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { minFare, preferredFare, pricePerKm, pricePerMin, minDistance, maxDistance } = req.body;
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const pricing = await prisma.driverPricing.upsert({
      where: { driverId: driver.id },
      update: {
        ...(minFare !== undefined && { minFare: parseFloat(minFare) }),
        ...(preferredFare !== undefined && { preferredFare: parseFloat(preferredFare) }),
        ...(pricePerKm !== undefined && { pricePerKm: parseFloat(pricePerKm) }),
        ...(pricePerMin !== undefined && { pricePerMin: parseFloat(pricePerMin) }),
        ...(minDistance !== undefined && { minDistance: parseFloat(minDistance) }),
        ...(maxDistance !== undefined && { maxDistance: parseFloat(maxDistance) })
      },
      create: {
        driverId: driver.id,
        minFare: parseFloat(minFare || 2000),
        preferredFare: parseFloat(preferredFare || 2500),
        pricePerKm: parseFloat(pricePerKm || 250),
        pricePerMin: parseFloat(pricePerMin || 50),
        minDistance: parseFloat(minDistance || 1),
        maxDistance: parseFloat(maxDistance || 50)
      }
    });

    res.json({ pricing, message: 'Driver pricing updated successfully' });
  } catch (err) {
    console.error('Pricing update error:', err);
    res.status(500).json({ error: 'Failed to update pricing rules' });
  }
});

/**
 * POST /api/drivers/toggle-online
 * Toggles driver ONLINE / OFFLINE status with strict validation.
 * A driver can only go ONLINE if:
 * 1. Account & Vehicle are verified by Admin
 * 2. Subscription is active
 */
router.post('/toggle-online', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id },
      include: {
        vehicle: true,
        subscriptions: {
          where: {
            status: 'ACTIVE',
            expiryDate: { gt: new Date() }
          }
        }
      }
    });

    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    if (isOnline) {
      // 1. Check Driver Suspension
      if (driver.verificationStatus === 'SUSPENDED') {
        return res.status(403).json({
          error: 'Your driver account has been suspended. Please contact platform support.'
        });
      }

      // 2. Check Driver Account Verification
      if (driver.verificationStatus !== 'APPROVED' || !driver.isVerified) {
        return res.status(403).json({
          error: 'Your driver account is awaiting verification.'
        });
      }

      // 3. Check Vehicle Verification
      if (!driver.vehicle || (!driver.vehicle.isVerified && driver.vehicle.verificationStatus !== 'APPROVED')) {
        return res.status(403).json({
          error: 'Your vehicle documents have not been approved.'
        });
      }

      // 4. Check Subscription Status
      if (!driver.subscriptions || driver.subscriptions.length === 0) {
        return res.status(403).json({
          error: 'Your subscription has expired. Renew your subscription to go online.'
        });
      }
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: { isOnline: Boolean(isOnline) }
    });

    res.json({
      isOnline: updatedDriver.isOnline,
      message: updatedDriver.isOnline ? 'Driver is now ONLINE and discoverable' : 'Driver is now OFFLINE'
    });
  } catch (err) {
    console.error('Toggle online error:', err);
    res.status(500).json({ error: 'Failed to update online status' });
  }
});

/**
 * POST /api/drivers/location
 * Driver mobile app sends GPS location updates
 */
router.post('/location', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { latitude, longitude, heading = 0, speed = 0 } = req.body;
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const location = await prisma.driverLocation.upsert({
      where: { driverId: driver.id },
      update: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        heading: parseFloat(heading),
        speed: parseFloat(speed),
        updatedAt: new Date()
      },
      create: {
        driverId: driver.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        heading: parseFloat(heading),
        speed: parseFloat(speed)
      }
    });

    res.json({ location });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update driver location' });
  }
});

module.exports = router;
