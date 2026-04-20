import { MOCK_DRIVERS } from "./mockDrivers";
import { Tour, Booking, Driver, SystemSettings, SmsLog, PromoCode, TripSearch, VehicleType, Review, DriverDocument, AnalyticsEvent } from '../types';
import { API_BASE_URL } from './apiConfig';
import { generateReviewsForDriver } from './reviewGenerator';

/**
 * --- ORBITRIP DATABASE SERVICE (REST API MODE WITH MOCK FALLBACK) ---
 * Connects to local Node.js/PostgreSQL backend via /api endpoints.
 * Falls back to static mock data if the API is unreachable (Network Error).
 */

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orbitrip-db-change'));
    }
};

const triggerPromoUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orbitrip-promo-change'));
    }
};

// --- DATA SANITIZERS ---
const safeString = (val: any, def = ''): string => {
    if (val === null || val === undefined) return def;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

const safeNumber = (val: any, def = 0): number => {
    if (val === null || val === undefined) return def;
    if (typeof val === 'number') return isNaN(val) ? def : val;
    if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]/g, '');
        if (!cleaned) return def;
        const num = parseFloat(cleaned);
        return isNaN(num) ? def : num;
    }
    return def;
};

const safeBoolean = (val: any, def = true): boolean => {
    if (val === null || val === undefined) return def;
    if (val === true || val === 'true' || val === 1) return true;
    return false;
};

const safeArray = <T>(val: any, def: T[] = []): T[] => {
    if (val === null || val === undefined) return def;
    if (Array.isArray(val)) return val;
    try { 
        if (typeof val === 'string') {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : def;
        }
    } catch (e) { return def; }
    return def;
};

const getVal = (obj: any, keyCamel: string, keySnake: string) => {
    if (!obj) return undefined;
    if (obj[keyCamel] !== undefined) return obj[keyCamel];
    if (obj[keySnake] !== undefined) return obj[keySnake];
    return undefined;
};

// --- DEFAULTS ---
const DEFAULT_SMS_KEY = ''; 
const DEFAULT_ADMIN_PHONE = '995593456876';
const DEFAULT_COMMISSION = 0.13; 
// Updated Background to b.png - FORCE LOCAL PATH
const DEFAULT_BG_IMAGE = '/b.png';

// --- LOCAL STORAGE KEYS ---
const STORAGE_KEYS = {
    TOURS: 'orbitrip_mock_tours',
    DRIVERS: 'orbitrip_mock_drivers',
    BOOKINGS: 'orbitrip_mock_bookings',
    PROMOS: 'orbitrip_mock_promos',
    ACTIVE_SESSION_PROMO: 'orbitrip_active_session_promo'
};

