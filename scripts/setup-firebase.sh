#!/bin/bash

# 🔥 Firebase Setup Script for PiùCane
# Questo script automatizza la configurazione completa di Firebase

set -e

echo "🔥 Setting up Firebase for PiùCane..."

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni helper
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica prerequisiti
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI not found. Install with: npm install -g firebase-tools"
        exit 1
    fi

    # Verifica login Firebase
    if ! firebase projects:list &> /dev/null; then
        log_warning "Not logged in to Firebase. Please run: firebase login"
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Chiedi informazioni all'utente
get_user_input() {
    log_info "Getting project information..."

    echo -n "Enter project base name [piucane]: "
    read PROJECT_BASE
    PROJECT_BASE=${PROJECT_BASE:-piucane}

    PROD_PROJECT="${PROJECT_BASE}-prod"
    STAGING_PROJECT="${PROJECT_BASE}-staging"
    PREVIEW_PROJECT="${PROJECT_BASE}-preview"

    echo ""
    echo "Projects to create:"
    echo "  Production: $PROD_PROJECT"
    echo "  Staging: $STAGING_PROJECT"
    echo "  Preview: $PREVIEW_PROJECT"
    echo ""
    echo -n "Continue? [Y/n]: "
    read CONTINUE
    if [[ "$CONTINUE" =~ ^[Nn]$ ]]; then
        log_error "Setup cancelled"
        exit 1
    fi

    log_success "Project info collected"
}

# Crea progetti Firebase
create_firebase_projects() {
    log_info "Creating Firebase projects..."

    # Production
    log_info "Creating production project: $PROD_PROJECT"
    if firebase projects:create "$PROD_PROJECT" --display-name "PiùCane Production"; then
        log_success "Production project created"
    else
        log_warning "Production project might already exist"
    fi

    # Staging
    log_info "Creating staging project: $STAGING_PROJECT"
    if firebase projects:create "$STAGING_PROJECT" --display-name "PiùCane Staging"; then
        log_success "Staging project created"
    else
        log_warning "Staging project might already exist"
    fi

    # Preview
    log_info "Creating preview project: $PREVIEW_PROJECT"
    if firebase projects:create "$PREVIEW_PROJECT" --display-name "PiùCane Preview"; then
        log_success "Preview project created"
    else
        log_warning "Preview project might already exist"
    fi

    log_success "Firebase projects setup completed"
}

# Aggiorna .firebaserc
update_firebaserc() {
    log_info "Updating .firebaserc with project names..."

    cat > .firebaserc << EOF
{
  "projects": {
    "default": "$PROD_PROJECT",
    "staging": "$STAGING_PROJECT",
    "preview": "$PREVIEW_PROJECT"
  },
  "targets": {
    "$PROD_PROJECT": {
      "hosting": {
        "app": [
          "${PROJECT_BASE}-app"
        ],
        "admin": [
          "${PROJECT_BASE}-admin"
        ],
        "docs": [
          "${PROJECT_BASE}-docs"
        ]
      }
    },
    "$STAGING_PROJECT": {
      "hosting": {
        "app": [
          "${PROJECT_BASE}-app-staging"
        ],
        "admin": [
          "${PROJECT_BASE}-admin-staging"
        ],
        "docs": [
          "${PROJECT_BASE}-docs-staging"
        ]
      }
    },
    "$PREVIEW_PROJECT": {
      "hosting": {
        "app": [
          "${PROJECT_BASE}-app-preview"
        ],
        "admin": [
          "${PROJECT_BASE}-admin-preview"
        ]
      }
    }
  },
  "etags": {},
  "dataconnectEmulatorConfig": {}
}
EOF

    log_success ".firebaserc updated"
}

# Crea hosting sites
setup_hosting_sites() {
    log_info "Setting up hosting sites..."

    # Production sites
    log_info "Creating production hosting sites..."
    firebase hosting:sites:create "${PROJECT_BASE}-app" --project "$PROD_PROJECT" || log_warning "App site might already exist"
    firebase hosting:sites:create "${PROJECT_BASE}-admin" --project "$PROD_PROJECT" || log_warning "Admin site might already exist"
    firebase hosting:sites:create "${PROJECT_BASE}-docs" --project "$PROD_PROJECT" || log_warning "Docs site might already exist"

    # Staging sites
    log_info "Creating staging hosting sites..."
    firebase hosting:sites:create "${PROJECT_BASE}-app-staging" --project "$STAGING_PROJECT" || log_warning "Staging app site might already exist"
    firebase hosting:sites:create "${PROJECT_BASE}-admin-staging" --project "$STAGING_PROJECT" || log_warning "Staging admin site might already exist"
    firebase hosting:sites:create "${PROJECT_BASE}-docs-staging" --project "$STAGING_PROJECT" || log_warning "Staging docs site might already exist"

    # Preview sites
    log_info "Creating preview hosting sites..."
    firebase hosting:sites:create "${PROJECT_BASE}-app-preview" --project "$PREVIEW_PROJECT" || log_warning "Preview app site might already exist"
    firebase hosting:sites:create "${PROJECT_BASE}-admin-preview" --project "$PREVIEW_PROJECT" || log_warning "Preview admin site might already exist"

    log_success "Hosting sites setup completed"
}

# Deploy regole e configurazioni
deploy_initial_config() {
    log_info "Deploying initial configuration..."

    # Deploy su production
    log_info "Deploying to production..."
    firebase deploy --only firestore:rules,firestore:indexes,storage --project "$PROD_PROJECT" || log_warning "Some deployments might have failed"

    # Deploy su staging
    log_info "Deploying to staging..."
    firebase deploy --only firestore:rules,firestore:indexes,storage --project "$STAGING_PROJECT" || log_warning "Some deployments might have failed"

    # Deploy su preview
    log_info "Deploying to preview..."
    firebase deploy --only firestore:rules,firestore:indexes,storage --project "$PREVIEW_PROJECT" || log_warning "Some deployments might have failed"

    log_success "Initial configuration deployed"
}

