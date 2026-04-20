
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Route: /api/notify/sms-admin
router.post('/sms-admin', notificationController.sendAdminSMS);

// Route: /api/notify/sms-driver
router.post('/sms-driver', notificationController.sendDriverSMS);

module.exports = router;
