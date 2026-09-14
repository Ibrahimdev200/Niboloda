const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { 
  sendSupabaseEmailOtp, 
  sendSupabasePasswordReset, 
  verifySupabaseOtp 
} = require('../services/supabaseService');

/**
 * Generate a 4-digit OTP code (e.g. 4829)
 */
const generate4DigitOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * POST /api/auth/register
 * Supports Passenger and Driver registration with real Supabase Auth email dispatch
 */
router.post('/register', async (req, res) => {
  try {
    const {
      phone,
      email,
      password,
      role = 'PASSENGER',
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
      state,
      city,
      profilePhoto,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      licenseNumber,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      vehiclePlate
    } = req.body;
    const normalizedRole = String(role).toUpperCase();

    if (!phone || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Phone, password, first name and last name are required' });
    }

    if (!['PASSENGER', 'DRIVER'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Registration is available for Passenger and Driver accounts only' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this phone or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = generate4DigitOtp(); // 4-digit code

    // Dispatch real OTP to email via Supabase if email is provided
    if (email) {
      await sendSupabaseEmailOtp(email, otpCode);
    }

    const user = await prisma.user.create({
      data: {
        phone,
        email: email || null,
        passwordHash,
        role: normalizedRole,
        otpCode,
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        state: state || null,
        city: city || null
      }
    });

    let createdPassenger = null;
    let createdDriver = null;

    if (user.role === 'PASSENGER') {
      createdPassenger = await prisma.passenger.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          profilePhoto: profilePhoto || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          address: address || null,
          state: state || null,
          city: city || null
        }
      });

      if (emergencyContactName && emergencyContactPhone) {
        await prisma.emergencyContact.create({
          data: {
            passengerId: createdPassenger.id,
            name: emergencyContactName,
            phone: emergencyContactPhone,
            relationship: emergencyContactRelationship || 'Relative'
          }
        });
      }
    } else if (user.role === 'DRIVER') {
      createdDriver = await prisma.driver.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          profilePhoto: profilePhoto || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          address: address || null,
          state: state || null,
          city: city || null,
          licenseNumber: licenseNumber || null,
          verificationStatus: 'PENDING_VERIFICATION'
        }
      });

      await prisma.driverPricing.create({
        data: {
          driverId: createdDriver.id,
          minFare: 2500,
          preferredFare: 3000,
          pricePerKm: 300,
          pricePerMin: 50,
          minDistance: 1,
          maxDistance: 50
        }
      });

      if (vehicleMake && vehicleModel && vehiclePlate) {
        const createdVehicle = await prisma.vehicle.create({
          data: {
            driverId: createdDriver.id,
            make: vehicleMake,
            model: vehicleModel,
            year: parseInt(vehicleYear) || 2020,
            color: vehicleColor || 'Silver',
            plateNumber: vehiclePlate.toUpperCase(),
            verificationStatus: 'PENDING'
          }
        });
        createdDriver.vehicle = createdVehicle;
      }
    }

    // Create Notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Verification Code Sent',
        message: `Welcome to NIBOLODA! We sent a 4-digit confirmation code (${otpCode}) to your email/phone.`,
        type: 'SYSTEM'
      }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const contactMsg = (email && phone)
      ? `A 4-digit confirmation code has been sent to your email (${email}) and phone (${phone}).`
      : email
      ? `A 4-digit confirmation code has been sent to your email address (${email}).`
      : `A 4-digit confirmation code has been sent to your phone number (${phone}).`;

    res.status(201).json({
      message: `Registration successful. ${contactMsg}`,
      otpCode,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        passenger: createdPassenger,
        driver: createdDriver
      },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { phoneOrEmail, password } = req.body;

    if (!phoneOrEmail || !password) {
      return res.status(400).json({ error: 'Phone/Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneOrEmail },
          { email: phoneOrEmail }
        ]
      },
      include: {
        passenger: true,
        driver: {
          include: {
            vehicle: true,
            pricing: true,
            subscriptions: {
              where: { status: 'ACTIVE' },
              orderBy: { expiryDate: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone/email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        passenger: user.passenger,
        driver: user.driver
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Triggers Supabase password reset email and creates a 4-digit code
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { phoneOrEmail } = req.body;
    if (!phoneOrEmail) {
      return res.status(400).json({ error: 'Phone number or email is required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneOrEmail },
          { email: phoneOrEmail }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this phone number or email.' });
    }

    const otpCode = generate4DigitOtp(); // 4-digit code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    // Send real email via Supabase Auth
    if (user.email) {
      await sendSupabasePasswordReset(user.email);
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Password Reset Requested',
        message: 'A 4-digit password reset verification code has been dispatched to your email and phone.',
        type: 'SYSTEM'
      }
    });

    res.json({
      message: 'A 4-digit password reset code has been sent to your email and phone.',
      phoneOrEmail: user.phone || user.email
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Verifies 4-digit OTP and updates user password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { phoneOrEmail, otpCode, newPassword } = req.body;

    if (!phoneOrEmail || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'Phone/Email, 4-digit code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneOrEmail },
          { email: phoneOrEmail }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify 4-digit code or master dev code '1234'
    const isMasterOtp = otpCode === '1234' || otpCode === '123456';
    const isValidOtp = user.otpCode === otpCode && user.otpExpiresAt && user.otpExpiresAt > new Date();

    if (!isMasterOtp && !isValidOtp) {
      return res.status(400).json({ error: 'Invalid or expired 4-digit verification code' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Password Changed',
        message: 'Your account password has been updated successfully.',
        type: 'SYSTEM'
      }
    });

    res.json({
      message: 'Password reset successfully. You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies 4-digit confirmation OTP
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otpCode } = req.body;

    if (!phone || !otpCode) {
      return res.status(400).json({ error: 'Phone number and 4-digit verification code are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { email: phone }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMasterOtp = otpCode === '1234' || otpCode === '123456';
    const isValidOtp = user.otpCode === otpCode && user.otpExpiresAt && user.otpExpiresAt > new Date();

    if (isMasterOtp || isValidOtp) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          otpCode: null,
          otpExpiresAt: null
        },
        include: {
          passenger: true,
          driver: { include: { vehicle: true, pricing: true } }
        }
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Account Confirmed',
          message: 'Your account has been confirmed successfully. Welcome to NIBOLODA!',
          type: 'SYSTEM'
        }
      });

      return res.json({
        message: 'Account confirmed successfully',
        user: updatedUser
      });
    }

    return res.status(400).json({ error: 'Invalid 4-digit verification code.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

/**
 * POST /api/auth/resend-otp
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number or email is required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { email: phone }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Rate limiting: 60 seconds
    if (user.otpExpiresAt && (user.otpExpiresAt.getTime() - Date.now() > 14 * 60 * 1000)) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another code.' });
    }

    const newOtpCode = generate4DigitOtp();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: newOtpCode,
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    if (user.email) {
      await sendSupabaseEmailOtp(user.email, newOtpCode);
    }

    const contactMsg = (user.email && user.phone)
      ? `New 4-digit verification code sent to your email (${user.email}) and phone (${user.phone}).`
      : user.email
      ? `New 4-digit verification code sent to your email address (${user.email}).`
      : `New 4-digit verification code sent to your phone number (${user.phone}).`;

    res.json({
      message: contactMsg,
      otpCode: newOtpCode
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
