// backend/routes/settingsRoutes.js
// v26.8.0 - Stabilized settings routes

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // GET SETTINGS
    router.get('/', async (req, res) => {
        try {
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
            const result = await pool.query("SELECT * FROM settings WHERE id = 'default'");
            res.json(result.rows[0] || {});
        } catch (err) {
            console.error('Settings Fetch Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // UPDATE SETTINGS
    router.post('/', async (req, res) => {
        const s = req.body;
        try {
            const query = `
                INSERT INTO settings (
                    id, admin_phone_number, commission_rate, maintenance_mode, commission_enabled,
                    sms_api_key, email_service_id, email_template_id, email_public_key,
                    site_title, site_description, background_image_url, min_trip_price,
                    social_facebook, social_instagram, driver_guidelines, ai_system_prompt,
                    global_alert_message, booking_window_days, instant_booking_enabled,
                    tax_rate, currency_symbol, auto_approve_drivers, require_documents,
                    ai_model_temperature, google_maps_api_keys
                )
                VALUES (
                    'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
                )
                ON CONFLICT (id) DO UPDATE SET
                    admin_phone_number = EXCLUDED.admin_phone_number,
                    commission_rate = EXCLUDED.commission_rate,
                    maintenance_mode = EXCLUDED.maintenance_mode,
                    commission_enabled = EXCLUDED.commission_enabled,
                    sms_api_key = EXCLUDED.sms_api_key,
                    email_service_id = EXCLUDED.email_service_id,
                    email_template_id = EXCLUDED.email_template_id,
                    email_public_key = EXCLUDED.email_public_key,
                    site_title = EXCLUDED.site_title,
                    site_description = EXCLUDED.site_description,
                    background_image_url = EXCLUDED.background_image_url,
                    min_trip_price = EXCLUDED.min_trip_price,
                    social_facebook = EXCLUDED.social_facebook,
                    social_instagram = EXCLUDED.social_instagram,
                    driver_guidelines = EXCLUDED.driver_guidelines,
                    ai_system_prompt = EXCLUDED.ai_system_prompt,
                    global_alert_message = EXCLUDED.global_alert_message,
                    booking_window_days = EXCLUDED.booking_window_days,
                    instant_booking_enabled = EXCLUDED.instant_booking_enabled,
                    tax_rate = EXCLUDED.tax_rate,
                    currency_symbol = EXCLUDED.currency_symbol,
                    auto_approve_drivers = EXCLUDED.auto_approve_drivers,
                    require_documents = EXCLUDED.require_documents,
                    ai_model_temperature = EXCLUDED.ai_model_temperature,
                    google_maps_api_keys = EXCLUDED.google_maps_api_keys
                RETURNING *;
            `;
            const values = [
                s.admin_phone_number, s.commission_rate, s.maintenance_mode, s.commission_enabled,
                s.sms_api_key, s.email_service_id, s.email_template_id, s.email_public_key,
                s.site_title, s.site_description, s.background_image_url, s.min_trip_price,
                s.social_facebook, s.social_instagram, s.driver_guidelines, s.ai_system_prompt,
                s.global_alert_message, s.booking_window_days, s.instant_booking_enabled,
                s.tax_rate, s.currency_symbol, s.auto_approve_drivers, s.require_documents,
                s.ai_model_temperature, JSON.stringify(s.google_maps_api_keys || [])
            ];
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Settings Update Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
