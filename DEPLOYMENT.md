# 🚀 Deployment Guide - PiùCane

## 📋 Prerequisiti

1. **GitHub Account** con repository creato
2. **Firebase Account** con billing abilitato
3. **Firebase CLI** installato (`npm install -g firebase-tools`)
4. **Git** configurato

## 🔧 Setup Automatico

### 1. GitHub Repository

```bash
# Se hai GitHub CLI installato
gh repo create piucane --public --description "🐕 PiùCane - Complete platform for dog wellness management"

# Oppure crea manualmente su github.com
# Repository name: piucane
# Description: 🐕 PiùCane - Complete platform for dog wellness management
```

### 2. Configurazione Git Remote

```bash
# Sostituisci YOUR_USERNAME con il tuo username GitHub
git remote add origin https://github.com/YOUR_USERNAME/piucane.git
git branch -M main
git push -u origin main
```

### 3. Firebase Projects Setup

```bash
# Login Firebase
firebase login

# Crea progetti Firebase
firebase projects:create piucane-prod --display-name "PiùCane Production"
firebase projects:create piucane-staging --display-name "PiùCane Staging"
firebase projects:create piucane-preview --display-name "PiùCane Preview"

# Lista progetti per verificare
firebase projects:list
```

### 4. Firebase Initialization

```bash
# Inizializza Firebase (usa le configurazioni già pronte)
firebase init

# Durante l'init, seleziona:
# ✅ Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys
# ✅ Functions: Configure a Cloud Functions directory and its files
# ✅ Firestore: Configure security rules and indexes files for Firestore
# ✅ Storage: Configure a security rules file for Cloud Storage

# Configurazioni specifiche:
# Project: piucane-prod (default)
# Functions: TypeScript, directory: api
# Hosting: apps/web/out (per web app)
# Firestore rules file: firestore.rules (già esistente)
# Firestore indexes file: firestore.indexes.json (già esistente)
# Storage rules file: storage.rules (già esistente)
```

### 5. Firebase Hosting Multi-Site Setup

```bash
# Aggiungi sites per hosting multi-site
firebase hosting:sites:create piucane-app --project piucane-prod
firebase hosting:sites:create piucane-admin --project piucane-prod
firebase hosting:sites:create piucane-docs --project piucane-prod

# Staging sites
firebase hosting:sites:create piucane-app-staging --project piucane-staging
firebase hosting:sites:create piucane-admin-staging --project piucane-staging
firebase hosting:sites:create piucane-docs-staging --project piucane-staging

# Preview sites
firebase hosting:sites:create piucane-app-preview --project piucane-preview
firebase hosting:sites:create piucane-admin-preview --project piucane-preview
```

### 6. Environment Variables Setup

```bash
# Copia file env per ogni ambiente
cp environments/.env.example .env.local
cp environments/.env.staging .env.staging
cp environments/.env.production .env.production

# Modifica i file con le tue configurazioni:
# - Firebase project IDs
# - API keys
# - Stripe keys
# - Altri servizi
```

## 🛠️ Build Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

### 2. Build Commands

```bash
# Build all apps
npm run build

# Build specific app
npm run build:web
npm run build:admin
npm run build:api
```

## 🚀 Deployment Commands

### Production Deployment

```bash
# Deploy completo
firebase deploy --project piucane-prod

# Deploy specifico
firebase deploy --only hosting:app --project piucane-prod
firebase deploy --only hosting:admin --project piucane-prod
firebase deploy --only functions --project piucane-prod
firebase deploy --only firestore:rules --project piucane-prod
firebase deploy --only storage --project piucane-prod
```

### Staging Deployment

```bash
firebase deploy --project piucane-staging
```

### Preview Deployment

```bash
firebase deploy --project piucane-preview
```

## 🔐 GitHub Secrets Configuration

Aggiungi questi secrets nel tuo repository GitHub (Settings > Secrets and variables > Actions):

```
# Firebase
FIREBASE_SERVICE_ACCOUNT_PROD=<service-account-json>
FIREBASE_SERVICE_ACCOUNT_STAGING=<service-account-json>
FIREBASE_SERVICE_ACCOUNT_PREVIEW=<service-account-json>
FIREBASE_PROJECT_ID_PROD=piucane-prod
FIREBASE_PROJECT_ID_STAGING=piucane-staging
FIREBASE_PROJECT_ID_PREVIEW=piucane-preview

# Firebase Token (per deploy)
FIREBASE_TOKEN=<firebase-ci-token>

# Analytics
GA4_ID_PROD=G-XXXXXXXXXX
GA4_ID_STAGING=G-YYYYYYYYYY

# APIs
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_SECRET_KEY_TEST=sk_test_...
GEMINI_API_KEY=your-gemini-api-key
```

### Genera Firebase CI Token

```bash
firebase login:ci
# Copia il token generato e aggiungilo come FIREBASE_TOKEN nei GitHub Secrets
```

### Genera Service Account Keys

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto
3. Settings > Service accounts
4. Generate new private key
5. Copia il JSON content nei GitHub Secrets

## 🌐 Custom Domains Setup

### 1. Configura domini in Firebase

```bash
# Aggiungi domini custom (sostituisci con i tuoi domini)
firebase hosting:sites:get piucane-app --project piucane-prod
# Poi vai su Firebase Console > Hosting > Add custom domain

# Domini suggeriti:
# app.piucane.it -> piucane-app
# admin.piucane.it -> piucane-admin
# docs.piucane.it -> piucane-docs
```

### 2. DNS Configuration

Aggiungi questi record DNS:

```
# A Records (sostituisci con gli IP di Firebase)
app    A    199.36.158.100
admin  A    199.36.158.100
docs   A    199.36.158.100

# CNAME (alternativo)
app    CNAME    piucane-app.web.app.
admin  CNAME    piucane-admin.web.app.
docs   CNAME    piucane-docs.web.app.
```

## 📊 Monitoring Setup

### 1. Firebase Performance

```bash
# Abilita Performance Monitoring
firebase init perf
```

### 2. Firebase Analytics

Configurato automaticamente con GA4 integration.

### 3. Error Monitoring

Sentry già configurato - aggiungi DSN negli environment variables.

## ✅ Verifica Deployment

### 1. Test Endpoints

```bash
# Test API health
curl https://api.piucane.it/health

# Test web app
curl https://app.piucane.it

# Test admin
curl https://admin.piucane.it
```

### 2. Firebase Console Checks

- ✅ Functions deployed
- ✅ Hosting sites active
- ✅ Firestore rules deployed
- ✅ Storage rules deployed
- ✅ Remote Config template

### 3. GitHub Actions

- ✅ CI pipeline passing
- ✅ Preview deployments working
- ✅ Auto-deploy to staging on develop branch
- ✅ Auto-deploy to production on main branch

## 🚨 Troubleshooting

### Common Issues

1. **Functions deployment fails**
   ```bash
   # Check Node.js version in functions
   cd api && node --version
   # Update package.json engines if needed
   ```

2. **Hosting build fails**
   ```bash
   # Clear cache and rebuild
   npm run clean
   npm run build
   ```

3. **Environment variables missing**
   ```bash
   # Verify all required vars are set
   firebase functions:config:get
   ```

### Logs

```bash
# View function logs
firebase functions:log --project piucane-prod

# View hosting logs
firebase hosting:channel:list --project piucane-prod
```

## 📞 Support

- **Firebase Console**: https://console.firebase.google.com
- **GitHub Actions**: Repository > Actions tab
- **Documentation**: /docs/index.md

---

🎯 **Il deployment è pronto!** Segui questa guida step-by-step per mettere online PiùCane.