// --- MOCK DATA FOR FALLBACK ---
const MOCK_TOURS: Tour[] = [
    {
        id: 'tour-kazbegi',
        titleEn: 'Tbilisi → Kazbegi (Full Day)',
        titleRu: 'Тбилиси → Казбеги (Полный день)',
        descriptionEn: 'The most iconic route in Georgia. Drive along the legendary Georgian Military Highway through Ananuri Fortress, stop at Gudauri for breathtaking panoramic views, and reach the legendary Gergeti Trinity Church against the backdrop of Mount Kazbek.',
        descriptionRu: 'Самый культовый маршрут Грузии. Проехать по Военно-Грузинской дороге через крепость Ананури, остановиться у смотровой площадки Гудаури и добраться до Троицкой церкви Гергети на фоне горы Казбек.',
        price: 'From 220 GEL', basePrice: 220, pricePerPerson: 0, duration: '8-9 Hours',
        image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=80',
        rating: 4.9, category: 'MOUNTAINS',
        highlightsEn: ["Ananuri Fortress", "Jinvali Reservoir", "Gudauri Viewpoint (2200m)", "Gergeti Trinity Church"],
        highlightsRu: ["Крепость Ананури", "Жинвальское водохранилище", "Смотровая Гудаури (2200м)", "Церковь Гергети"],
        itineraryEn: ["Pickup from your hotel in Tbilisi", "Drive to Ananuri Fortress (1h)", "Photo stop at Jinvali Lake", "Scenic stop at Gudauri Viewpoint", "Arrive at Kazbegi — optional Jeep to Gergeti Church", "Free time for lunch in Stepantsminda", "Return to Tbilisi"],
        itineraryRu: ["Встреча у отеля в Тбилиси", "Поездка к крепости Ананури (1ч)", "Фото у Жинвальского водохранилища", "Остановка у смотровой Гудаури", "Прибытие в Казбеги — опциональный джип к церкви Гергети", "Свободное время на обед в Степанцминде", "Возврат в Тбилиси"],
        routeStops: ["Tbilisi", "Ananuri", "Gudauri", "Kazbegi (Stepantsminda)"],
        priceOptions: [{ vehicle: 'Sedan', price: '220 GEL', guests: '1-4' }, { vehicle: 'Minivan', price: '300 GEL', guests: '5-7' }],
        pricesByCity: { 'tbilisi': 220, 'kutaisi': 450, 'batumi': 550 },
        reviews: []
    },
    {
        id: 'tour-kakheti',
        titleEn: 'Kakheti Wine Tour (Full Day)',
        titleRu: 'Винный тур по Кахетии (Полный день)',
        descriptionEn: 'Explore Georgia\'s premier wine region. Visit ancient monasteries, taste traditional Qvevri wines in family cellars, and enjoy stunning views of the Alazani Valley. Includes stops at Sighnaghi — the "City of Love".',
        descriptionRu: 'Откройте для себя главный винный регион Грузии. Посетите древние монастыри, попробуйте вино из квеври в семейных погребах и насладитесь видами Алазанской долины. Включает остановку в Сигнаги — «Городе любви».',
        price: 'From 200 GEL', basePrice: 200, pricePerPerson: 0, duration: '9-10 Hours',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80',
        rating: 4.8, category: 'WINE',
        highlightsEn: ["Sighnaghi — City of Love", "Bodbe Monastery", "Wine tasting in family cellar", "Alazani Valley views"],
        highlightsRu: ["Сигнаги — Город любви", "Монастырь Бодбе", "Дегустация в семейном погребе", "Виды Алазанской долины"],
        itineraryEn: ["Pickup in Tbilisi", "Drive to Sighnaghi (1.5h)", "Walk through the old town", "Visit Bodbe Monastery", "Wine tasting at local winery", "Lunch at traditional restaurant", "Return to Tbilisi"],
        itineraryRu: ["Встреча в Тбилиси", "Поездка в Сигнаги (1.5ч)", "Прогулка по старому городу", "Посещение монастыря Бодбе", "Дегустация вин", "Обед в традиционном ресторане", "Возврат в Тбилиси"],
        routeStops: ["Tbilisi", "Sighnaghi", "Bodbe", "Kvareli"],
        priceOptions: [{ vehicle: 'Sedan', price: '200 GEL', guests: '1-4' }, { vehicle: 'Minivan', price: '280 GEL', guests: '5-7' }],
        pricesByCity: { 'tbilisi': 200, 'kutaisi': 450, 'batumi': 550 },
        reviews: []
    },
    {
        id: 'tour-mtskheta',
        titleEn: 'Mtskheta & Jvari (Half Day)',
        titleRu: 'Мцхета и Джвари (Полдня)',
        descriptionEn: 'Visit the ancient capital of Georgia, a UNESCO World Heritage Site. See the iconic Jvari Monastery perched on a hilltop where two rivers meet, and explore Svetitskhoveli Cathedral — one of the oldest churches in the world.',
        descriptionRu: 'Посетите древнюю столицу Грузии, объект Всемирного наследия ЮНЕСКО. Увидьте монастырь Джвари на слиянии двух рек и собор Светицховели — один из старейших храмов мира.',
        price: 'From 80 GEL', basePrice: 80, pricePerPerson: 0, duration: '3-4 Hours',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80',
        rating: 4.9, category: 'CULTURE',
        highlightsEn: ["Jvari Monastery (6th century)", "Svetitskhoveli Cathedral", "UNESCO World Heritage", "Confluence of Aragvi & Mtkvari rivers"],
        highlightsRu: ["Монастырь Джвари (VI век)", "Собор Светицховели", "Наследие ЮНЕСКО", "Слияние Арагви и Куры"],
        itineraryEn: ["Pickup in Tbilisi", "Drive to Jvari Monastery (30 min)", "Panoramic views at the hilltop", "Visit Svetitskhoveli Cathedral", "Free time to explore old Mtskheta", "Return to Tbilisi"],
        itineraryRu: ["Встреча в Тбилиси", "Поездка к Джвари (30 мин)", "Панорамные виды с холма", "Посещение Светицховели", "Свободное время в старой Мцхете", "Возврат в Тбилиси"],
        routeStops: ["Tbilisi", "Jvari", "Mtskheta"],
        priceOptions: [{ vehicle: 'Sedan', price: '80 GEL', guests: '1-4' }],
        pricesByCity: { 'tbilisi': 80, 'kutaisi': 350, 'batumi': 450 },
        reviews: []
    },
    {
        id: 'tour-prometheus',
        titleEn: 'Prometheus Cave & Okatse Canyon (from Kutaisi)',
        titleRu: 'Пещера Прометея и каньон Окаце (из Кутаиси)',
        descriptionEn: 'Discover two of western Georgia\'s natural wonders in one day. Walk through the illuminated chambers of Prometheus Cave with underground rivers, then cross the hanging walkway of Okatse Canyon suspended 140m above the valley floor.',
        descriptionRu: 'Откройте два природных чуда западной Грузии за один день. Пройдите через освещенные залы пещеры Прометея с подземными реками, затем пересеките подвесную тропу каньона Окаце на высоте 140м.',
        price: 'From 120 GEL', basePrice: 120, pricePerPerson: 0, duration: '6-7 Hours',
        image: 'https://images.unsplash.com/photo-1504870712357-65ea720d6078?auto=format&fit=crop&q=80',
        rating: 4.8, category: 'NATURE',
        highlightsEn: ["Prometheus Cave — underground river boat ride", "Okatse Canyon — 140m hanging walkway", "Stunning Imereti countryside", "Great for families"],
        highlightsRu: ["Пещера Прометея — катание на лодке по подземной реке", "Каньон Окаце — подвесная тропа 140м", "Красоты Имерети", "Подходит для семей"],
        priceOptions: [{ vehicle: 'Sedan', price: '120 GEL', guests: '1-4' }, { vehicle: 'Minivan', price: '200 GEL', guests: '5-7' }],
        pricesByCity: { 'kutaisi': 120, 'batumi': 220, 'tbilisi': 350 },
        itineraryEn: ["Pickup in Kutaisi", "Drive to Prometheus Cave (30 min)", "Cave tour with boat ride (~1h)", "Drive to Okatse Canyon (40 min)", "Walk along the canyon trail", "Return to Kutaisi"],
        itineraryRu: ["Встреча в Кутаиси", "Поездка к пещере Прометея (30 мин)", "Экскурсия с лодкой (~1ч)", "Поездка к каньону Окаце (40 мин)", "Прогулка по тропе каньона", "Возврат в Кутаиси"],
        routeStops: ["Kutaisi", "Prometheus Cave", "Okatse Canyon"],
        reviews: []
    },
    {
        id: 'tour-borjomi-vardzia',
        titleEn: 'Borjomi & Vardzia (Full Day)',
        titleRu: 'Боржоми и Вардзия (Полный день)',
        descriptionEn: 'Combine the famous Borjomi mineral water springs with the ancient cave city of Vardzia — a stunning 12th-century monastery carved into a cliff face with over 600 rooms. One of the most impressive sights in the Caucasus.',
        descriptionRu: 'Совместите знаменитые минеральные источники Боржоми с древним пещерным городом Вардзия — великолепным монастырём XII века, вырубленным в скале, с более чем 600 помещениями.',
        price: 'From 280 GEL', basePrice: 280, pricePerPerson: 0, duration: '10-12 Hours',
        image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&q=80',
        rating: 4.7, category: 'CULTURE',
        highlightsEn: ["Borjomi Central Park & mineral springs", "Rabati Castle in Akhaltsikhe", "Vardzia Cave City (12th century)", "Scenic mountain drive"],
        highlightsRu: ["Центральный парк Боржоми и источники", "Крепость Рабати в Ахалцихе", "Пещерный город Вардзия (XII век)", "Живописная горная дорога"],
        itineraryEn: ["Pickup in Tbilisi (early morning)", "Drive to Borjomi (2.5h)", "Taste mineral water at the source", "Continue to Akhaltsikhe — visit Rabati Castle", "Drive to Vardzia cave monastery", "Explore the caves", "Return to Tbilisi"],
        itineraryRu: ["Встреча в Тбилиси (раннее утро)", "Поездка в Боржоми (2.5ч)", "Дегустация воды у источника", "Далее в Ахалцихе — крепость Рабати", "Поездка к пещерному монастырю Вардзия", "Осмотр пещер", "Возврат в Тбилиси"],
        routeStops: ["Tbilisi", "Borjomi", "Akhaltsikhe", "Vardzia"],
        priceOptions: [{ vehicle: 'Sedan', price: '280 GEL', guests: '1-4' }, { vehicle: 'Minivan', price: '380 GEL', guests: '5-7' }],
        reviews: []
    },
    {
        id: 'tour-martvili',
        titleEn: 'Martvili Canyon Boat Tour (from Kutaisi)',
        titleRu: 'Каньон Мартвили на лодке (из Кутаиси)',
        descriptionEn: 'Glide through the emerald waters of Martvili Canyon on a magical boat ride between towering cliffs covered in lush vegetation. A hidden paradise of western Georgia that feels like a fairy tale.',
        descriptionRu: 'Проплывите по изумрудным водам каньона Мартвили на волшебной лодочной прогулке между высокими скалами, покрытыми пышной растительностью. Скрытый рай западной Грузии.',
        price: 'From 100 GEL', basePrice: 100, pricePerPerson: 0, duration: '4-5 Hours',
        image: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&q=80',
        rating: 4.8, category: 'NATURE',
        highlightsEn: ["Boat ride through the canyon", "Emerald green water", "Waterfalls & lush nature", "Short & family-friendly"],
        highlightsRu: ["Лодочная прогулка по каньону", "Изумрудная вода", "Водопады и природа", "Короткий тур, подходит для семей"],
        itineraryEn: ["Pickup in Kutaisi", "Drive to Martvili Canyon (40 min)", "Boat ride through the canyon", "Walk along the upper trail", "Return to Kutaisi"],
        itineraryRu: ["Встреча в Кутаиси", "Поездка к каньону Мартвили (40 мин)", "Лодочная прогулка по каньону", "Прогулка по верхней тропе", "Возврат в Кутаиси"],
        routeStops: ["Kutaisi", "Martvili Canyon"],
        priceOptions: [{ vehicle: 'Sedan', price: '100 GEL', guests: '1-4' }],
        reviews: []
    },
    {
        id: 'tour-batumi-gonio',
        titleEn: 'Batumi & Gonio Fortress (Half Day)',
        titleRu: 'Батуми и крепость Гонио (Полдня)',
        descriptionEn: 'Explore the vibrant coastal city of Batumi — from the modern boulevard and dancing fountains to the ancient Roman-era Gonio Fortress. Perfect for a relaxed half-day by the Black Sea.',
        descriptionRu: 'Исследуйте яркий приморский город Батуми — от современного бульвара и танцующих фонтанов до древнеримской крепости Гонио. Идеально для спокойного полудня у Чёрного моря.',
        price: 'From 70 GEL', basePrice: 70, pricePerPerson: 0, duration: '3-4 Hours',
        image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80',
        rating: 4.7, category: 'SEA',
        highlightsEn: ["Batumi Boulevard & seaside", "Gonio Fortress (Roman era)", "Ali & Nino statue", "Alphabet Tower"],
        highlightsRu: ["Батумский бульвар и набережная", "Крепость Гонио (римская эпоха)", "Статуя Али и Нино", "Башня Алфавита"],
        itineraryEn: ["Pickup in Batumi", "Drive along the coast to Gonio (15 min)", "Explore Gonio Fortress", "Return to Batumi — walk the Boulevard", "Return to hotel"],
        itineraryRu: ["Встреча в Батуми", "Поездка вдоль побережья к Гонио (15 мин)", "Осмотр крепости Гонио", "Возврат в Батуми — прогулка по бульвару", "Возврат в отель"],
        routeStops: ["Batumi", "Gonio"],
        priceOptions: [{ vehicle: 'Sedan', price: '70 GEL', guests: '1-4' }],
        reviews: []
    },
    {
        id: 'tour-david-gareja',
        titleEn: 'David Gareja Monastery (Full Day)',
        titleRu: 'Монастырь Давид Гареджа (Полный день)',
        descriptionEn: 'Journey to the remote and awe-inspiring David Gareja monastery complex carved into the semi-desert cliffs on the Azerbaijan border. Ancient frescoes, dramatic landscapes, and a true sense of solitude make this unforgettable.',
        descriptionRu: 'Путешествие к удалённому и впечатляющему комплексу Давид Гареджа, вырубленному в полупустынных скалах на границе с Азербайджаном. Древние фрески, драматические пейзажи и ощущение уединения.',
        price: 'From 180 GEL', basePrice: 180, pricePerPerson: 0, duration: '7-8 Hours',
        image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80',
        rating: 4.8, category: 'CULTURE',
        highlightsEn: ["6th-century cave monastery", "Ancient frescoes", "Semi-desert landscape", "Azerbaijan border views"],
        highlightsRu: ["Пещерный монастырь VI века", "Древние фрески", "Полупустынный ландшафт", "Виды на границу с Азербайджаном"],
        itineraryEn: ["Pickup in Tbilisi", "Drive through semi-desert (2h)", "Arrive at David Gareja", "Hike to Udabno monastery (cave frescoes)", "Free time & panoramic views", "Return to Tbilisi"],
        itineraryRu: ["Встреча в Тбилиси", "Поездка через полупустыню (2ч)", "Прибытие в Давид Гареджа", "Подъем к монастырю Удабно (фрески)", "Свободное время и панорамные виды", "Возврат в Тбилиси"],
        routeStops: ["Tbilisi", "David Gareja"],
        priceOptions: [{ vehicle: 'Sedan', price: '180 GEL', guests: '1-4' }, { vehicle: 'SUV', price: '250 GEL', guests: '1-4' }],
        reviews: []
    }
];

