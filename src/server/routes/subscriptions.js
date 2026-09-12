const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const paymentService = require('../services/paymentService');

/**
 * GET /api/subscriptions/plans
 * List available driver subscription plans stored in DB
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

/**
 * POST /api/subscriptions/subscribe
 * Driver subscribes to a plan via Paystack abstraction
 */
router.post('/subscribe', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { planId } = req.body;
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id },
      include: { user: true }
    });

    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive subscription plan' });
    }

    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    // Initialize payment via abstraction
    const paymentInit = await paymentService.initializePayment({
      userId: req.user.id,
      amount: plan.price,
      email: driver.user.email,
      phone: driver.user.phone,
      type: 'DRIVER_SUBSCRIPTION',
      metadata: { planId: plan.id, driverId: driver.id }
    });

    // Create Subscription record
    const subscription = await prisma.subscription.create({
      data: {
        driverId: driver.id,
        planId: plan.id,
        status: 'ACTIVE', // Instantly activated for dev/test flow
        startDate,
        expiryDate,
        paymentRef: paymentInit.reference,
        amountPaid: plan.price
      },
      include: { plan: true }
    });

    // Create Payment transaction log
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId: req.user.id,
        amount: plan.price,
        provider: paymentInit.provider,
        providerRef: paymentInit.reference,
        status: 'SUCCESS',
        type: 'DRIVER_SUBSCRIPTION',
        gatewayFee: paymentInit.gatewayFee,
        driverEarnings: 0.0,
        commission: plan.price
      }
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Subscription Activated',
        message: `Your ${plan.name} plan is now ACTIVE until ${expiryDate.toLocaleDateString()}`,
        type: 'SUBSCRIPTION'
      }
    });

    res.status(201).json({
      subscription,
      payment: paymentInit,
      message: `${plan.name} subscribed and activated successfully`
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to process subscription' });
  }
});

/**
 * GET /api/subscriptions/my-status
 */
router.get('/my-status', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
        expiryDate: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { expiryDate: 'desc' }
    });

    // Check if subscription has expired and automatically update driver online status if so
    if (!activeSubscription && driver.isOnline) {
      await prisma.driver.update({
        where: { id: driver.id },
        data: { isOnline: false }
      });
    }

    res.json({
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

module.exports = router;
