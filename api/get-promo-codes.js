const fs = require('fs');
const path = require('path');

const PROMO_FILE = path.join(process.cwd(), 'promo-codes.json');
const PROMO_SECRET_KEY = process.env.PROMO_SECRET_KEY || 'admin123';

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(400).json({ error: 'GET only' });
    }

    const { secret } = req.query;

    if (secret !== PROMO_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        let codes = [];
        if (fs.existsSync(PROMO_FILE)) {
            const data = fs.readFileSync(PROMO_FILE, 'utf8');
            const json = JSON.parse(data);
            codes = json.promo_codes || [];
        }

        const total = codes.length;
        const used = codes.filter(c => c.used).length;
        const unused = total - used;

        res.status(200).json({
            total,
            used,
            unused,
            codes
        });
    } catch (error) {
        console.error('Error reading promo codes:', error);
        res.status(500).json({ error: error.message });
    }
};