export { MOCK_DRIVERS } from './mockDrivers';


const MOCK_SETTINGS: SystemSettings = {
    id: 'default',
    smsApiKey: '',
    adminPhoneNumber: '995593456876',
    commissionRate: 0.13,
    smsEnabled: false,
    emailServiceId: '',
    emailTemplateId: '',
    emailPublicKey: '',
    backgroundImageUrl: DEFAULT_BG_IMAGE,
    minTripPrice: 30,
    siteTitle: 'OrbiTrip Georgia',
    siteDescription: 'Private transfers',
    maintenanceMode: false,
    googleMapsApiKeys: []
};

// Generic Fetch Wrapper
const api = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const config: RequestInit = { method, headers };
        if (body) config.body = JSON.stringify(body);
        
        // Add cache-busting for GET requests to ensures data freshness through proxies/CDN
        const cacheBust = method === 'GET' ? (endpoint.includes('?') ? `&v=${Date.now()}` : `?v=${Date.now()}`) : '';
        const url = API_BASE_URL ? `${API_BASE_URL}/api/${endpoint}${cacheBust}` : `/api/${endpoint}${cacheBust}`;
        
        const response = await fetch(url, config);

        if (!response.ok) {
            // Silently fail for 404/500 to fallback
            return null;
        }
        return await response.json();
    } catch (e) {
        // Network error - silent fallback
        return null;
    }
};

