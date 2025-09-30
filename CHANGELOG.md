# Changelog

All notable changes to the PiuCane project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 🔒 **GDPR Consent Management Platform (CMP)** - 2025-09-29
- ✨ **ConsentBanner** component (486 lines) - GDPR-compliant banner with 3 actions
  - Banner bottom con "Rifiuta tutto", "Personalizza", "Accetta tutto"
  - Modal settings con toggle granulari per 5 categorie
  - Re-consent automatico dopo 13 mesi (GDPR requirement)
  - Custom event `piucane_consent_updated` per sync real-time
- ✨ **ConsentManager** component (628 lines) - Advanced consent system
  - 5 categorie granulari (necessary, functional, analytics, marketing, personalization)
  - Visualizzazione finalità trattamento (lawful basis, retention, conseguenze)
  - Terze parti coinvolte con garanzie (SCC, Privacy Shield)
  - Cronologia consensi con timestamp
  - Export dati consensi (GDPR Art. 15 compliance)
- ✨ **useConsent** hook (253 lines) - React hook per state management
  - `hasConsent()`, `updateConsent()`, `acceptAll()`, `rejectAll()`, `revokeConsent()`
  - `useConsentGate()` per script gating
  - `useConsentMode()` per Google Consent Mode v2
- ✨ **ScriptGate** component (340 lines) - Script loading basato su consent
  - Pre-configured per: GA4, Google Ads, Meta Pixel, Hotjar, LinkedIn, Intercom
  - Automatic blocking senza consenso appropriato
- ✨ **GTMContainer** component (298 lines) - Google Tag Manager integration
  - Consent Mode v2 built-in
  - `useGTMEvent()` hook per custom events
  - `GTMEcommerce` helpers per e-commerce tracking
  - `GTMConsentSync` auto-sync consent updates
- 🔒 **Google Consent Mode v2** - Full implementation
  - Default state: all denied (except security_storage)
  - Update on user consent choice
  - 7 consent parameters (analytics_storage, ad_storage, ad_user_data, ad_personalization, etc.)

#### 📚 **Documentation Overhaul** - 2025-09-29
- 📝 **CMP Documentation** (4 files)
  - [consent-mode.md](docs/cmp/consent-mode.md) - Google Consent Mode v2 guide (350+ lines)
  - [gtm-mapping.md](docs/cmp/gtm-mapping.md) - GTM tags mapping (600+ lines)
  - [cookie-policy.md](docs/cmp/cookie-policy.md) - Complete cookie policy
  - [scripts-matrix.md](docs/cmp/scripts-matrix.md) - Script-to-consent matrix
- 📝 **AI Agents Documentation** (2 files)
  - [prompts.md](docs/ai/prompts.md) - System prompts for 3 agents (Vet, Educatore, Groomer) (600+ lines)
  - [safety-guardrails.md](docs/ai/safety-guardrails.md) - Safety & risk mitigation (650+ lines)
- 📝 **ADR (Architectural Decision Records)** (3 files)
  - [ADR-001-firebase-platform.md](docs/adr/ADR-001-firebase-platform.md) - Firebase vs alternatives (450+ lines)
  - [ADR-002-monorepo-turborepo.md](docs/adr/ADR-002-monorepo-turborepo.md) - Turborepo vs Nx (400+ lines)
  - [ADR-003-nextjs-app-router.md](docs/adr/ADR-003-nextjs-app-router.md) - Next.js 14 App Router (500+ lines)
