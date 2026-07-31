const { google } = require('googleapis');

async function appendToSheet({ email, name, phone, promoCode, amount, paymentMethod, paymentIntentId, emailSent }) {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
        console.warn('⚠️ Google Sheets not configured, skipping');
        return { success: false, message: 'Google Sheets not configured' };
    }

    try {
        const auth = new google.auth.JWT(
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            null,
            process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );

        const sheets = google.sheets({ version: 'v4', auth });

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Feuille 1!A:I',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [[
                    new Date().toISOString(),
                    name,
                    email,
                    phone || '',
                    promoCode,
                    amount,
                    paymentMethod || 'card',
                    paymentIntentId,
                    emailSent ? 'Oui' : 'Non'
                ]]
            }
        });

        console.log(`✅ Row added to Google Sheet for ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Google Sheets error:', error.message);
        return { success: false, message: error.message };
    }
}

module.exports = { appendToSheet };
