const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'documents');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * POST /api/uploads/document
 * Accepts base64 or multipart file payload
 * Allowed types: image/jpeg, image/png, image/jpg, application/pdf
 * Size limit: 5MB (5,242,880 bytes)
 */
router.post('/document', authenticateToken, async (req, res) => {
  try {
    const { docType, fileName, mimeType, base64Data } = req.body;

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'Document file data and mimeType are required' });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid file format. Only JPG, PNG, and PDF documents are accepted.' });
    }

    // Strip data URI prefix if present
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit of 5MB.' });
    }

    const ext = mimeType.split('/')[1] || 'bin';
    const safeFilename = `doc_${req.user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/api/uploads/documents/${safeFilename}`;

    // If docType is provided and user is a driver, record in DriverDocument
    if (docType && req.user.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
      if (driver) {
        await prisma.driverDocument.create({
          data: {
            driverId: driver.id,
            docType,
            fileUrl,
            fileType: mimeType,
            fileSize: buffer.length,
            verificationStatus: 'PENDING'
          }
        });
      }
    }

    res.status(201).json({
      message: 'Document uploaded successfully',
      fileUrl,
      fileName: fileName || safeFilename,
      fileSize: buffer.length,
      fileType: mimeType
    });
  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/uploads/documents/:filename
 * Secure document retrieval route — Gated to document owner or Admin
 */
router.get('/documents/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Role check: Only document owner (filename contains user ID) OR Admin/SuperAdmin
    const isOwner = filename.includes(`doc_${req.user.id}_`);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. Sensitive verification documents are restricted to document owner and authorized administrators only.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

module.exports = router;
