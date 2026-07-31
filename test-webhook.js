#!/usr/bin/env node

/**
 * Script de test pour simuler un webhook Stripe payment_intent.succeeded
 * Utilisation: node test-webhook.js
 */

const crypto = require('crypto');

// Configuration
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_PP4l4iD1pS7CpIRcVahMQrH3DeDXTB0g';
const LOCAL_ENDPOINT = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';

// Événement de test
const event = {
    id: 'evt_1234567890',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
        object: {
            id: 'pi_1234567890',
            object: 'payment_intent',
            amount: 2000,
            currency: 'eur',
            status: 'succeeded',
            metadata: {
                email: 'test@example.com',
                name: 'Test User'
            }
        }
    }
};

// Signer l'événement comme Stripe le ferait
function signEvent(event, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}.${JSON.stringify(event)}`;

    // Générer la signature HMAC
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    const signedHeader = `t=${timestamp},v1=${signature}`;

    return {
        payload,
        signedHeader,
        timestamp
    };
}

// Tester le webhook
async function testWebhook() {
    console.log('🧪 Test du Webhook Stripe\n');
    console.log(`📍 Endpoint: ${LOCAL_ENDPOINT}`);
    console.log(`📧 Email test: ${event.data.object.metadata.email}`);
    console.log(`👤 Nom test: ${event.data.object.metadata.name}\n`);

    const { payload, signedHeader } = signEvent(event, WEBHOOK_SECRET);

    try {
        console.log('📤 Envoi du webhook...');
        const response = await fetch(LOCAL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': signedHeader
            },
            body: payload
        });

        console.log(`✓ Response Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`✗ Erreur: ${errorText}`);
            return;
        }

        const data = await response.json();
        console.log(`✓ Response: ${JSON.stringify(data)}`);
        console.log('\n✅ Webhook testé avec succès!');
        console.log('📧 Vérifiez vos logs pour voir si l\'email a été envoyé.');
    } catch (error) {
        console.error(`✗ Erreur: ${error.message}`);
        console.error('\nAssurez-vous que:');
        console.error('1. Le serveur local est en cours d\'exécution (http://localhost:3000)');
        console.error('2. Les variables d\'environnement sont configurées');
        console.error('3. Le fichier .env.local existe avec STRIPE_WEBHOOK_SECRET');
    }
}

testWebhook();
