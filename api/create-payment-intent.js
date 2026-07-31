const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'POST only' });
    }

    const { amount, email, name, phone, paymentMethodType } = req.body;

    if (!amount || !email || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const paymentIntentParams = {
            amount: amount,
            currency: 'eur',
            metadata: {
                email: email,
                name: name,
                phone: phone || ''
            }
        };

        if (paymentMethodType === 'paypal') {
            paymentIntentParams.payment_method_types = ['paypal'];
        } else {
            paymentIntentParams.automatic_payment_methods = { enabled: true };
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        console.log(`✅ Payment Intent created: ${paymentIntent.id} for ${email}`);

        res.status(200).json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
};
