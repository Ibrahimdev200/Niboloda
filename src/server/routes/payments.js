const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');
const paymentService = require('../services/paymentService');

/**
 * GET /api/payments/my-transactions
 */
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      include: {
        ride: true,
        subscription: { include: { plan: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/payments/webhook
 * Signature verification simulation & webhook handler
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'] || req.headers['monnify-signature'];
  const isValid = paymentService.validateWebhookSignature(signature, req.body);

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Handle Paystack/Monnify payment success event
  res.json({ status: 'success', message: 'Webhook received' });
});

module.exports = router;
