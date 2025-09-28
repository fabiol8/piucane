#!/bin/bash

# PiuCane GitHub Repository Setup Script
# Configura repository, secrets, actions, environments

set -e

echo "🐙 PiuCane GitHub Setup Starting..."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Installing..."
    brew install gh
fi

# Authenticate with GitHub
echo "🔐 Authenticating with GitHub..."
gh auth login

# Create repository
REPO_NAME="piucane"
ORG_NAME="piucane"  # Change to your organization name
echo "📦 Creating GitHub repository: $ORG_NAME/$REPO_NAME"

gh repo create $ORG_NAME/$REPO_NAME \
    --private \
    --description "PiuCane - Il benessere del tuo cane" \
    --homepage "https://piucane.it" \
    --clone

# Navigate to repository
cd $REPO_NAME

# Create environments
echo "🌍 Creating GitHub environments..."
gh api repos/$ORG_NAME/$REPO_NAME/environments/staging -X PUT
gh api repos/$ORG_NAME/$REPO_NAME/environments/production -X PUT

# Set environment protection rules for production
gh api repos/$ORG_NAME/$REPO_NAME/environments/production -X PUT --input - << EOF
{
  "protection_rules": [
    {
      "type": "required_reviewers",
      "required_reviewers": {
        "users": []
      }
    }
  ],
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
EOF

# Set repository secrets
echo "🔐 Setting repository secrets..."

# Firebase secrets
gh secret set FIREBASE_PROJECT_ID --body "piucane-prod"
gh secret set FIREBASE_ADMIN_PRIVATE_KEY --body "$(cat ./secrets/firebase-admin-key.json | jq -r .private_key)"
gh secret set FIREBASE_ADMIN_CLIENT_EMAIL --body "$(cat ./secrets/firebase-admin-key.json | jq -r .client_email)"

# Stripe secrets (placeholder - replace with real values)
gh secret set STRIPE_SECRET_KEY --body "sk_live_placeholder"
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_placeholder"

# SendGrid secrets
gh secret set SENDGRID_API_KEY --body "SG.placeholder"

# Twilio secrets
gh secret set TWILIO_ACCOUNT_SID --body "AC_placeholder"
gh secret set TWILIO_AUTH_TOKEN --body "twilio_placeholder"

# Gemini AI secret
gh secret set GEMINI_API_KEY --body "gemini_placeholder"

# Set environment-specific secrets
echo "🔐 Setting staging environment secrets..."
gh secret set GA4_ID_STAGING --env staging --body "G-STAGING123"
gh secret set GTM_ID_STAGING --env staging --body "GTM-STAGING"

echo "🔐 Setting production environment secrets..."
gh secret set GA4_ID_PRODUCTION --env production --body "G-PROD123"
gh secret set GTM_ID_PRODUCTION --env production --body "GTM-PROD"

# Create GitHub Actions workflows
echo "⚡ Creating GitHub Actions workflows..."

mkdir -p .github/workflows

# CI/CD Pipeline
cat > .github/workflows/ci-cd.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'

jobs:
  test:
    name: Test & Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test

      - name: Build packages
        run: npm run build:packages

      - name: Build applications
        run: npm run build

      - name: E2E tests
        run: npm run test:e2e

      - name: Accessibility tests
        run: npm run test:a11y

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.json'

  deploy-staging:
    name: Deploy to Staging
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for staging
        run: npm run build
        env:
          NEXT_PUBLIC_GA4_ID: ${{ secrets.GA4_ID_STAGING }}
          GTM_ID: ${{ secrets.GTM_ID_STAGING }}
          NODE_ENV: staging

      - name: Deploy to Firebase Staging
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: piucane-staging
          channelId: live

  deploy-production:
    name: Deploy to Production
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build
        env:
          NEXT_PUBLIC_GA4_ID: ${{ secrets.GA4_ID_PRODUCTION }}
          GTM_ID: ${{ secrets.GTM_ID_PRODUCTION }}
          NODE_ENV: production

      - name: Deploy to Firebase Production
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: piucane-prod
          channelId: live

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: Automated release from main branch
          draft: false
          prerelease: false
EOF

# Security workflow
cat > .github/workflows/security.yml << 'EOF'
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'

jobs:
  security:
    name: Security Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, typescript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
EOF

# CTA Registry validation
cat > .github/workflows/cta-validation.yml << 'EOF'
name: CTA Registry Validation

on:
  pull_request:
    paths:
      - 'apps/web/src/**/*.tsx'
      - 'apps/web/src/**/*.ts'
      - 'docs/cta/registry.json'

jobs:
  validate-cta:
    name: Validate CTA Registry
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Validate CTA Registry
        run: node scripts/validate-cta-registry.js
EOF

# Branch protection rules
echo "🛡️ Setting branch protection rules..."
gh api repos/$ORG_NAME/$REPO_NAME/branches/main/protection -X PUT --input - << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test", "validate-cta"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Create initial commit and push
echo "📤 Creating initial commit..."
git add .
git commit -m "feat: initial PiuCane project setup

- Complete monorepo structure
- PWA and Admin applications
- API server with authentication
- Shared packages and documentation
- CI/CD pipeline configuration
- Security and quality gates

🤖 Generated with Claude Code"

git branch -M main
git remote add origin https://github.com/$ORG_NAME/$REPO_NAME.git
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop

echo "✅ GitHub setup completed!"
echo "📋 Repository: https://github.com/$ORG_NAME/$REPO_NAME"
echo "📋 Next steps:"
echo "1. Update secrets with real API keys"
echo "2. Configure branch protection rules"
echo "3. Set up project board and issues"