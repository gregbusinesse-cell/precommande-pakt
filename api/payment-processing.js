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

module.exports = {
    loadPromoCodes,
    savePromoCodes,
    generatePromoCode,
    sendNotificationToSupport
};