// --- DATA MAPPING HELPERS ---
const mapDriver = (d: any): Driver => {
    let reviews = safeArray<Review>(d.reviews);
    let rating = Number(d.rating) || 4.8;
    // V29.0.1 — SENIOR STABILITY: Resilient reviews mapping
    let reviewCount = safeNumber(getVal(d, 'reviewCount', 'review_count'), reviews.length);
    
    if (!reviews || reviews.length === 0) {
        const strId = safeString(d.id, 'drv');
        const deterministicCount = reviewCount > 0 ? reviewCount : (20 + (strId.charCodeAt(strId.length - 1) % 15) * 3);
        const generated = generateReviewsForDriver(
            safeString(d.name, 'Driver'), 
            safeString(getVal(d, 'carModel', 'car_model'), 'Car'), 
            safeString(d.city, 'tbilisi'), 
            deterministicCount
        );
        reviews = generated.reviews;
        if (rating < 3.5) rating = generated.rating; 
        reviewCount = reviews.length;
    }
    
    let dbPhoto = safeString(getVal(d, 'carPhotoUrl', 'car_photo_url'));
    // V26.9.0 - Photos restored from SQL backup, no suppression needed

    return {
        id: safeString(d.id),
        name: safeString(d.name),
        email: safeString(d.email),
        password: safeString(d.password),
        phoneNumber: safeString(getVal(d, 'phoneNumber', 'phone_number')),
        city: safeString(d.city, 'tbilisi'),
        photoUrl: safeString(getVal(d, 'photoUrl', 'photo_url')) || `https://i.pravatar.cc/300?u=${d.id}`,
        carModel: safeString(getVal(d, 'carModel', 'car_model')),
        carPhotoUrl: dbPhoto,
        // V24.8.2 - SENIOR FIX: Removed cache-busting timestamp on array images
        carPhotos: Array.isArray(d.car_photos) ? d.car_photos : [],
        vehicleType: (d.vehicle_type || d.vehicleType) as VehicleType, 
        status: d.status, 
        rating: rating,
        reviewCount,
        reviews,
        pricePerKm: safeNumber(getVal(d, 'pricePerKm', 'price_per_km')),
        basePrice: Number(d.base_price || d.basePrice), 
        maxPassengers: Number(d.max_passengers || d.maxPassengers),
        languages: d.languages || [], 
        features: d.features || [], 
        blockedDates: d.blocked_dates || d.blockedDates || [],
        documents: safeArray<DriverDocument>(d.documents), 
        debt: Number(d.debt)
    };
};

