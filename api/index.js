const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Use Supabase connection string directly for serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.nycqjaisiiqphoabbfjz:barbanjO1988%40@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: false, // Transaction poolers usually don't strictly require SSL or handle it transparently, but we can enable if required
});

app.use(cors());
app.use(express.json());

const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes')(pool);
const driverRoutes = require('./routes/driverRoutes')(pool);
const bookingRoutes = require('./routes/bookingRoutes')(pool);
const tourRoutes = require('./routes/tourRoutes')(pool);

// Mount all routes
app.use('/api/ai', aiRoutes);
app.use('/api/notify', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tours', tourRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', location: 'Vercel Serverless', db: 'Supabase Connected' });
});

module.exports = app;
