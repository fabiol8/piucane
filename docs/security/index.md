# Security — Index
**Owner:** Security + DevOps Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Documentazione security: RBAC, autenticazione, autorizzazione, Firestore rules, secrets management, vulnerability scanning, penetration testing.

## Contenuti
- [rbacs.md](./rbacs.md) — Role-Based Access Control (roles e permessi)
- [firestore-rules.md](./firestore-rules.md) — Documentazione Firestore Security Rules
- [secrets.md](./secrets.md) — Gestione secrets (Firebase, GCP Secret Manager, GitHub)

## Security Principles

### Defense in Depth
- **Client-side**: Input validation, CSP
- **API layer**: Auth, CORS, CSRF, rate limiting
- **Database**: Firestore rules, least privilege
- **Infrastructure**: VPC, IAM, encryption

### Least Privilege
- Ogni servizio/utente ha **solo** i permessi strettamente necessari
- Admin permissions separate (super_admin, editor, viewer)
- MFA obbligatorio per admin

### Security by Default
- HTTPS obbligatorio (HSTS)
- Cookies Secure + SameSite
- CSP strict
- Auth require by default (opt-in per public routes)

## Authentication

### Firebase Auth
**Providers**:
- ✅ Email/Password
- ✅ Google OAuth
- ✅ Apple Sign In
- ⏳ Facebook (future)

**Features**:
- Password reset
- Email verification (obbligatorio)
- MFA (SMS o TOTP per admin)
- Session management (revoke token)

### Token Security
- **ID Token**: JWT firmato Firebase, validità 1 ora
- **Refresh Token**: Validità 30 giorni, rotate automaticamente
- **Custom Claims**: Roles (`admin`, `editor`, `viewer`)

### Implementation
```ts
// api/src/middleware/auth.ts
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Authorization (RBAC)

Vedi [rbacs.md](./rbacs.md) per dettagli completi.

### User Roles
- **user**: Utente standard (può gestire solo i propri dati)
- **subscriber**: Utente con abbonamento attivo (extra features)
- **vip**: Utente VIP (LTV >€500)

### Admin Roles
- **super_admin**: Full access (users, products, CMP, analytics)
- **editor**: Content management (products, CMS, templates)
- **viewer**: Read-only access (analytics, reports)
- **support**: Customer support (view orders, chat, refunds)

### Custom Claims
```ts
// Set custom claim
await admin.auth().setCustomUserClaims(uid, { role: 'admin', level: 'super_admin' });

// Check claim in middleware
if (req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

## Firestore Security Rules

Vedi [firestore-rules.md](./firestore-rules.md) per documentazione completa.

### Principi
- **Deny by default**: Tutto bloccato, allow esplicito
- **User isolation**: Utente accede solo ai propri doc
- **Admin override**: Admin con custom claim bypassa alcune rules
- **Read/Write separation**: Read più permissivo, write più strict

### Example
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Admin can read all users
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }

    // Products are public read, admin-only write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

### Testing Rules
```bash
firebase emulators:start --only firestore
npm run test:firestore-rules
```

```ts
// tests/integration/firestore-rules.spec.ts
describe('Firestore Rules', () => {
  it('user can read own data', async () => {
    const db = testEnv.authenticatedContext('user-123').firestore();
    await assertSucceeds(db.doc('users/user-123').get());
  });

  it('user cannot read other user data', async () => {
    const db = testEnv.authenticatedContext('user-123').firestore();
    await assertFails(db.doc('users/user-456').get());
  });

  it('admin can read all users', async () => {
    const db = testEnv.authenticatedContext('admin-user', { role: 'admin' }).firestore();
    await assertSucceeds(db.collection('users').get());
  });
});
```

## API Security

### CORS
**Allowed Origins**: `config/cors/allowed-origins.json`
```json
{
  "production": [
    "https://app.piucane.it",
    "https://admin.piucane.it"
  ],
  "staging": [
    "https://app-staging.piucane.it",
    "https://admin-staging.piucane.it",
    "http://localhost:3000"
  ]
}
```

**Implementation**:
```ts
// api/src/middleware/cors.ts
import cors from 'cors';
import { getAllowedOrigins } from '../config/cors';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins(process.env.NODE_ENV);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});
```

### CSRF Protection
**Double Submit Cookie** pattern:
```ts
// api/src/middleware/csrf.ts
import csrf from 'csurf';

export const csrfMiddleware = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Generate token
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### Rate Limiting
**Express Rate Limit**:
```ts
// api/src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // max 100 requests per IP
  message: 'Too many requests, please try again later'
});

// Strict limiter (login, signup)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes'
});

// AI chat limiter
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // max 10 messages/min
  message: 'Too many messages, please slow down'
});
```

**Usage**:
```ts
app.use('/api/', apiLimiter);
app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/ai/chat', aiLimiter, requireAuth, chatHandler);
```

### Idempotency
**Headers**: `Idempotency-Key` per operazioni critiche (payments, order creation)

```ts
// api/src/middleware/idempotency.ts
const idempotencyCache = new Map<string, any>();

export async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  // Check cache
  if (idempotencyCache.has(key)) {
    const cachedResponse = idempotencyCache.get(key);
    return res.status(cachedResponse.status).json(cachedResponse.body);
  }

  // Store response after completion
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    idempotencyCache.set(key, { status: res.statusCode, body });
    setTimeout(() => idempotencyCache.delete(key), 24 * 3600 * 1000); // 24h TTL
    return originalJson(body);
  };

  next();
}
```

## Secrets Management

Vedi [secrets.md](./secrets.md) per dettagli completi.

### GCP Secret Manager
```bash
# Create secret
echo -n "stripe_secret_key_value" | gcloud secrets create stripe-secret-key \
  --replication-policy="automatic" \
  --data-file=-

