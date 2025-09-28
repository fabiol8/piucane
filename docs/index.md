# PiùCane - Documentazione Tecnica

## 📚 Panoramica

PiùCane è una piattaforma completa per la gestione del benessere dei cani, sviluppata con architettura moderna e conformità GDPR al 100%.

### 🏗️ Architettura

- **Frontend**: Next.js 14 con App Router
- **Backend**: Firebase Functions + API REST
- **Database**: Cloud Firestore + Cloud Storage
- **AI**: Google Gemini con 3 agenti specializzati
- **Hosting**: Firebase Multi-Site
- **Monorepo**: Gestito con npm workspaces

### 🎯 Caratteristiche Principali

1. **🐕 Onboarding & Profili Cani**: Sistema completo di gestione profili con libretto vaccinale
2. **🛒 E-commerce**: Checkout Stripe, gestione ordini e abbonamenti
3. **🎮 Gamification**: Missioni, badge e sistema rewards
4. **🤖 AI Agents**: Veterinario, Educatore e Groomer virtuali
5. **📬 Messaging**: Sistema multi-canale (email, SMS, WhatsApp, push)
6. **👥 CRM**: Segmentazione clienti e customer journey
7. **🏭 Warehouse**: Gestione magazzino con FEFO e pick&pack
8. **🔧 Admin**: Backoffice completo per gestione piattaforma

## 📋 Indice Documentazione

### 🏗️ Architettura & Setup
- [Architettura Sistema](./architecture/overview.md)
- [Deployment Guide](./deployment/guide.md)
- [Firebase Configuration](./deployment/firebase.md)
- [Environment Setup](./deployment/environments.md)

### 🔌 API & Integrazioni
- [API Reference](./api/reference.md)
- [Endpoint Documentation](./api/endpoints.md)
- [Authentication](./api/auth.md)
- [Rate Limiting](./api/rate-limiting.md)
- [Webhooks](./api/webhooks.md)

### 📊 Analytics & Tracking
- [CTA Registry](./cta/registry.json)
- [GA4 Events](./analytics/ga4-events.md)
- [Tracking Implementation](./analytics/tracking.md)
- [Performance Monitoring](./analytics/performance.md)

### 🤖 AI & Machine Learning
- [AI Agents Overview](./ai/agents.md)
- [Gemini Integration](./ai/gemini.md)
- [Safety & Compliance](./ai/safety.md)
- [Rate Limiting](./ai/rate-limiting.md)

### 🔒 Security & Compliance
- [Security Overview](./security/overview.md)
- [Firestore Rules](./security/firestore-rules.md)
- [Storage Rules](./security/storage-rules.md)
- [GDPR Compliance](./security/gdpr.md)

### 🧪 Testing & Quality
- [Testing Strategy](./testing/strategy.md)
- [E2E Tests](./testing/e2e.md)
- [Performance Tests](./testing/performance.md)
- [Accessibility Tests](./testing/accessibility.md)

### 📱 Frontend Applications
- [Web App](./frontend/web-app.md)
- [Admin Panel](./frontend/admin-panel.md)
- [PWA Features](./frontend/pwa.md)
- [Component Library](./frontend/components.md)

### 🏭 Backend Services
- [API Architecture](./backend/api.md)
- [Firebase Functions](./backend/functions.md)
- [Database Schema](./backend/database.md)
- [Message Queue](./backend/messaging.md)

### 🎮 Feature Modules
- [Onboarding System](./features/onboarding.md)
- [Dog Profiles](./features/dogs.md)
- [E-commerce](./features/ecommerce.md)
- [Subscriptions](./features/subscriptions.md)
- [Gamification](./features/gamification.md)
- [AI Chat](./features/ai-chat.md)
- [Messaging](./features/messaging.md)
- [CRM](./features/crm.md)
- [Warehouse](./features/warehouse.md)

## 🚀 Quick Start

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/piucane.git
   cd piucane
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp environments/.env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   npm run test:e2e
   ```

## 🔧 Scripts Disponibili

- `npm run dev` - Avvia sviluppo locale
- `npm run build` - Build per produzione
- `npm test` - Test unitari
- `npm run test:e2e` - Test end-to-end
- `npm run lint` - Linting del codice
- `npm run type-check` - Controllo TypeScript
- `npm run validate:cta` - Validazione CTA registry
- `npm run validate:ga4` - Validazione schema GA4

## 📞 Supporto

- **Issues**: [GitHub Issues](https://github.com/your-org/piucane/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/piucane/discussions)
- **Email**: dev@piucane.it

## 📄 Licenza

© 2024 PiùCane. Tutti i diritti riservati.

---

**🎯 IMPORTANTE**: Questa documentazione deve essere conforme al 100% al PROMPTMASTER per essere approvata.