const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'POST only' });
    }

    const { email, promoCode, name } = req.body;

    if (!email || !promoCode || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.SENDGRID_API_KEY) {
        return res.status(400).json({ error: 'SendGrid not configured' });
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
        res.status(200).json({ success: true, message: `Email sent to ${email}` });
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ error: error.message });
    }
}
