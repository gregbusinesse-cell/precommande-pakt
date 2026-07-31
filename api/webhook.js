const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
const { appendToSheet } = require('./append-to-sheet');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

const PROMO_FILE = path.join(process.cwd(), 'promo-codes.json');

function loadPromoCodes() {
    try {
        if (fs.existsSync(PROMO_FILE)) {
            const data = fs.readFileSync(PROMO_FILE, 'utf8');
            const json = JSON.parse(data);
            return json.promo_codes || [];
        }
    } catch (error) {
        console.error('Error loading promo codes:', error);
    }
    return [];
}

function savePromoCodes(codes) {
    try {
        fs.writeFileSync(PROMO_FILE, JSON.stringify({ promo_codes: codes }, null, 2));
    } catch (error) {
        console.error('Error saving promo codes:', error);
    }
}

function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PAKT';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function sendNotificationToSupport({ email, name, phone, promoCode, amount, paymentMethod, paymentIntentId }) {
    if (!process.env.SENDGRID_API_KEY) {
        console.log(`
        ========== NEW PAYMENT (SendGrid not configured) ==========
        Email: ${email}
        Name: ${name}
        Phone: ${phone || 'N/A'}
        Promo Code: ${promoCode}
        =============================================================
        `);
        return { success: false, message: 'SendGrid not configured' };
    }

    try {
        const msg = {
            to: 'paktsupport@gmail.com',
            from: 'paktsupport@gmail.com',
            subject: `Nouveau paiement PAKT - ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
                    <h2>Nouveau Membre Fondateur PAKT</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; font-weight: bold;">Prénom</td><td style="padding: 8px;">${name}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Email</td><td style="padding: 8px;">${email}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Téléphone</td><td style="padding: 8px;">${phone || 'Non renseigné'}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Code promo généré</td><td style="padding: 8px; font-size: 1.2rem; color: #D4AF37;">${promoCode}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Montant</td><td style="padding: 8px;">${amount}€</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Moyen de paiement</td><td style="padding: 8px;">${paymentMethod}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Payment Intent ID</td><td style="padding: 8px;">${paymentIntentId}</td></tr>
                    </table>
                    <p style="margin-top: 1.5rem; color: #666;">Pense à envoyer un email personnalisé à ${email} avec le code promo sous 24h.</p>
                </div>
            `
        };

        await sgMail.send(msg);
        console.log(`✅ Notification sent to support for ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Support notification error:', error);
        return { success: false, message: error.message };
    }
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'POST only' });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const rawBody = await getRawBody(req);

    let event;

    if (!endpointSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured. Webhook validation skipped.');
        event = JSON.parse(rawBody.toString());
    } else {
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                sig,
                endpointSecret
            );
        } catch (err) {
            console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const email = paymentIntent.metadata?.email;
            const name = paymentIntent.metadata?.name;
            const phone = paymentIntent.metadata?.phone;

            if (!email || !name) {
                console.warn('⚠️ Missing email or name in payment metadata');
                return res.status(400).json({ error: 'Missing email or name in metadata' });
            }

            const promoCode = generatePromoCode();
            const amount = paymentIntent.amount / 100;
            const paymentMethod = paymentIntent.payment_method_types?.[0] || 'card';

            const codes = loadPromoCodes();
            codes.push({
                email: email,
                name: name,
                phone: phone || '',
                code: promoCode,
                paymentIntentId: paymentIntent.id,
                amount: amount,
                createdAt: new Date().toISOString(),
                used: false,
                usedAt: null
            });
            savePromoCodes(codes);

            const notifResult = await sendNotificationToSupport({
                email, name, phone, promoCode, amount, paymentMethod,
                paymentIntentId: paymentIntent.id
            });

            const sheetResult = await appendToSheet({
                email, name, phone, promoCode, amount, paymentMethod,
                paymentIntentId: paymentIntent.id,
                emailSent: notifResult.success
            });

            console.log(`✅ Payment succeeded for ${email}. Promo code: ${promoCode}. Notification: ${notifResult.success}. Sheet: ${sheetResult.success}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = handler;

// Stripe requires the raw request body to verify the webhook signature
module.exports.config = {
    api: {
        bodyParser: false
    }
};
