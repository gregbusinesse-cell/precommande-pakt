const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'POST only' });
    }

    const { amount, email, name } = req.body;

    if (!amount || !email || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'eur',
            metadata: {
                email: email,
                name: name
            },
            automatic_payment_methods: {
                enabled: true
            }
        });

        console.log(`✅ Payment Intent created: ${paymentIntent.id} for ${email}`);

        res.status(200).json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
};
