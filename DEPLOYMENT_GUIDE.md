# Guide de Déploiement - Fixes Email et Paiements Multiples

## Résumé des changements

### 1. FIX EMAIL - webhook.js
**Problème**: L'email de code promo n'était pas envoyé après le paiement
**Solutions appliquées**:
- Changé `export default` → `module.exports` (cohérence CommonJS)
- Amélioré la gestion des variables d'env (pas de fallback dangereux)
- Ajouté validation des métadonnées email/name
- Ajouté logs détaillés pour debug
- Ajouté gestion d'erreur robuste

### 2. PAIEMENTS MULTIPLES - paiement.html
**Problème**: Seulement les cartes étaient supportées
**Solutions appliquées**:
- Migré de `confirmCardPayment()` (deprecated) → `confirmPayment()`
- Changé Card Element → Payment Element
- Payment Element supporte automatiquement:
  - Google Pay
  - Apple Pay
  - PayPal
  - Link (par email)
  - Cartes classiques

### 3. Fixes cohérence code
- `create-payment-intent.js`: Changé `export default` → `module.exports`
- `create-payment-intent.js`: Ajouté `automatic_payment_methods: { enabled: true }`
- `get-promo-codes.js`: Changé `export default` → `module.exports`
- `send-promo-email.js`: Changé `export default` → `module.exports`

## Étapes de déploiement

### Étape 1: Vérifier les variables d'env sur Vercel
```bash
# Sur Vercel Dashboard → Settings → Environment Variables
# Vérifiez que ces variables existent:
- STRIPE_SECRET_KEY        # clé secrète Stripe
- STRIPE_WEBHOOK_SECRET    # signing secret du webhook (whsec_*)
- SENDGRID_API_KEY        # clé API SendGrid
```

### Étape 2: Configurer le webhook Stripe
1. Allez à https://dashboard.stripe.com/webhooks
2. Cliquez "Add an endpoint"
3. URL: `https://YOUR_VERCEL_DOMAIN/api/webhook`
4. Events: `payment_intent.succeeded`
5. Copiez le "Signing secret" (commence par `whsec_`)
6. Ajoutez-le aux variables d'env Vercel: `STRIPE_WEBHOOK_SECRET`

### Étape 3: Tester localement
```bash
# Terminal 1: Lancer le serveur Vercel
vercel dev

# Terminal 2: Envoyer un test webhook
node test-webhook.js
```

### Étape 4: Déployer sur Vercel
```bash
git add api/
git add paiement.html
git add WEBHOOK_SETUP.md
git add DEPLOYMENT_GUIDE.md
git commit -m "fix: email webhook + add multiple payment methods (Google/Apple/PayPal)"
git push
```

Vercel déploiera automatiquement.

## Tests de paiement

### Test Card (Stripe)
- Numéro: `4242 4242 4242 4242`
- Expiration: Toute date future
- CVC: `123`
- Code postal: Laissez vide (l'option est masquée)

### À vérifier après paiement:
1. ✓ Page "Merci" s'affiche
2. ✓ Email reçu avec code promo (dans 1-2 minutes max)
3. ✓ Code promo sauvegardé dans `promo-codes.json`

### Dépannage
Si l'email ne s'envoie pas:
1. Vérifiez les logs Vercel: `vercel logs`
2. Vérifiez que `SENDGRID_API_KEY` est configurée
3. Testez avec `node test-webhook.js`
4. Vérifiez que l'email `paktsupport@gmail.com` est vérifié dans SendGrid

## Fichiers modifiés
- `/api/webhook.js` - Fix email et validation
- `/api/create-payment-intent.js` - Support paiements multiples
- `/api/get-promo-codes.js` - Cohérence module system
- `/api/send-promo-email.js` - Cohérence module system
- `/paiement.html` - Payment Element + multiples méthodes

## Fichiers ajoutés
- `WEBHOOK_SETUP.md` - Configuration détaillée du webhook
- `DEPLOYMENT_GUIDE.md` - Ce guide
- `test-webhook.js` - Script de test webhook local

## Rollback (si nécessaire)
```bash
git revert HEAD  # Annule les derniers changements
git push
```

---

**Questions?** Contactez paktsupport@gmail.com