# Genera informazioni per GitHub Secrets
generate_github_secrets_info() {
    log_info "Generating GitHub Secrets information..."

    echo ""
    echo "🔐 GitHub Secrets Configuration"
    echo "==============================="
    echo ""
    echo "Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):"
    echo ""
    echo "# Firebase Projects"
    echo "FIREBASE_PROJECT_ID_PROD=$PROD_PROJECT"
    echo "FIREBASE_PROJECT_ID_STAGING=$STAGING_PROJECT"
    echo "FIREBASE_PROJECT_ID_PREVIEW=$PREVIEW_PROJECT"
    echo ""
    echo "# Firebase Token (run: firebase login:ci)"
    echo "FIREBASE_TOKEN=<your-ci-token>"
    echo ""
    echo "# Service Account Keys (generate from Firebase Console > Project Settings > Service accounts)"
    echo "FIREBASE_SERVICE_ACCOUNT_PROD=<service-account-json>"
    echo "FIREBASE_SERVICE_ACCOUNT_STAGING=<service-account-json>"
    echo "FIREBASE_SERVICE_ACCOUNT_PREVIEW=<service-account-json>"
    echo ""

    # Salva in un file
    cat > firebase-secrets.txt << EOF
GitHub Secrets Configuration for Firebase
=========================================

Add these secrets to your GitHub repository:

# Firebase Projects
FIREBASE_PROJECT_ID_PROD=$PROD_PROJECT
FIREBASE_PROJECT_ID_STAGING=$STAGING_PROJECT
FIREBASE_PROJECT_ID_PREVIEW=$PREVIEW_PROJECT

# Firebase Token (run: firebase login:ci)
FIREBASE_TOKEN=<your-ci-token>

# Service Account Keys
FIREBASE_SERVICE_ACCOUNT_PROD=<service-account-json>
FIREBASE_SERVICE_ACCOUNT_STAGING=<service-account-json>
FIREBASE_SERVICE_ACCOUNT_PREVIEW=<service-account-json>

# Analytics
GA4_ID_PROD=G-XXXXXXXXXX
GA4_ID_STAGING=G-YYYYYYYYYY

Next Steps:
1. Generate Firebase CI token: firebase login:ci
2. Generate service account keys from Firebase Console
3. Add all secrets to GitHub repository
4. Test deployment with GitHub Actions
EOF

    log_success "GitHub secrets info saved to firebase-secrets.txt"
}

# Aggiorna environment files
update_environment_files() {
    log_info "Updating environment files with project IDs..."

    # Update .env.production
    if [[ -f "environments/.env.production" ]]; then
        sed -i.bak "s/NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*/NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROD_PROJECT/" environments/.env.production
        rm environments/.env.production.bak 2>/dev/null || true
    fi

    # Update .env.staging
    if [[ -f "environments/.env.staging" ]]; then
        sed -i.bak "s/NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*/NEXT_PUBLIC_FIREBASE_PROJECT_ID=$STAGING_PROJECT/" environments/.env.staging
        rm environments/.env.staging.bak 2>/dev/null || true
    fi

    log_success "Environment files updated"
}

# Test deploy locale
test_local_deployment() {
    log_info "Testing local deployment..."

    # Avvia emulatori per test
    log_info "Starting Firebase emulators for testing..."
    firebase emulators:start --only firestore,functions,hosting &
    EMULATOR_PID=$!

    sleep 5

    # Test endpoints
    if curl -f http://localhost:5000 &> /dev/null; then
        log_success "Local hosting is working"
    else
        log_warning "Local hosting test failed"
    fi

    # Ferma emulatori
    kill $EMULATOR_PID 2>/dev/null || true

    log_success "Local deployment test completed"
}

# Mostra informazioni finali
show_final_info() {
    echo ""
    log_success "🎉 Firebase setup completed successfully!"
    echo ""
    echo "📋 Project Information:"
    echo "   Production: https://console.firebase.google.com/project/$PROD_PROJECT"
    echo "   Staging: https://console.firebase.google.com/project/$STAGING_PROJECT"
    echo "   Preview: https://console.firebase.google.com/project/$PREVIEW_PROJECT"
    echo ""
    echo "🌐 Hosting URLs:"
    echo "   App: https://${PROJECT_BASE}-app.web.app"
    echo "   Admin: https://${PROJECT_BASE}-admin.web.app"
    echo "   Docs: https://${PROJECT_BASE}-docs.web.app"
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. Generate Firebase CI token: firebase login:ci"
    echo "   2. Add GitHub Secrets (see firebase-secrets.txt)"
    echo "   3. Configure custom domains in Firebase Console"
    echo "   4. Test deployment: npm run deploy:staging"
    echo ""
    echo "📚 Documentation:"
    echo "   - DEPLOYMENT.md: Complete deployment guide"
    echo "   - firebase-secrets.txt: GitHub secrets configuration"
    echo ""
}

# Script principale
main() {
    echo "🔥 PiùCane Firebase Setup"
    echo "========================"
    echo ""

    check_prerequisites
    get_user_input
    create_firebase_projects
    update_firebaserc
    setup_hosting_sites
    deploy_initial_config
    update_environment_files
    generate_github_secrets_info
    test_local_deployment
    show_final_info
}

# Esegui script
main "$@"