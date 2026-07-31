# Configuration du Webhook Stripe

## Étapes de configuration

### 1. Dans Stripe Dashboard
1. Allez à **Developers > Webhooks**
2. Cliquez sur **Add an endpoint**
3. URL du webhook: `https://YOUR_VERCEL_DOMAIN/api/webhook`
4. Événements à écouter:
   - `payment_intent.succeeded`
5. Cliquez sur **Add endpoint**
6. Copiez le **Signing secret** (commence par `whsec_`)

### 2. Sur Vercel
1. Allez aux paramètres du projet Vercel
2. **Settings > Environment Variables**
3. Ajoutez une nouvelle variable:
   - Nom: `STRIPE_WEBHOOK_SECRET`
   - Valeur: Le signing secret du webhook (commençant par `whsec_`)
4. Assurez-vous qu'elle est définie pour **Production**

### 3. Variables requises en Production
Les variables suivantes DOIVENT être configurées sur Vercel:
- `STRIPE_SECRET_KEY` - Clé secrète Stripe (production ou test)
- `STRIPE_WEBHOOK_SECRET` - Signing secret du webhook
- `SENDGRID_API_KEY` - Clé API SendGrid pour envoyer les emails

## Test local
En local, les variables du `.env.local` seront automatiquement utilisées par Vercel CLI.

## Dépannage Email

Si les emails ne sont pas envoyés:
1. Vérifiez que `SENDGRID_API_KEY` est configurée sur Vercel
2. Vérifiez les logs Vercel: `vercel logs`
3. Vérifiez que le webhook est bien déclenché dans Stripe Dashboard
4. Assurez-vous que l'adresse email `paktsupport@gmail.com` est vérifiée dans SendGrid

## Migration de Cards API vers Payment Element

**Ancien système (deprecated)**:
- `confirmCardPayment()` avec Card Element
- Supportait uniquement les cartes

**Nouveau système**:
- `confirmPayment()` avec Payment Element
- Support automaitque de:
  - Google Pay
  - Apple Pay
  - PayPal
  - Link
  - Cartes classiques

Les metadonnées sont toujours transmises via le Payment Intent et disponibles dans le webhook.
