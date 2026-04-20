
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Route: /api/ai/plan-trip
router.post('/plan-trip', aiController.planTrip);

// Route: /api/ai/travel-advice
router.post('/travel-advice', aiController.getTravelAdvice);

// Route: /api/ai/analyze-image
router.post('/analyze-image', aiController.analyzeImage);

module.exports = router;
