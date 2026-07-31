const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

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

async function sendPromoEmail(email, promoCode, name) {
    if (!process.env.SENDGRID_API_KEY) {
        console.log(`
        ========== PROMO CODE GENERATED (SendGrid not configured) ==========
        Email: ${email}
        Name: ${name}
        Promo Code: ${promoCode}
        ====================================================================
        `);
        return { success: true, message: 'Code logged (email not sent)' };
    }

    try {
        const msg = {
            to: email,
            from: 'paktsupport@gmail.com',
            subject: 'Bienvenue, Membre Fondateur PAKT !',
            html: `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #FFFFFF; padding: 2rem; border-radius: 12px;">
                    <h1 style="color: #D4AF37; text-align: center;">Bienvenue !</h1>
                    <p>Salut ${name}, merci d'être Membre Fondateur PAKT !</p>
                    <div style="background: #1a1a1a; border: 2px solid #D4AF37; border-radius: 8px; padding: 2rem; text-align: center; margin: 2rem 0;">
                        <p style="color: #FFFFFF99;">Ton code promo unique :</p>
                        <p style="font-size: 1.8rem; font-weight: bold; color: #D4AF37; letter-spacing: 2px;">${promoCode}</p>
                    </div>
                    <p style="color: #FFFFFF99;">Reste à l'affût ! Tu seras notifié dès que PAKT sort en septembre 2026.</p>
                </div>
            `
        };

        await sgMail.send(msg);
        return { success: true, message: `Email sent to ${email}` };
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, message: error.message };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'POST only' });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_';

    let event;

    if (endpointSecret && endpointSecret !== 'whsec_test_') {
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                endpointSecret
            );
        } catch (err) {
            console.log(`⚠️ Webhook signature verification failed.`, err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    } else {
        event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const email = paymentIntent.metadata.email;
            const name = paymentIntent.metadata.name;

            const promoCode = generatePromoCode();

            const codes = loadPromoCodes();
            codes.push({
                email: email,
                name: name,
                code: promoCode,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                createdAt: new Date().toISOString(),
                used: false,
                usedAt: null
            });
            savePromoCodes(codes);

            await sendPromoEmail(email, promoCode, name);

            console.log(`✅ Payment succeeded for ${email}. Promo code: ${promoCode}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
}