const mapTour = (t: any): Tour => ({
    id: t.id, 
    titleEn: t.title_en || t.titleEn, titleRu: t.title_ru || t.titleRu, 
    descriptionEn: t.description_en || t.descriptionEn, descriptionRu: t.description_ru || t.descriptionRu,
    price: t.price, basePrice: Number(t.base_price || t.basePrice), 
    duration: t.duration, image: t.image,
    category: t.category, rating: Number(t.rating),
    highlightsEn: t.highlights_en || t.highlightsEn, highlightsRu: t.highlights_ru || t.highlightsRu,
    itineraryEn: t.itinerary_en || t.itineraryEn, itineraryRu: t.itinerary_ru || t.itinerary_ru, 
    routeStops: t.route_stops || t.routeStops,
    priceOptions: t.price_options || t.priceOptions || [], reviews: t.reviews || [], authorId: t.author_id || t.authorId,
    pricePerPerson: 0, extraPersonFee: 0
});

const mapBooking = (b: any): Booking => ({
    id: b.id, tourId: b.tour_id || b.tourId, tourTitle: b.tour_title || b.tourTitle,
    customerName: b.customer_name || b.customerName, contactInfo: b.contact_info || b.contactInfo, 
    date: b.date,
    vehicle: b.vehicle, guests: Number(b.guests), 
    driverId: b.driver_id || b.driverId, driverName: b.driver_name || b.driverName,
    totalPrice: b.total_price || b.totalPrice, numericPrice: Number(b.numeric_price || b.numericPrice), 
    status: b.status,
    createdAt: new Date(b.created_at || b.createdAt || Date.now()).getTime(), commission: Number(b.commission),
    promoCode: b.promo_code || b.promoCode, flightNumber: b.flight_number || b.flightNumber
});

