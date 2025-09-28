#!/bin/bash

# 🚀 GitHub Setup Script for PiùCane
# Questo script automatizza la configurazione del repository GitHub

set -e

echo "🚀 Setting up GitHub repository for PiùCane..."

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

    if ! command -v git &> /dev/null; then
        log_error "Git not found. Please install Git first."
        exit 1
    fi

    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI not found. You'll need to create the repository manually."
        USE_GH_CLI=false
    else
        USE_GH_CLI=true
    fi

    log_success "Prerequisites check completed"
}

# Chiedi informazioni all'utente
get_user_input() {
    log_info "Getting repository information..."

    echo -n "Enter your GitHub username: "
    read GITHUB_USERNAME

    if [[ -z "$GITHUB_USERNAME" ]]; then
        log_error "GitHub username is required"
        exit 1
    fi

    echo -n "Enter repository name [piucane]: "
    read REPO_NAME
    REPO_NAME=${REPO_NAME:-piucane}

    echo -n "Make repository public? [y/N]: "
    read IS_PUBLIC
    if [[ "$IS_PUBLIC" =~ ^[Yy]$ ]]; then
        VISIBILITY="public"
    else
        VISIBILITY="private"
    fi

    REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

    log_success "Repository info collected"
}

# Crea repository GitHub
create_github_repo() {
    if [[ "$USE_GH_CLI" == true ]]; then
        log_info "Creating GitHub repository using GitHub CLI..."

        if [[ "$VISIBILITY" == "public" ]]; then
            gh repo create "$REPO_NAME" --public --description "🐕 PiùCane - Complete platform for dog wellness management"
        else
            gh repo create "$REPO_NAME" --private --description "🐕 PiùCane - Complete platform for dog wellness management"
        fi

        log_success "Repository created successfully"
    else
        log_warning "Please create the repository manually:"
        echo "  1. Go to https://github.com/new"
        echo "  2. Repository name: $REPO_NAME"
        echo "  3. Description: 🐕 PiùCane - Complete platform for dog wellness management"
        echo "  4. Visibility: $VISIBILITY"
        echo "  5. DO NOT initialize with README"
        echo ""
        echo "Press Enter when done..."
        read
    fi
}

# Configura Git remote
setup_git_remote() {
    log_info "Setting up Git remote..."

    # Rimuovi remote esistente se presente
    if git remote get-url origin &> /dev/null; then
        git remote remove origin
    fi

    # Aggiungi nuovo remote
    git remote add origin "$REPO_URL"

    # Configura branch principale
    git branch -M main

    log_success "Git remote configured"
}

# Push codice su GitHub
push_to_github() {
    log_info "Pushing code to GitHub..."

    # Verifica che ci siano commit
    if ! git log --oneline -1 &> /dev/null; then
        log_error "No commits found. Please commit your changes first."
        exit 1
    fi

    # Push
    git push -u origin main

    log_success "Code pushed to GitHub successfully"
}

# Aggiorna package.json con URL corretto
update_package_json() {
    log_info "Updating package.json with repository URL..."

    # Backup del file originale
    cp package.json package.json.backup

    # Aggiorna repository URL
    if command -v jq &> /dev/null; then
        jq --arg url "$REPO_URL" '.repository.url = $url' package.json > package.json.tmp && mv package.json.tmp package.json
        jq --arg url "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/issues" '.bugs.url = $url' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        # Fallback con sed
        sed -i.bak "s|\"url\": \".*\"|\"url\": \"$REPO_URL\"|g" package.json
        sed -i.bak "s|\"url\": \"https://github.com/.*/issues\"|\"url\": \"https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/issues\"|g" package.json
        rm package.json.bak
    fi

    log_success "package.json updated"
}

# Crea commit aggiornamento
commit_updates() {
    log_info "Committing repository URL updates..."

    git add package.json
    git commit -m "📝 Update repository URLs in package.json

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    git push origin main

    log_success "Repository URLs updated and pushed"
}

# Mostra informazioni finali
show_final_info() {
    echo ""
    log_success "🎉 GitHub setup completed successfully!"
    echo ""
    echo "📋 Repository Information:"
    echo "   URL: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
    echo "   Clone URL: $REPO_URL"
    echo "   Visibility: $VISIBILITY"
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. Set up GitHub Actions secrets (see DEPLOYMENT.md)"
    echo "   2. Configure Firebase projects"
    echo "   3. Set up custom domains"
    echo ""
    echo "📚 Documentation:"
    echo "   - DEPLOYMENT.md: Complete deployment guide"
    echo "   - README.md: Project overview"
    echo "   - docs/: Technical documentation"
    echo ""
}

# Script principale
main() {
    echo "🐕 PiùCane GitHub Setup"
    echo "======================"
    echo ""

    check_prerequisites
    get_user_input
    create_github_repo
    setup_git_remote
    update_package_json
    push_to_github
    commit_updates
    show_final_info
}

# Esegui script
main "$@"