- 📝 **Governance Files** (4 files)
  - [LICENSE](LICENSE) - Proprietary license
  - [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines (500+ lines)
  - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Contributor Covenant 2.1
  - [CODEOWNERS](CODEOWNERS) - Team ownership mapping
- 📝 **Index.md Files** (16 directories)
  - Created comprehensive index.md for: a11y, cmp, crm, ecommerce, subscriptions, gamification, onboarding, messaging, warehouse, legal, runbooks, qa, security, adr, ai, analytics
  - Each with scope, gate CI/CD, owner, last updated date
- 📝 **Test Configuration** (2 files)
  - [jest.config.js](jest.config.js) - Root Jest config with 80% coverage threshold
  - [jest.setup.js](jest.setup.js) - Mocks for Firebase, Stripe, SendGrid, Twilio, Gemini
- 🧪 **QA Baseline 2025-09-30**
  - Checkout GA4 instrumentation (`home.*`, `cart.*`, `checkout.*`) allineato a PROMPTMASTER
  - Nuove suite Jest (cadence, triage AI, Stripe webhook) + Playwright/Lighthouse config dedicata
  - Documentazione QA (`docs/qa/index.md`, `test-plan.md`, `perf-budgets.md`) con budget LCP/TTI/CLS

### Changed
- 🔧 **Updated layout.tsx** - Integrated ConsentBanner and GTMContainer
- 🔧 **Updated analytics/consent.ts** - Added getConsentState() function
- 🔧 **Updated docs/cmp/index.md** - Complete CMP implementation documentation
- 🔧 **Updated README.md** - Added FASE 2 progress report with metrics

### Fixed
- 🐛 **CI Workflow** - Removed broken `quality-checks` job reference from .github/workflows/ci.yml
  - Fixed 8 job dependencies that referenced non-existent quality-checks job
  - All jobs now depend on `setup` instead
  - Workflow validation passes

### Security
- 🔒 **GDPR Compliance** - Full implementation of consent management
  - Art. 6-7: Consenso esplicito e revocabile ✅
  - Art. 12-14: Informazione trasparente ✅
  - Art. 15: Export dati consensi ✅
  - Art. 21: Diritto opposizione ✅
- 🔒 **Google Consent Mode v2** - Privacy-preserving analytics
  - Cookieless pings quando consenso negato
  - Behavioral modeling per conversion estimation
- 🔒 **Script Gating** - Third-party scripts loaded only with consent
  - GA4, Google Ads, Meta Pixel, Hotjar, LinkedIn, Intercom

### Technical Debt Resolved
- ✅ Complete CMP implementation (was TODO)
- ✅ Comprehensive documentation structure (was 42% → now 85%)
- ✅ CI/CD workflow fixes (was broken)
- ✅ Governance files (was missing)
- ✅ Test infrastructure setup with coverage thresholds (was missing)

## [1.0.0] - 2024-01-01

### Added
- 🚀 **Initial Release**
- ✨ **PWA Consumer App**
  - Homepage with hero section and features
  - Next.js 14 with App Router
  - Tailwind CSS styling
  - PWA configuration with service worker
  - Analytics integration (GA4, GTM)
  - Consent management preparation

- 🏢 **Admin Backoffice**
  - Dashboard with key metrics
  - Next.js 14 admin interface
  - RBAC ready structure
  - Responsive design

- 🔌 **API Server**
  - Express.js REST API
  - Firebase Admin integration
  - Authentication middleware
  - Error handling middleware
  - Module-based route organization
  - TypeScript throughout

- 📦 **Shared Packages**
  - UI design system with Button, Card, Input components
  - Messaging library with Email and Push services
  - Type-safe component props

- ⚙️ **Configuration**
  - CSP headers for web and admin
  - CORS allowed origins by environment
  - GTM container template

- 📚 **Documentation**
  - Comprehensive docs structure
  - Architecture documentation
  - Analytics and CTA tracking guides
  - API documentation structure
  - Security and accessibility guides

- 🔒 **Security & Privacy**
  - Firestore security rules
  - Storage security rules
  - Firebase project configuration
  - Privacy-first analytics setup

- 🛠️ **Development Tools**
  - GitHub issue templates
  - Pull request template
  - TypeScript configuration
  - ESLint configuration
  - Testing framework setup

### Technical Debt
- Complete implementation of all documented modules
- Add comprehensive test coverage
- Implement CI/CD pipelines
- Add monitoring and error tracking
- Complete AI agent implementation
- Implement complete e-commerce flow

---

**Legend:**
- 🚀 Major feature
- ✨ New feature
- 🐛 Bug fix
- 📝 Documentation
- 🔒 Security
- ⚡ Performance
- 💥 Breaking change
