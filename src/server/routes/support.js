const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { rideId, subject, description, priority = 'MEDIUM' } = req.body;
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        rideId: rideId || null,
        subject,
        description,
        priority
      }
    });
    res.status(201).json({ ticket, message: 'Support ticket created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

module.exports = router;