# Grant access to Cloud Run service
gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:piucane-api@piucane-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Firebase Environment Config
```bash
# Set function config
firebase functions:config:set stripe.secret_key="sk_live_..."

# Access in function
const stripeKey = functions.config().stripe.secret_key;
```

### GitHub Actions Secrets
**Settings → Secrets and variables → Actions**

Required secrets:
- `FIREBASE_SERVICE_ACCOUNT` (JSON service account key)
- `FIREBASE_PROJECT_ID_STG`
- `FIREBASE_PROJECT_ID_PROD`
- `STRIPE_SECRET_KEY`
- `GEMINI_API_KEY`
- `SENDGRID_API_KEY`
- `TWILIO_AUTH_TOKEN`

## Content Security Policy (CSP)

**Config**: `config/csp/web.json`

```json
{
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "https://www.googletagmanager.com",
    "https://js.stripe.com"
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "https:", "data:"],
  "connect-src": [
    "'self'",
    "https://api.piucane.it",
    "https://*.googleapis.com",
    "https://www.google-analytics.com"
  ],
  "frame-src": [
    "https://js.stripe.com",
    "https://www.youtube-nocookie.com"
  ],
  "upgrade-insecure-requests": []
}
```

**Implementation** (Firebase Hosting `firebase.json`):
```json
{
  "hosting": {
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self' https://www.googletagmanager.com; ..."
      }]
    }]
  }
}
```

## Vulnerability Scanning

### Dependency Scanning
```bash
# npm audit (CI gate)
npm audit --audit-level=high

# Snyk (opzionale)
npx snyk test --severity-threshold=high
```

### Container Scanning (Cloud Run)
```bash
# Trivy scan (in CI)
trivy image gcr.io/piucane-prod/api:latest --severity HIGH,CRITICAL
```

### SAST (Static Application Security Testing)
```bash
# ESLint security plugin
npm install --save-dev eslint-plugin-security

# SonarQube (enterprise)
sonar-scanner -Dsonar.projectKey=piucane
```

### DAST (Dynamic Application Security Testing)
```bash
# OWASP ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://app-staging.piucane.it \
  -r zap-report.html
```

## Penetration Testing

### Schedule
- **Internal**: Quarterly (ogni 3 mesi)
- **External**: Annual (audit annuale da security firm)

### Scope
- ✅ API endpoints (auth, payments, admin)
- ✅ Firestore rules bypass attempts
- ✅ XSS / SQL injection (anche se NoSQL)
- ✅ CSRF bypass
- ✅ IDOR (Insecure Direct Object Reference)
- ✅ Privilege escalation (user → admin)
- ✅ Rate limiting bypass
- ✅ Session hijacking

### Report Template
1. **Executive Summary**
2. **Scope & Methodology**
3. **Findings** (Critical → Low)
4. **Remediation Plan**
5. **Re-test Results**

## Incident Response

Vedi `/docs/runbooks/incident.md` per playbook completo.

### Security Incident Categories
- **P0**: Data breach, credential leak, RCE (Remote Code Execution)
- **P1**: Auth bypass, privilege escalation, XSS on production
- **P2**: CSRF vulnerability, minor info disclosure
- **P3**: Low-severity vulnerability (requires specific conditions)

### Immediate Actions (P0/P1)
1. **Contain**: Disable affected feature, revoke compromised credentials
2. **Assess**: Determine scope (data affected, users impacted)
3. **Notify**: DPO → Garante (if GDPR breach), users (if high risk)
4. **Fix**: Deploy hotfix, rotate secrets
5. **Monitor**: Watch for recurrence
6. **Post-Mortem**: Security review, lessons learned

## Security Checklist (Pre-Release)

- [ ] All secrets in Secret Manager (no hardcode)
- [ ] HTTPS enforced (HSTS header)
- [ ] CSP configured and tested
- [ ] CORS whitelist updated
- [ ] CSRF protection enabled (non-GET routes)
- [ ] Rate limiting configured
- [ ] Firestore rules tested (assertFails for unauthorized access)
- [ ] Auth required for protected routes
- [ ] Admin routes check custom claims
- [ ] npm audit passes (no high/critical)
- [ ] Container scan passes (Trivy)
- [ ] ZAP baseline scan passes (no high-severity)
- [ ] Passwords hashed (Firebase Auth handles this)
- [ ] Sensitive data encrypted at rest
- [ ] Logging no PII (sanitize logs)
- [ ] Error messages no stack traces in production

## Compliance

### Standards
- **GDPR**: Privacy compliance (vedi `/docs/legal/`)
- **PCI DSS**: Stripe handles (SAQ-A compliance)
- **OWASP Top 10**: Mitigation implemented
- **ISO 27001**: (Future enterprise goal)

### Audit Trail
**Firestore**: `auditLogs/{resource}/{logId}`
```json
{
  "timestamp": "2025-09-29T14:30:00Z",
  "userId": "admin-user-123",
  "action": "products.update",
  "resourceId": "product-xyz",
  "changes": { "price": { "old": 29.99, "new": 24.99 } },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Retention**: 2 anni per audit

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Stripe Security Guide](https://stripe.com/docs/security/guide)

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-09-29 | Initial security documentation |

**Next review**: 2026-01-01 (quarterly)