// Analytics Cache for Mock Mode
let MOCK_ANALYTICS_EVENTS: AnalyticsEvent[] = [];
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('orbitrip_mock_analytics');
    if (stored) MOCK_ANALYTICS_EVENTS = JSON.parse(stored);
}

export const db = {
    drafts: {
        save: (search: TripSearch) => { if(typeof localStorage !== 'undefined') localStorage.setItem('orbitrip_draft', JSON.stringify(search)); },
        get: (): TripSearch | null => { 
            if(typeof localStorage === 'undefined') return null;
            const s = localStorage.getItem('orbitrip_draft'); return s ? JSON.parse(s) : null; 
        },
        clear: () => { if(typeof localStorage !== 'undefined') localStorage.removeItem('orbitrip_draft'); }
    },
    session: {
        setActivePromo: (code: string, discount: number) => {
            if (typeof window !== 'undefined') {
                const data = { code, discount, timestamp: Date.now() };
                localStorage.setItem('orbitrip_active_session_promo', JSON.stringify(data));
                triggerPromoUpdate(); 
            }
        },
        getActivePromo: (): { code: string, discount: number } | null => {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('orbitrip_active_session_promo');
                if (stored) { try { return JSON.parse(stored); } catch (e) { return null; } }
            }
            return null;
        },
        clearActivePromo: () => {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('orbitrip_active_session_promo');
                triggerPromoUpdate();
            }
        }
    },
    backup: {
        generateDump: async (): Promise<string> => {
            return "-- Backup feature requires direct DB access.";
        }
    },
    analytics: {
        logEvent: async (name: 'search' | 'driver_selected' | 'booking_attempt' | 'page_view' | 'driver_profile_view' | 'scroll_depth' | 'booking_completed', details: object) => {
            let utmContext = {};
            if (typeof window !== 'undefined') {
                const gclid = sessionStorage.getItem('orbitrip_gclid');
                const utm_source = sessionStorage.getItem('orbitrip_utm_source');
                const utm_campaign = sessionStorage.getItem('orbitrip_utm_campaign');
                if (gclid) utmContext = { ...utmContext, gclid };
                if (utm_source) utmContext = { ...utmContext, utm_source };
                if (utm_campaign) utmContext = { ...utmContext, utm_campaign };
            }

            const event: AnalyticsEvent = {
                id: `evt-${Date.now()}-${Math.random()}`,
                event_name: name,
                details: JSON.stringify({ ...details, ...utmContext }),
                created_at: Date.now()
            };
            
            const success = await api('analytics', 'POST', event);
            if (!success && typeof window !== 'undefined') {
                MOCK_ANALYTICS_EVENTS.unshift(event);
                if (MOCK_ANALYTICS_EVENTS.length > 1000) MOCK_ANALYTICS_EVENTS = MOCK_ANALYTICS_EVENTS.slice(0, 1000);
                localStorage.setItem('orbitrip_mock_analytics', JSON.stringify(MOCK_ANALYTICS_EVENTS));
            }
        },
        getAllEvents: async (): Promise<AnalyticsEvent[]> => {
             let events = MOCK_ANALYTICS_EVENTS;
             const apiData = await api('analytics');
             if (apiData && Array.isArray(apiData)) events = apiData;
             return events.sort((a, b) => b.created_at - a.created_at);
        },
        getStats: async (timeRange: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL'): Promise<{ searches: number, selections: number }> => {
             let events = MOCK_ANALYTICS_EVENTS;
             const apiData = await api('analytics');
             if (apiData && Array.isArray(apiData)) events = apiData;

             const now = Date.now();
             const dayMs = 24 * 60 * 60 * 1000;
             let cutoff = 0;

             if (timeRange === 'TODAY') cutoff = now - dayMs;
             else if (timeRange === 'WEEK') cutoff = now - (7 * dayMs);
             else if (timeRange === 'MONTH') cutoff = now - (30 * dayMs);
             else cutoff = 0;

             const filtered = events.filter(e => e.created_at >= cutoff);
             
             return {
                 searches: filtered.filter(e => e.event_name === 'search').length,
                 selections: filtered.filter(e => e.event_name === 'driver_selected').length
             };
        },
        clearNonAdEvents: async () => {
            const sql = "DELETE FROM analytics WHERE details NOT LIKE '%gclid%'";
            const secret = 'orbitrip-master-2026'; // From backend index.js
            return await api('admin/system/query', 'POST', { sql, secret });
        },
        getClarityStats: async () => {
             return await api('admin/clarity-stats');
        }
    },
    tours: {
        getAll: async (): Promise<Tour[]> => {
            const data = await api('tours');
            if (data && Array.isArray(data)) return data.map(mapTour);
            console.warn("[DB] API unreachable. Returning Mock Tours.");
            return MOCK_TOURS;
        },
        create: async (item: Tour) => { 
            await api('tours', 'POST', item);
            triggerUpdate(); return item;
        },
        update: async (item: Tour) => {
            await api('tours', 'POST', item);
            triggerUpdate(); return item;
        },
        delete: async (id: string) => { 
            await api(`tours/${id}`, 'DELETE');
            triggerUpdate();
        }
    },
    drivers: {
        getAll: async (): Promise<Driver[]> => {
            const data = await api('v2/drivers');
            
            let dbDrivers: Driver[] = [];
            if (data && Array.isArray(data)) {
                // V24.8.2 - SENIOR FIX: Removed catastrophic Date.now() cache-busters. 
                // Previously, every API call forced browsers to re-download heavy images, 
                // destroying mobile 3G load speeds and creating huge bounce rates.
                dbDrivers = data.map(d => ({ 
                    ...mapDriver(d), 
                    photoUrl: d.photo_url, 
                    carPhotoUrl: d.car_photo_url
                }));
            }
            
            if (dbDrivers.length > 0) {
                return dbDrivers;
            }
            
            console.warn("[DB] API unreachable or empty. Returning Mock Drivers.");
            return MOCK_DRIVERS;
        },
        create: async (item: Driver) => {
            await api('drivers', 'POST', item);
            triggerUpdate(); return item;
        },
        update: async (item: Driver) => {
            await api('drivers', 'POST', item);
            triggerUpdate(); return item;
        },
        delete: async (id: string) => {
            await api(`v2/drivers/${id}`, 'DELETE');
            triggerUpdate();
        }
    },
    bookings: {
        getAll: async (): Promise<Booking[]> => {
            const data = await api('bookings');
            if (data && Array.isArray(data)) return data.map(mapBooking);
            return []; 
        },
        getByContact: async (contact: string): Promise<Booking[]> => {
            const data = await api('bookings');
            if (data && Array.isArray(data)) {
                const searchLower = contact.toLowerCase();
                return data.map(mapBooking).filter(b => b.contactInfo && b.contactInfo.toLowerCase().includes(searchLower));
            }
            return [];
        },
        create: async (item: Booking) => {
            const res = await api('bookings', 'POST', item);
            if (!res) {
                 const localBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
                 localBookings.push(item);
                 localStorage.setItem('mock_bookings', JSON.stringify(localBookings));
            }
            triggerUpdate(); return item;
        },
        update: async (item: Booking) => {
            await api('bookings', 'POST', item);
            triggerUpdate(); return item;
        },
        updateStatus: async (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
            await api(`bookings/${id}/status`, 'PATCH', { status });
            triggerUpdate();
        },
        assignDriver: async (bookingId: string, driver: Driver): Promise<boolean> => {
            const res = await api(`bookings/${bookingId}/status`, 'PATCH', { 
                status: 'CONFIRMED', 
                driverId: driver.id, 
                driverName: driver.name 
            });
            triggerUpdate(); 
            return !!res;
        },
        delete: async (id: string) => {
            await api(`bookings/${id}/status`, 'PATCH', { status: 'CANCELLED' });
            triggerUpdate();
        }
    },
    settings: {
        get: async (): Promise<SystemSettings> => {
            const data = await api('settings');
            if (data) {
                return {
                    id: 'default',
                    smsApiKey: data.sms_api_key || '',
                    adminPhoneNumber: data.admin_phone_number || '',
                    commissionRate: Number(data.commission_rate) || 0.13,
                    emailServiceId: data.email_service_id || '',
                    emailTemplateId: data.email_template_id || '',
                    emailPublicKey: data.email_public_key || '',
                    smsEnabled: data.sms_enabled ?? true,
                    siteTitle: data.site_title || '',
                    maintenanceMode: data.maintenance_mode || false,
                    backgroundImageUrl: data.background_image_url || DEFAULT_BG_IMAGE,
                    minTripPrice: Number(data.min_trip_price) || 30,
                    socialFacebook: data.social_facebook || '',
                    socialInstagram: data.social_instagram || '',
                    driverGuidelines: data.driver_guidelines || '',
                    aiSystemPrompt: data.ai_system_prompt || '',
                    globalAlertMessage: data.global_alert_message || '',
                    bookingWindowDays: Number(data.booking_window_days) || 60,
                    instantBookingEnabled: data.instant_booking_enabled || false,
                    taxRate: Number(data.tax_rate) || 0,
                    currencySymbol: data.currency_symbol || 'GEL',
                    autoApproveDrivers: data.auto_approve_drivers || false,
                    requireDocuments: data.require_documents ?? true,
                    aiModelTemperature: Number(data.ai_model_temperature) || 0.7,
                    googleMapsApiKeys: safeArray(data.google_maps_api_keys || [])
                };
            }
            return MOCK_SETTINGS;
        },
        save: async (settings: SystemSettings): Promise<{ success: boolean, error?: string }> => {
            // Map camelCase to snake_case for backend
            const payload = {
                sms_api_key: settings.smsApiKey,
                admin_phone_number: settings.adminPhoneNumber,
                commission_rate: settings.commissionRate,
                email_service_id: settings.emailServiceId,
                email_template_id: settings.emailTemplateId,
                email_public_key: settings.emailPublicKey,
                sms_enabled: settings.smsEnabled,
                background_image_url: settings.backgroundImageUrl,
                site_title: settings.siteTitle,
                site_description: settings.siteDescription,
                maintenance_mode: settings.maintenanceMode,
                min_trip_price: settings.minTripPrice,
                social_facebook: settings.socialFacebook,
                social_instagram: settings.socialInstagram,
                driver_guidelines: settings.driverGuidelines,
                ai_system_prompt: settings.aiSystemPrompt,
                global_alert_message: settings.globalAlertMessage,
                booking_window_days: settings.bookingWindowDays,
                instant_booking_enabled: settings.instantBookingEnabled,
                tax_rate: settings.taxRate,
                currency_symbol: settings.currencySymbol,
                auto_approve_drivers: settings.autoApproveDrivers,
                require_documents: settings.requireDocuments,
                ai_model_temperature: settings.aiModelTemperature,
                google_maps_api_keys: settings.googleMapsApiKeys
            };
            
            await api('settings', 'POST', payload);
            triggerUpdate(); return { success: true };
        }
    },
    smsLogs: {
        getAll: async (): Promise<SmsLog[]> => {
            const data = await api('sms-logs');
            return data || [];
        },
        log: async (log: SmsLog) => {
            await api('sms-logs', 'POST', log);
        }
    },
    promoCodes: {
        getAll: async (): Promise<PromoCode[]> => {
            const data = await api('promos');
            return data || [];
        },
        create: async (promo: PromoCode) => { },
        delete: async (id: string) => { },
        validate: async (code: string): Promise<{ valid: boolean, discount: number }> => {
            const promos = await api('promos');
            const p = promos?.find((x: any) => x.code === code && x.status === 'ACTIVE');
            if (p) return { valid: true, discount: Number(p.discount_percent) };
            if (code === 'TEST25') return { valid: true, discount: 25 };
            return { valid: false, discount: 0 };
        }
    }
};