# Checklist de Test - Email + Paiements Multiples

## Avant de déployer

### 1. Vérifier la syntaxe JavaScript
```bash
# Vérifier que les fichiers API n'ont pas d'erreurs de syntaxe
node -c api/webhook.js
node -c api/create-payment-intent.js
node -c api/send-promo-email.js
node -c api/get-promo-codes.js
```

### 2. Vérifier les variables d'env
```bash
# Vérifiez que .env.local a:
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
echo $SENDGRID_API_KEY
```

### 3. Tester localement avec Vercel CLI
```bash
# Terminal 1
vercel dev

# Terminal 2 (dans le même répertoire)
node test-webhook.js
```

## Tests fonctionnels

### Test 1: Paiement avec Carte
1. Accédez à http://localhost:3000/paiement.html
2. Remplissez:
   - Prénom: "Test User"
   - Email: "test@example.com"
   - Téléphone: (optionnel)
3. Voyez que le Payment Element s'affiche avec:
   - ✓ Card option
   - ✓ Google Pay (si disponible)
   - ✓ Apple Pay (si disponible)
   - ✓ PayPal (si disponible)
4. Entrez la carte de test: 4242 4242 4242 4242
5. Complétez le paiement
6. Vérifiez:
   - ✓ Page "Merci" s'affiche
   - ✓ Email reçu dans 1-2 minutes
   - ✓ Email contient le code promo PAKT + 8 caractères

### Test 2: Vérifier le webhook
1. Accédez aux logs: `vercel logs`
2. Cherchez les logs du webhook:
   - `✅ Payment succeeded for test@example.com`
   - `✅ Email sent successfully to test@example.com`
3. Vérifiez que `promo-codes.json` contient la nouvelle entrée

### Test 3: Paiement échoué
1. Utilisez une carte invalide: 4000 0000 0000 0002
2. Vérifiez que le message d'erreur s'affiche
3. Vérifiez que pas de code promo généré

### Test 4: Payment Element responsif
1. Testez sur mobile (375px): `vercel dev` + F12 → responsive mode
2. Testez sur tablet (768px)
3. Testez sur desktop (1280px)
4. Vérifiez que:
   - ✓ Payment Element s'adapte correctement
   - ✓ Bouton "Payer 20€" est cliquable
   - ✓ Pas de dépassement horizontal

## Après déploiement (Production)

### 1. Vérifier le déploiement
```bash
git log --oneline -5  # Vérifiez que le commit est visible
```

### 2. Tester sur Vercel
1. Accédez à https://YOUR_VERCEL_DOMAIN/paiement.html
2. Répétez Test 1 (Paiement avec Carte)
3. Vérifiez les logs: `vercel logs`

### 3. Tester le webhook avec cert
```bash
# Une fois que le webhook est configuré dans Stripe Dashboard
# Allez à Stripe Dashboard → Webhooks → Sélectionnez votre endpoint
# Cliquez "Send test event"
# Choisissez "payment_intent.succeeded"
# Vérifiez que Stripe affiche "OK"
```

### 4. Tester avec de vraies cartes (optionnel)
- Utilisez les cartes de test Stripe avec votre région
- Pour France: 4000 0566 5566 5556 (3D Secure)
- Vérifiez que le flow 3D Secure fonctionne

## Critères de succès

- ✓ Page de paiement s'affiche correctement
- ✓ Payment Element affiche au moins 2 méthodes (Cards + Google/Apple/PayPal)
- ✓ Paiement test (4242...) réussit
- ✓ Email reçu avec code promo
- ✓ Code promo sauvegardé dans promo-codes.json
- ✓ Paiement invalide (4000 0000 0000 0002) échoue proprement
- ✓ Pages responsive sur mobile/tablet/desktop
- ✓ Logs webhook affichent les détails du paiement
- ✓ Pas d'erreur JavaScript dans la console

## Dépannage

### Email ne s'envoie pas
1. Vérifiez `SENDGRID_API_KEY` sur Vercel
2. Vérifiez que `paktsupport@gmail.com` est vérifié dans SendGrid
3. Testez localement avec `node test-webhook.js`
4. Vérifiez les logs: `vercel logs --tail`

### Payment Element ne s'affiche pas
1. Vérifiez que le client secret est créé
2. Vérifiez la clé publique Stripe (pk_test_...)
3. Vérifiez les erreurs console: F12 → Console
4. Vérifiez les logs Vercel

### Webhook ne déclenche pas
1. Vérifiez `STRIPE_WEBHOOK_SECRET` sur Vercel
2. Vérifiez que l'URL du webhook est correcte
3. Dans Stripe Dashboard, cliquez "Send test event"
4. Vérifiez que Stripe affiche "OK"

---

**Note**: Tous les tests doivent passer avant merge en production!
