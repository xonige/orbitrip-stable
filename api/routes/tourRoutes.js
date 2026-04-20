// backend/routes/tourRoutes.js
// v26.8.0 - Stabilized tour logic

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // GET ALL TOURS
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM tours ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (err) {
            console.error('Tours Fetch Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // UPSERT TOUR
    router.post('/', async (req, res) => {
        const t = req.body;
        try {
            const query = `
                INSERT INTO tours (
                    id, title_en, title_ru, description_en, description_ru, 
                    price, base_price, duration, image, category, rating
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                    title_en = EXCLUDED.title_en,
                    title_ru = EXCLUDED.title_ru,
                    description_en = EXCLUDED.description_en,
                    description_ru = EXCLUDED.description_ru,
                    price = EXCLUDED.price,
                    base_price = EXCLUDED.base_price,
                    duration = EXCLUDED.duration,
                    image = EXCLUDED.image,
                    category = EXCLUDED.category,
                    rating = EXCLUDED.rating
                RETURNING *;
            `;
            const values = [
                t.id, t.titleEn || t.title_en, t.titleRu || t.title_ru, 
                t.descriptionEn || t.description_en, t.descriptionRu || t.description_ru, 
                t.price, t.basePrice || t.base_price, t.duration, t.image, t.category, t.rating || 5.0
            ];
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Tour Update Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE TOUR
    router.delete('/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM tours WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
