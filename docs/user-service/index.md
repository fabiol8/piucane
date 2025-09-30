# User Service — Index
**Owner:** Backend Team • **Ultimo aggiornamento:** 2025-09-30 • **Versione doc:** v1.0

## Scopo
Il User Service gestisce l'autenticazione, autorizzazione, profili utente e compliance GDPR per la piattaforma PiùCane.

## Contenuti
- [api.md](./api.md) — Documentazione API endpoints
- [gdpr.md](./gdpr.md) — Implementazione compliance GDPR
- [authentication.md](./authentication.md) — Flussi di autenticazione Firebase
- [validation.md](./validation.md) — Schema di validazione dati

## Architettura

### Componenti Principali
```
User Service
├── Authentication Controller
│   ├── registerUser()
│   ├── loginUser()
│   ├── getUserProfile()
│   └── updateUserProfile()
├── GDPR Controller
│   ├── updateGDPRConsent()
│   ├── exportUserData()
│   └── deleteUserAccount()
├── Validation Layer (Zod)
├── Analytics Tracking
└── Firebase Integration
```

### Database Schema
```typescript
users/{userId}
├── email: string
├── name: string
├── phone?: string
├── preferences: UserPreferences
├── role: 'user' | 'admin' | 'super_admin'
├── status: 'active' | 'inactive' | 'suspended'
├── createdAt: Date
├── updatedAt: Date
├── termsAcceptedAt: Date
└── privacyAcceptedAt: Date

consentManagement/{userId}
├── necessary: boolean
├── analytics: boolean
├── marketing: boolean
├── personalization: boolean
├── advertising: boolean
├── consentDate: Date
├── ipAddress: string
├── userAgent: string
└── version: string
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/login` - Login utente
- `GET /api/auth/profile` - Profilo utente corrente
- `PUT /api/auth/profile` - Aggiornamento profilo

### GDPR Compliance
- `PUT /api/auth/consent` - Aggiornamento consensi
- `POST /api/auth/export` - Export dati utente
- `DELETE /api/auth/account` - Eliminazione account

## Sicurezza

### Autenticazione
- Firebase Authentication per gestione utenti
- JWT tokens con verifica server-side
- Rate limiting: 100 req/min per IP

### Autorizzazione
- Role-based access control (RBAC)
- Middleware di autenticazione su endpoint protetti
- Validazione ownership su risorse utente

### Privacy
- Hash delle password gestito da Firebase Auth
- Crittografia dati sensibili
- Audit logging per operazioni critiche

## Analytics & Tracking

### Eventi GA4
- `user_register` - Registrazione utente
- `user_login` - Login utente
- `profile_update` - Aggiornamento profilo
- `gdpr_consent_update` - Modifica consensi
- `gdpr_data_export` - Export dati
- `account_delete` - Eliminazione account

### CTA Registry
- `auth.login.button.click`
- `auth.register.button.click`
- `profile.edit.button.click`
- `profile.save.button.click`
- `gdpr.consent.update.click`
- `gdpr.export.request.click`

## Testing

### Unit Tests
- Controller methods con mocks Firebase
- Validation schema con Zod
- Error handling e edge cases

### Integration Tests
- Flusso completo registration/login
- Firebase emulator suite
- GDPR compliance flows

### Performance Tests
- Load testing registration endpoint
- Authentication bottleneck analysis

## Monitoraggio

### Metriche Chiave
- Registration rate
- Login success rate
- Profile update frequency
- GDPR export requests
- Account deletion rate

### Alert
- Spike in failed logins
- GDPR export failures
- Authentication errors

## Deployment

### Environment Variables
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
API_VERSION
ALLOWED_ORIGINS
```

### Dependencies
- Firebase Admin SDK
- Zod validation
- Express.js
- Winston logging

## Roadmap

### v1.1
- [ ] MFA support
- [ ] Social login (Google, Apple)
- [ ] Password reset flow

### v1.2
- [ ] Account recovery
- [ ] Audit trail dashboard
- [ ] Advanced RBAC permissions

## Support

Per supporto tecnico contattare il Backend Team.
Repository: https://github.com/piucane/piucane
Documentazione API: https://api.piucane.it/docs