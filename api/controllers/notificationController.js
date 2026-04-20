
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SMS_API_KEY = process.env.SMS_API_KEY;
const SENDER_NAME = 'localltrip'; 

exports.sendAdminSMS = async (req, res) => {
    const { message } = req.body;
    const adminPhone = process.env.ADMIN_PHONE;

    if (!SMS_API_KEY) return res.status(500).json({ error: "SMS Config Missing" });

    try {
        const url = `https://smsoffice.ge/api/v2/send/?key=${SMS_API_KEY}&destination=${adminPhone}&sender=${SENDER_NAME}&content=${encodeURIComponent(message)}&urgent=true`;
        
        // Note: Actual API call logic
        const apiRes = await fetch(url);
        
        if (apiRes.ok) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: "Gateway error" });
        }
    } catch (error) {
        console.error("SMS Error", error);
        res.status(500).json({ error: error.message });
    }
};

exports.sendDriverSMS = async (req, res) => {
    const { phone, message } = req.body;
    
    if (!phone) return res.status(400).json({ error: "No phone number" });

    try {
        // Simple sanitization
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('5')) cleanPhone = '995' + cleanPhone;

        const url = `https://smsoffice.ge/api/v2/send/?key=${SMS_API_KEY}&destination=${cleanPhone}&sender=${SENDER_NAME}&content=${encodeURIComponent(message)}&urgent=true`;
        
        await fetch(url);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
