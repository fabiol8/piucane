# ADR-001: Scelta Firebase come Platform Backend

**Status**: ✅ Accepted
**Date**: 2025-01-15
**Deciders**: Tech Lead, CTO, Backend Team
**Technical Story**: #12

---

## Context

Necessità di scegliere una piattaforma backend completa per PiùCane che supporti:
- Database NoSQL per profili cani, ordini, utenti
- Autenticazione utenti (email/password, social login)
- Storage file (foto cani, documenti)
- Cloud functions per logica server-side
- Push notifications (FCM)
- Analytics integration
- Hosting static assets

**Alternatives considerate**:
1. **Firebase** (Google Cloud)
2. **AWS Amplify** (Amazon)
3. **Supabase** (open-source)
4. **Custom stack** (Node.js + PostgreSQL + S3)

---

## Decision

Adottiamo **Firebase** come platform backend principale per PiùCane.

**Servizi utilizzati**:
- ✅ **Firestore** - Database NoSQL
- ✅ **Firebase Auth** - Autenticazione
- ✅ **Cloud Storage** - File storage
- ✅ **Cloud Functions** - Serverless backend
- ✅ **FCM** - Push notifications
- ✅ **Firebase Hosting** - Static hosting (multi-site)
- ✅ **Firebase Performance Monitoring**
- ✅ **Google Analytics for Firebase**

---

## Rationale

### ✅ Pro Firebase

1. **Real-time Database**
   - Firestore offre aggiornamenti real-time nativi
   - Perfetto per inbox, chat AI, missioni gamification
   - Offline-first per PWA (sync automatica)

2. **Integrazione Nativa**
   - Firebase Auth + Firestore = zero configuration
   - Security Rules testabili e deployabili
   - Trigger automatici tra servizi (onWrite, onCreate)

3. **Scalabilità Automatica**
   - Firestore scala automaticamente (no capacity planning)
   - Cloud Functions auto-scale
   - Pay-per-use pricing (no fixed costs per piccolo traffico)

4. **Developer Experience**
   - SDK JavaScript/TypeScript eccellenti
   - Emulators locali per development
   - CLI potente (`firebase deploy`)
   - Ottima documentazione

5. **Ecosystem Google**
   - Integrazione nativa GA4, Google Ads
   - BigQuery export per analytics avanzate
   - Google Cloud Functions (Node.js 18+)

6. **Time-to-Market**
   - Backend pronto in giorni, non mesi
   - No DevOps overhead (managed service)
   - Permette focus su business logic

### ❌ Contro Firebase

1. **Vendor Lock-in**
   - Difficile migrare via da Firebase (Firestore query specifiche)
   - **Mitigation**: Astrarre database layer con repository pattern
   - **Mitigation**: Usare Firestore REST API per portabilità futura

2. **No SQL Tradizionale**
   - No JOIN, no transactions complesse
   - Richiede denormalizzazione dati
   - **Mitigation**: Progettare schema NoSQL-first
   - **Mitigation**: Usare Cloud Functions per aggregazioni

3. **Costi Variabili**
   - Pricing basato su letture/scritture (può scalare costi rapidamente)
   - **Mitigation**: Monitoraggio costi + alerts
   - **Mitigation**: Caching strategico (Redis se necessario)
   - **Mitigation**: Firestore query optimization

4. **Query Limitations**
   - No full-text search nativo (serve Algolia/Typesense)
   - No aggregazioni complesse (COUNT, AVG richiede client-side)
   - **Mitigation**: Algolia per search
   - **Mitigation**: Aggregazioni in Cloud Functions

5. **Cold Start Functions**
   - Cloud Functions hanno cold start ~1-2s
   - **Mitigation**: Min instances per funzioni critiche
   - **Mitigation**: HTTP keep-alive

---

## Alternatives Considered

### Option 2: AWS Amplify

**Pro**:
- Stack AWS completo (RDS, S3, Lambda, Cognito)
- Più flessibile di Firebase
- Supporto GraphQL nativo (AppSync)

**Contro**:
- Curva apprendimento più ripida
- DX inferiore a Firebase (setup complesso)
- Costi fissi più alti per piccolo traffico
- Less real-time friendly

**Verdict**: ❌ Rejected - Overkill per fase iniziale, DX peggiore

---

### Option 3: Supabase

**Pro**:
- Open-source (self-hostable)
- PostgreSQL (SQL tradizionale)
- Real-time subscriptions
- Ottimo DX

**Contro**:
- Ecosystem più piccolo (meno integrazioni)
- Meno maturo di Firebase (2020 vs 2011)
- No equivalente GA4/FCM nativi
- Community più piccola

**Verdict**: ❌ Rejected - Troppo giovane, preferenza per stabilità Firebase

---

### Option 4: Custom Stack (Node.js + PostgreSQL + Redis)

**Pro**:
- Massima flessibilità
- No vendor lock-in
- SQL tradizionale

**Contro**:
- 3-6 mesi di development backend
- DevOps overhead (Kubernetes, scaling, monitoring)
- Costi DevOps team
- No real-time senza WebSocket custom

**Verdict**: ❌ Rejected - Time-to-market troppo lungo, costi fissi DevOps

---

## Consequences

### Positive

