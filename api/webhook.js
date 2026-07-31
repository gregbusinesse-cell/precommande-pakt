const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { appendToSheet } = require('./append-to-sheet');
const {
    loadPromoCodes,
    savePromoCodes,
    generatePromoCode,
    sendNotificationToSupport
} = require('./payment-processing');

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
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

            // Skip if already recorded by the client-side record-payment call
            const codes = loadPromoCodes();
            const existing = codes.find(c => c.paymentIntentId === paymentIntent.id);
            if (existing) {
                console.log(`ℹ️ Payment ${paymentIntent.id} already recorded, skipping.`);
                return res.status(200).json({ received: true, alreadyRecorded: true });
            }

            const promoCode = generatePromoCode();
            const amount = paymentIntent.amount / 100;
            const paymentMethod = paymentIntent.payment_method_types?.[0] || 'card';

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
