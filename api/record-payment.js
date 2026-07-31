const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { appendToSheet } = require('./append-to-sheet');
const {
    loadPromoCodes,
    savePromoCodes,
    generatePromoCode,
    sendNotificationToSupport
} = require('./payment-processing');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'POST only' });
    }

    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
        return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    try {
        // Verify with Stripe that this payment actually succeeded before recording anything
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not succeeded' });
        }

        // Avoid duplicate promo codes if this endpoint is called twice for the same payment
        const existingCodes = loadPromoCodes();
        const existing = existingCodes.find(c => c.paymentIntentId === paymentIntentId);
        if (existing) {
            return res.status(200).json({ promoCode: existing.code, alreadyRecorded: true });
        }

        const email = paymentIntent.metadata?.email;
        const name = paymentIntent.metadata?.name;
        const phone = paymentIntent.metadata?.phone;

        if (!email || !name) {
            return res.status(400).json({ error: 'Missing email or name in payment metadata' });
        }

        const promoCode = generatePromoCode();
        const amount = paymentIntent.amount / 100;
        const paymentMethod = paymentIntent.payment_method_types?.[0] || 'card';

        existingCodes.push({
            email,
            name,
            phone: phone || '',
            code: promoCode,
            paymentIntentId: paymentIntent.id,
            amount,
            createdAt: new Date().toISOString(),
            used: false,
            usedAt: null
        });
        savePromoCodes(existingCodes);

        const notifResult = await sendNotificationToSupport({
            email, name, phone, promoCode, amount, paymentMethod,
            paymentIntentId: paymentIntent.id
        });

        const sheetResult = await appendToSheet({
            email, name, phone, promoCode, amount, paymentMethod,
            paymentIntentId: paymentIntent.id,
            emailSent: notifResult.success
        });

        console.log(`✅ Payment recorded for ${email}. Promo code: ${promoCode}. Notification: ${notifResult.success}. Sheet: ${sheetResult.success}`);

        res.status(200).json({ promoCode, alreadyRecorded: false });
    } catch (error) {
        console.error('record-payment error:', error);
        res.status(500).json({ error: error.message });
    }
};