1. ✅ **Time-to-Market Rapido**: MVP in 3 mesi invece di 6+
2. ✅ **Scalabilità Zero-Effort**: Auto-scaling fino a milioni di utenti
3. ✅ **Real-Time Features**: Inbox, chat AI, gamification senza sforzo
4. ✅ **PWA Offline-First**: Firestore offline support nativo
5. ✅ **Costi Iniziali Bassi**: Pay-per-use (€0 per <50k reads/day)
6. ✅ **Security Built-in**: Firestore Security Rules + Firebase Auth

### Negative

1. ⚠️ **Vendor Lock-in**: Migrare via da Firebase è costoso
2. ⚠️ **Query Limitations**: No JOIN, no full-text search, no aggregazioni complesse
3. ⚠️ **Denormalization Required**: Schema design NoSQL diverso da SQL
4. ⚠️ **Cost Variability**: Scaling costi con traffico (serve monitoring attento)

### Neutral

1. 🔵 **Curva Apprendimento NoSQL**: Team deve imparare Firestore (1-2 settimane)
2. 🔵 **Dependency Google Ecosystem**: Vincolo a stack Google (GA4, GCP, ecc.)

---

## Mitigation Strategies

### 1. Vendor Lock-in
```typescript
// Repository Pattern per astrarre Firestore
interface DogRepository {
  findById(id: string): Promise<Dog>;
  save(dog: Dog): Promise<void>;
  findByUserId(userId: string): Promise<Dog[]>;
}

// Implementazione Firestore (sostituibile)
class FirestoreDogRepository implements DogRepository {
  async findById(id: string): Promise<Dog> {
    const doc = await db.collection('dogs').doc(id).get();
    return doc.data() as Dog;
  }
  // ...
}

// Future: PostgreSQLDogRepository se necessario
```

### 2. Query Limitations
```typescript
// Algolia per full-text search
import algoliasearch from 'algoliasearch';
const searchClient = algoliasearch('APP_ID', 'API_KEY');
const index = searchClient.initIndex('products');

// Search invece di Firestore query
const results = await index.search('cibo cane 5kg');
```

### 3. Cost Monitoring
```typescript
// Budget alerts in Google Cloud Console
// Alert: Monthly Firebase spend >€500
// Alert: Daily Firestore reads >1M

// Caching per ridurre reads
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 }); // 10 min TTL

async function getProduct(id: string): Promise<Product> {
  const cached = cache.get(id);
  if (cached) return cached;

  const product = await db.collection('products').doc(id).get();
  cache.set(id, product.data());
  return product.data();
}
```

---

## Implementation Notes

### Firestore Schema Design Principles

1. **Denormalize for Read Performance**
   ```typescript
   // ❌ Bad: Require JOIN to get user info
   {
     orderId: "order-123",
     userId: "user-456" // Need second query
   }

   // ✅ Good: Embed user info
   {
     orderId: "order-123",
     user: {
       uid: "user-456",
       name: "Mario Rossi",
       email: "mario@example.com"
     }
   }
   ```

2. **Use Subcollections for 1:N Relations**
   ```typescript
   // dogs/{dogId}/vaccinations/{vaccinationId}
   // dogs/{dogId}/visits/{visitId}
   // users/{userId}/orders/{orderId}
   ```

3. **Use Collection Group Queries When Needed**
   ```typescript
   // Get all vaccinations across all dogs expiring this month
   const expiringVaccinations = await db.collectionGroup('vaccinations')
     .where('nextDueDate', '<=', nextMonthDate)
     .get();
   ```

### Cloud Functions Organization

```
/functions
  /triggers          # Firestore triggers (onCreate, onUpdate)
    - onOrderCreated.ts
    - onUserSignup.ts
  /scheduled         # Cron jobs
    - dailyMissionReset.ts
    - subscriptionRenewals.ts
  /callable          # Client-callable functions
    - createSubscription.ts
    - processRefund.ts
  /https             # REST endpoints
    - webhookStripe.ts
```

---

## Monitoring & Alerts

### Firebase Console Metrics
- **Firestore**: Reads, Writes, Deletes per day
- **Cloud Functions**: Invocations, Errors, Cold starts
- **Storage**: Bandwidth, Storage used
- **Auth**: Active users, Sign-ups

### Custom Alerts
- Budget alert: €500/month
- Firestore reads > 1M/day (check caching)
- Cloud Function errors > 1% (check logs)
- Storage bandwidth > 100GB/month

---

## Review Date

**Next Review**: 2025-12-01 (1 year after launch)

**Triggers for re-evaluation**:
- Firebase costs >€2000/month con <10k utenti attivi
- Query limitations bloccano feature critiche
- Team vuole migrare a SQL per analytics
- Problemi scalabilità Firestore (latency >500ms p95)

---

## References

- [Firestore Data Model Best Practices](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Pricing Calculator](https://firebase.google.com/pricing)
- [Firestore vs PostgreSQL Comparison](https://cloud.google.com/firestore/docs/firestore-or-cloud-sql)
- [Firebase for Startups Guide](https://firebase.google.com/docs/guides)

---

## Sign-off

- ✅ **CTO**: Approved
- ✅ **Tech Lead**: Approved
- ✅ **Backend Team**: Approved
- ✅ **Finance**: Approved (budget constraints met)