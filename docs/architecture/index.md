# Architecture — Index
**Owner:** Engineering Team • **Ultimo aggiornamento:** 2024-01-01 • **Versione doc:** v1.0

## Scopo
Panoramica architetturale del sistema PiuCane: monorepo headless con separazione domini.

## Architettura High-Level

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PWA Client    │    │  Admin Panel    │    │  API Gateway    │
│ app.piucane.it  │    │admin.piucane.it │    │ api.piucane.it  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Firebase      │
                    │  Firestore DB   │
                    │  Auth, Storage  │
                    └─────────────────┘
```

## Stack Tecnologico

### Frontend
- **Next.js 14**: React framework con App Router
- **Tailwind CSS**: Styling e design system
- **PWA**: Service worker per offline
- **TypeScript**: Type safety

### Backend
- **Express.js**: API server
- **Firebase Admin**: Database e auth
- **Node.js**: Runtime environment
- **TypeScript**: Type safety

### Database
- **Firestore**: NoSQL database principale
- **Firebase Auth**: Autenticazione utenti
- **Cloud Storage**: File e media

### Infrastructure
- **Google Cloud**: Hosting e servizi
- **Cloud Run**: Container deployment
- **Cloud Functions**: Serverless functions
- **CDN**: Global content delivery

## Monorepo Structure

```
piucane/
├── apps/
│   ├── web/          # PWA utente
│   └── admin/        # Backoffice admin
├── api/              # API server
├── packages/
│   ├── ui/           # Design system condiviso
│   └── lib/          # Utilities condivise
├── config/           # Configurazioni CSP, CORS, GTM
├── docs/             # Documentazione
└── functions/        # Cloud Functions
```

## Principi Architetturali

### 1. Separation of Concerns
- PWA: Esperienza utente ottimizzata
- Admin: Gestione backoffice e CMS
- API: Business logic e orchestrazione

### 2. Headless Architecture
- Frontend disaccoppiato dal backend
- API-first approach
- Flessibilità per futuri client

### 3. Security by Design
- RBAC su tutti gli endpoint
- CSP headers configurabili
- Firestore security rules
- Input validation con Zod

### 4. Privacy First
- Consent Mode v2 implementation
- GDPR compliance
- Data minimization
- Transparent data handling

### 5. Performance Optimized
- PWA per performance mobile
- Image optimization
- Code splitting
- Caching strategies

## Domain Separation

### app.piucane.it (PWA)
- Esperienza cliente ottimizzata
- PWA con offline support
- Gamification e engagement
- Mobile-first design

### admin.piucane.it (Backoffice)
- Gestione prodotti e ordini
- CMS per contenuti
- Analytics e reports
- Operazioni magazzino

### api.piucane.it (API)
- REST API endpoints
- Autenticazione e autorizzazione
- Business logic
- Integrations terze parti

## Data Flow

1. **User Interaction**: Utente interagisce con PWA
2. **CTA Tracking**: GTM cattura interazioni
3. **API Calls**: PWA chiama API per dati
4. **Business Logic**: API processa richieste
5. **Database**: Firestore storage e retrieval
6. **Analytics**: Eventi inviati a GA4
7. **Messaging**: Orchestratore invia comunicazioni

## Security Layers

1. **Network**: HTTPS, CSP headers
2. **Authentication**: Firebase Auth con JWT
3. **Authorization**: RBAC middleware
4. **Data**: Firestore security rules
5. **Input**: Zod validation schemas
6. **Rate Limiting**: Express rate limiter