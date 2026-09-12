const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const prisma = require('../db');

/**
 * JWT Authentication Middleware
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account inactive or non-existent' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-Based Access Control Middleware
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles
};
