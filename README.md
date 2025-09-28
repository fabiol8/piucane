# 🐕 PiùCane - Complete Pet Care Platform

**La piattaforma completa per il benessere del tuo cane**

## 🎯 Panoramica

PiùCane è una piattaforma completa che combina:
- 🛒 E-commerce con abbonamenti personalizzati
- 🤖 AI Agents specializzati (Vet, Educatore, Groomer)
- 🎮 Gamification con missioni e ricompense
- 📬 Messaggistica multicanale intelligente
- 👥 CRM con customer journey automation
- 🏭 Warehouse management FEFO

## 🏗️ Architettura

```
piucanecom/
├── apps/
│   ├── web/        # App principale (app.piucane.it)
│   ├── admin/      # Admin backoffice (admin.piucane.it)
│   └── api/        # API server (api.piucane.it)
├── packages/
│   ├── ui/         # Design system
│   └── lib/        # Librerie condivise
└── docs/           # Documentazione
```

## 🚀 Quick Start

```bash
git clone https://github.com/piucane/piucane.git
cd piucane
npm install
npm run dev
```

## 🧩 Moduli Principali

### 🐕 Onboarding & Profili Cani
- Form schema editabile da admin
- Profili cani con libretto vaccinale
- Gestione veterinari associati

### 🛒 E-commerce & Checkout  
- Checkout Stripe completo
- Abbonamenti con calcolo cadenze
- Sistema wishlist

### 🤖 AI Agents (Gemini)
- **Vet AI**: Triage con red flags
- **Educatore AI**: Missioni personalizzate  
- **Groomer AI**: Routine mantello

### 📬 Messaggistica Multicanale
- Email (MJML), SMS, WhatsApp, Push
- Rate limiting e quiet hours
- Inbox unificata

### 👥 CRM & Customer Journey
- Segmentazione automatica
- Journey automation
- Analytics avanzati

### 🏭 Warehouse Management
- FEFO engine
- Pick & Pack automation
- Lot tracking con scadenze

## 📊 Analytics & Tracking

Ogni interazione è tracciata con `data-cta-id` e mappata a eventi GA4.

## 🔒 Sicurezza & Privacy

- WCAG 2.2 AA compliant
- GDPR con CMP configurabile
- Firestore Rules testate
- CSP/HSTS headers

## 🧪 Testing

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests  
npm run test:a11y     # Accessibilità
```

## 🚀 Deployment

| Environment | URL | Branch |
|-------------|-----|--------|
| Production | app.piucane.it | main |
| Staging | piucane-staging.web.app | develop |

---

🐕 Made with ❤️ for our four-legged friends
