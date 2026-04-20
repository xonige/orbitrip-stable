// backend/routes/analyticsRoutes.js
// v1.0 — Live Analytics API for Admin Dashboard
// Fetches real-time data from Yandex Metrica and Google Analytics

const express = require('express');
const router = express.Router();
const https = require('https');

// --- CONFIGURATION ---
const YANDEX_COUNTER_ID = '108558502';
const YANDEX_TOKEN = process.env.YANDEX_METRIKA_TOKEN || 'y0__xCE78e2CBjntkAg0barjBc3aqaPGaYw6TZhnuSv0ZSiFtLMxg';
const GA_MEASUREMENT_ID = 'G-Z8H94G2L3R'; // From GTM config

// --- CACHE (avoid hammering APIs) ---
let analyticsCache = { data: null, timestamp: 0 };
const CACHE_TTL = 120_000; // 2 minutes cache

function httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: { ...headers }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve({ raw: data }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// --- YANDEX METRICA FETCHERS ---
async function fetchYandexTraffic() {
    const base = 'https://api-metrika.yandex.net/stat/v1/data';
    const headers = { 'Authorization': `OAuth ${YANDEX_TOKEN}` };

    // 1. Daily visits (last 7 days)
    const dailyUrl = `${base}?ids=${YANDEX_COUNTER_ID}&metrics=ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds&date1=7daysAgo&date2=today&dimensions=ym:s:date&sort=ym:s:date`;
    
    // 2. Traffic sources
    const sourcesUrl = `${base}?ids=${YANDEX_COUNTER_ID}&metrics=ym:s:visits&dimensions=ym:s:lastTrafficSource&date1=7daysAgo&date2=today&sort=-ym:s:visits&limit=10`;
    
    // 3. Geography
    const geoUrl = `${base}?ids=${YANDEX_COUNTER_ID}&metrics=ym:s:visits&dimensions=ym:s:regionCountry,ym:s:regionCity&date1=7daysAgo&date2=today&sort=-ym:s:visits&limit=15`;
    
    // 4. Devices
    const devicesUrl = `${base}?ids=${YANDEX_COUNTER_ID}&metrics=ym:s:visits&dimensions=ym:s:deviceCategory&date1=7daysAgo&date2=today`;
    
    // 5. Top pages
    const pagesUrl = `${base}?ids=${YANDEX_COUNTER_ID}&metrics=ym:s:pageviews&dimensions=ym:s:startURL&date1=7daysAgo&date2=today&sort=-ym:s:pageviews&limit=10`;

    // 6. Today's stats specifically
    const todayUrl = `${base}?ids=${YANDEX_COUNTER_ID}&metrics=ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate&date1=today&date2=today`;

    try {
        const [daily, sources, geo, devices, pages, today] = await Promise.allSettled([
            httpGet(dailyUrl, headers),
            httpGet(sourcesUrl, headers),
            httpGet(geoUrl, headers),
            httpGet(devicesUrl, headers),
            httpGet(pagesUrl, headers),
            httpGet(todayUrl, headers)
        ]);

        // Parse daily traffic
        const dailyData = (daily.status === 'fulfilled' && daily.value.data) 
            ? daily.value.data.map(row => ({
                date: row.dimensions[0].name,
                visits: Math.round(row.metrics[0]),
                users: Math.round(row.metrics[1]),
                pageviews: Math.round(row.metrics[2]),
                bounceRate: Math.round(row.metrics[3]),
                avgDuration: Math.round(row.metrics[4])
            })) : [];

        // Parse sources
        const sourcesData = (sources.status === 'fulfilled' && sources.value.data)
            ? sources.value.data.map(row => ({
                source: row.dimensions[0].name || 'Direct',
                visits: Math.round(row.metrics[0])
            })) : [];

        // Parse geography
        const geoData = (geo.status === 'fulfilled' && geo.value.data)
            ? geo.value.data.map(row => ({
                country: row.dimensions[0]?.name || 'Unknown',
                city: row.dimensions[1]?.name || 'Unknown',
                visits: Math.round(row.metrics[0])
            })) : [];

        // Parse devices
        const devicesData = (devices.status === 'fulfilled' && devices.value.data)
            ? devices.value.data.map(row => ({
                device: row.dimensions[0].name,
                visits: Math.round(row.metrics[0])
            })) : [];

        // Parse top pages
        const pagesData = (pages.status === 'fulfilled' && pages.value.data)
            ? pages.value.data.map(row => ({
                url: row.dimensions[0].name,
                views: Math.round(row.metrics[0])
            })) : [];

        // Parse today
        const todayData = (today.status === 'fulfilled' && today.value.totals)
            ? {
                visits: Math.round(today.value.totals[0]),
                users: Math.round(today.value.totals[1]),
                pageviews: Math.round(today.value.totals[2]),
                bounceRate: Math.round(today.value.totals[3])
            } : { visits: 0, users: 0, pageviews: 0, bounceRate: 0 };

        return {
            daily: dailyData,
            sources: sourcesData,
            geography: geoData,
            devices: devicesData,
            topPages: pagesData,
            today: todayData
        };
    } catch (err) {
        console.error('Yandex Metrica fetch error:', err.message);
        return { daily: [], sources: [], geography: [], devices: [], topPages: [], today: { visits: 0, users: 0, pageviews: 0, bounceRate: 0 }, error: err.message };
    }
}

// --- MAIN ENDPOINT ---
router.get('/live', async (req, res) => {
    try {
        const now = Date.now();
        
        // Return cached data if fresh
        if (analyticsCache.data && (now - analyticsCache.timestamp) < CACHE_TTL) {
            return res.json({ ...analyticsCache.data, cached: true, cacheAge: Math.round((now - analyticsCache.timestamp) / 1000) });
        }

        console.log('[Analytics] Fetching fresh data from Yandex Metrica...');
        const yandex = await fetchYandexTraffic();

        const result = {
            yandex,
            fetchedAt: new Date().toISOString(),
            cached: false
        };

        // Update cache
        analyticsCache = { data: result, timestamp: now };

        res.json(result);
    } catch (err) {
        console.error('[Analytics] Error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
    }
});

module.exports = router;
