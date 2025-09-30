# ADR-20250930-user-service-architecture

## Status
Accepted

## Context
La piattaforma PiùCane necessita di un sistema di gestione utenti completo che gestisca autenticazione, autorizzazione, profili utente e compliance GDPR. Il sistema deve essere scalabile, sicuro e conforme alle normative europee sulla privacy.

### Requisiti Funzionali
- Registrazione e autenticazione utenti
- Gestione profili utente con preferenze
- Sistema di ruoli e permessi (RBAC)
- Compliance GDPR completa (Art. 15, 17)
- Analytics tracking per business intelligence
- Integrazione con Firebase ecosystem

### Requisiti Non-Funzionali
- Scalabilità: supportare 100k+ utenti
- Sicurezza: protezione dati personali
- Performance: < 200ms response time
- Availability: 99.9% uptime
- Compliance: GDPR, cookie law

## Decision

Implementazione del User Service con la seguente architettura:

### 1. Firebase Authentication + Custom API Layer

**Firebase Auth per gestione identity:**
- Creazione e gestione utenti
- Verifica JWT tokens
- Password reset e management
- MFA support (futuro)

**Custom API layer per business logic:**
- Profili utente estesi in Firestore
- GDPR compliance operations
- Analytics tracking
- Custom validation e business rules

### 2. Database Schema Design

```typescript
// Firebase Auth User (managed by Firebase)
{
  uid: string,
  email: string,
  emailVerified: boolean,
  displayName: string,
  disabled: boolean
}

// Custom User Profile (Firestore: users/{uid})
{
  email: string,
  name: string,
  phone?: string,
  preferences: UserPreferences,
  role: 'user' | 'admin' | 'super_admin',
  status: 'active' | 'inactive' | 'suspended',
  createdAt: Date,
  updatedAt: Date,
  termsAcceptedAt: Date,
  privacyAcceptedAt: Date
}

// GDPR Consent (Firestore: consentManagement/{uid})
{
  necessary: boolean,
  analytics: boolean,
  marketing: boolean,
  personalization: boolean,
  advertising: boolean,
  consentDate: Date,
  ipAddress: string,
  userAgent: string,
  version: string
}
```

### 3. API Design Pattern

**RESTful endpoints con validation Zod:**
- Input validation server-side
- Structured error responses
- Rate limiting per security
- Analytics tracking integrato

### 4. Security Implementation

**Multi-layer security:**
- Firebase Auth per authentication
- JWT token verification
- Role-based access control
- Rate limiting (100 req/min per IP)
- Input sanitization e validation
- Audit logging per operazioni critiche

### 5. GDPR Compliance Architecture

**Art. 15 - Right to Access:**
- Export completo dati utente
- Formato JSON/CSV
- Include profilo, consensi, dati correlati

**Art. 17 - Right to be Forgotten:**
- Eliminazione account completa
- Cascade delete dati correlati
- Audit trail prima dell'eliminazione
- Retention policy per dati business-critical

## Consequences

### ✅ **Positive**

1. **Scalability**: Firebase Auth scala automaticamente
2. **Security**: Identity management gestito da Google
3. **Compliance**: GDPR implementation completa
4. **Developer Experience**: Firebase SDK well-documented
5. **Performance**: Firestore optimized per read-heavy workloads
6. **Cost**: Pay-as-you-scale pricing model
7. **Integration**: Seamless con altri servizi Firebase

### ❌ **Negative**

1. **Vendor Lock-in**: Dipendenza da Firebase ecosystem
2. **Complexity**: Due layer per auth (Firebase + custom)
3. **Cost at Scale**: Firestore operations possono essere costose
4. **Query Limitations**: NoSQL constraints per complex queries
5. **Offline Sync**: Complessità per offline-first features

### 🔄 **Neutral**

1. **Learning Curve**: Team deve apprendere Firebase patterns
2. **Testing**: Richiede Firebase emulators per testing
3. **Migration**: Futuro switch da Firebase sarebbe complesso

## Implementation

### Phase 1: Core Authentication ✅
- [x] Firebase Auth integration
- [x] JWT token verification middleware
- [x] Basic CRUD operations per user profiles
- [x] Input validation con Zod
- [x] Error handling standardizzato

### Phase 2: GDPR Compliance ✅
- [x] Consent management system
- [x] Data export functionality
- [x] Account deletion con audit trail
- [x] Privacy-compliant data handling

### Phase 3: Advanced Features (In Progress)
- [ ] MFA implementation
- [ ] Social login (Google, Apple)
- [ ] Advanced RBAC permissions
- [ ] Account recovery flows

### Phase 4: Optimization (Planned)
- [ ] Caching layer con Redis
- [ ] Performance optimization
- [ ] Advanced analytics tracking
- [ ] Rate limiting sophisticato

## Alternatives Considered

### 1. **Auth0 + Custom Backend**
- ✅ Pro: Enterprise features, mature platform
- ❌ Contro: Cost molto higher, vendor lock-in diverso
- ❌ Contro: Meno integrazione con Firebase ecosystem

### 2. **Custom Auth Implementation**
- ✅ Pro: Full control, no vendor lock-in
- ❌ Contro: Security risk, maintenance overhead
- ❌ Contro: Time-to-market molto slower

### 3. **AWS Cognito + DynamoDB**
- ✅ Pro: AWS ecosystem, enterprise scale
- ❌ Contro: Complessità setup, learning curve
- ❌ Contro: No real-time features di default

### 4. **Supabase Auth + PostgreSQL**
- ✅ Pro: Open source, SQL database
- ❌ Contro: Meno mature di Firebase
- ❌ Contro: Hosting e scaling complexity

## Follow-up Actions

- [x] Implement core authentication endpoints
- [x] Create comprehensive test suite
- [x] Setup Firebase emulators per development
- [x] Document API endpoints e schemas
- [ ] Performance testing e optimization
- [ ] Security audit con external service
- [ ] Monitor usage patterns e optimize accordingly

## Migration Plan (se necessario in futuro)

1. **Database Export**: Export tutti i dati da Firestore
2. **Auth Migration**: Migrate users usando Firebase Admin SDK
3. **API Compatibility**: Maintain API contracts durante migration
4. **Gradual Cutover**: Blue-green deployment pattern
5. **Rollback Plan**: Ability to revert entro 24h

## References

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record)

## Review Schedule

Questo ADR sarà rivisto ogni 6 mesi o prima se:
- Cambiano requisiti di compliance
- Performance issues significativi
- Security vulnerabilities scoperte
- Alternative tecnologiche diventano compelling