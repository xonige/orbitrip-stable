// backend/routes/bookingRoutes.js
// v26.8.0 - Stabilized booking logic to fix lead capture failures

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // GET ALL BOOKINGS
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT b.*, d.phone_number AS driver_phone 
                FROM bookings b 
                LEFT JOIN drivers d ON b.driver_id = d.id 
                ORDER BY b.created_at DESC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Bookings Fetch Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // CREATE BOOKING (Lead Capture Fix)
    router.post('/', async (req, res) => {
        const b = req.body;
        try {
            const query = `
                INSERT INTO bookings (
                    id, tour_id, tour_title, customer_name, contact_info, 
                    date, vehicle, guests, numeric_price, total_price, 
                    status, driver_id, driver_name, flight_number, 
                    payment_method, promo_code, gcl_id, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING *;
            `;
            const values = [
                b.id || `book-${Date.now()}`, 
                b.tour_id || b.tourId, 
                b.tour_title || b.tourTitle, 
                b.customer_name || b.customerName, 
                b.contact_info || b.contactInfo, 
                b.date, 
                b.vehicle, 
                b.guests, 
                b.numeric_price || b.numericPrice, 
                b.total_price || b.totalPrice, 
                b.status || 'PENDING', 
                b.driver_id || b.driverId, 
                b.driver_name || b.driverName, 
                b.flight_number || b.flightNumber, 
                b.payment_method || b.paymentMethod, 
                b.promo_code || b.promoCode, 
                b.gcl_id || b.gclid,
                new Date().getTime()
            ];
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } catch (err) { 
            console.error("Booking Create Error (Lead Fail):", err);
            res.status(500).json({ error: err.message }); 
        }
    });

    // PATCH STATUS
    router.patch('/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status, driverId, driverName } = req.body;
        try {
            let query = 'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *';
            let values = [status, id];
            
            if (driverId) {
               query = 'UPDATE bookings SET status = $1, driver_id = $2, driver_name = $3 WHERE id = $4 RETURNING *';
               values = [status, driverId, driverName, id];
            }
            
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Booking Status Update Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
