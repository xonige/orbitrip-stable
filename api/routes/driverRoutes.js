// backend/routes/driverRoutes.js
// v26.8.0 - Stabilized driver management routes

const express = require('express');
const router = express.Router();

module.exports = (pool) => {

    // GET MINIMUM RATE (cheapest driver's km rate)
    router.get('/min-rate', async (req, res) => {
        try {
            const result = await pool.query('SELECT MIN(price_per_km) as min_rate FROM drivers WHERE status = \'ACTIVE\' AND price_per_km > 0');
            const minRate = parseFloat(result.rows[0].min_rate) || 0.60;
            res.json({ minRate });
        } catch (err) {
            console.error('Error fetching min rate:', err);
            res.status(500).json({ error: 'Failed to fetch min rate' });
        }
    });

    // GET ALL DRIVERS (Active only + Cached)
    router.get('/', async (req, res) => {
        try {
            // V26.8.8 FIX: Added reviews, car_photos, review_count to SELECT
            const query = `
                SELECT 
                    id, name, city, status, price_per_km, base_price, daily_salary, 
                    photo_url, car_photo_url, car_model, vehicle_type, 
                    car_photos, languages, features, max_passengers, 
                    rating, reviews, created_at,
                    COALESCE(jsonb_array_length(reviews), 0) as review_count
                FROM drivers 
                WHERE status = 'ACTIVE' 
                ORDER BY rating DESC, created_at DESC
            `;
            const result = await pool.query(query);
            // Map snake_case to camelCase for frontend compatibility
            const drivers = result.rows.map(d => ({
                ...d,
                photoUrl: d.photo_url,
                carPhotoUrl: d.car_photo_url,
                carPhotos: d.car_photos || [],
                carModel: d.car_model,
                vehicleType: d.vehicle_type,
                maxPassengers: d.max_passengers,
                pricePerKm: d.price_per_km,
                basePrice: d.base_price,
                reviews: d.reviews || [],
                reviewCount: d.review_count || 0,
            }));
            res.json(drivers);

        } catch (err) {
            console.error('Drivers Fetch Error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET FULL DATA FOR ADMIN (Bypass cache)
    router.get('/full', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM drivers ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // UPSERT DRIVER
    router.post('/', async (req, res) => {
        const d = req.body;
        try {
            const query = `
                INSERT INTO drivers (
                    id, name, email, password, phone_number, city, status, 
                    price_per_km, base_price, daily_salary, expense_per_100km, fuel_type, debt, 
                    photo_url, car_photo_url, car_model, vehicle_type, 
                    car_photos, languages, features, 
                    max_passengers, rating, documents
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name, 
                    email = EXCLUDED.email,
                    password = EXCLUDED.password,
                    phone_number = EXCLUDED.phone_number,
                    city = EXCLUDED.city,
                    status = EXCLUDED.status, 
                    price_per_km = EXCLUDED.price_per_km,
                    base_price = EXCLUDED.base_price,
                    daily_salary = EXCLUDED.daily_salary,
                    expense_per_100km = EXCLUDED.expense_per_100km,
                    fuel_type = EXCLUDED.fuel_type,
                    debt = EXCLUDED.debt,
                    photo_url = EXCLUDED.photo_url,
                    car_photo_url = EXCLUDED.car_photo_url,
                    car_model = EXCLUDED.car_model,
                    vehicle_type = EXCLUDED.vehicle_type,
                    car_photos = EXCLUDED.car_photos,
                    languages = EXCLUDED.languages,
                    features = EXCLUDED.features,
                    max_passengers = EXCLUDED.max_passengers,
                    rating = EXCLUDED.rating,
                    documents = EXCLUDED.documents
                RETURNING *;
            `;
            const values = [
                d.id, d.name, d.email, d.password, d.phone_number || d.phoneNumber, d.city, d.status || 'PENDING',
                d.price_per_km || d.pricePerKm || 1.2, d.base_price || d.basePrice || 30, d.daily_salary || d.dailySalary || 50, 
                d.expense_per_100km || d.expensePer100km || 30, d.fuel_type || d.fuelType || 'Petrol',
                d.debt || 0,
                d.photo_url || d.photoUrl, d.car_photo_url || d.carPhotoUrl, d.car_model || d.carModel, d.vehicle_type || d.vehicleType,
                d.car_photos || d.carPhotos || [],
                d.languages || ['EN'],
                d.features || [],
                d.max_passengers || d.maxPassengers || 4,
                d.rating || 5.0,
                JSON.stringify(d.documents || [])
            ];
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Driver Save Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE DRIVER
    router.delete('/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM drivers WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
