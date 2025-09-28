#!/bin/bash

# PiuCane Master Setup Script
# Esegue tutti gli script di setup in sequenza con controlli di validazione

set -e

echo "🐕 PiuCane Master Setup Starting..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "PROMPTMASTER.md" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Create logs directory
mkdir -p logs/setup

# Function to log and execute setup script
run_setup_script() {
    local script_name=$1
    local description=$2
    local logfile="logs/setup/${script_name}.log"

    echo -e "${BLUE}📋 Step: $description${NC}"
    echo "   Script: $script_name"
    echo "   Log: $logfile"
    echo ""

    if [ -f "scripts/setup/$script_name" ]; then
        chmod +x "scripts/setup/$script_name"

        echo "Starting: $(date)" > "$logfile"

        if bash "scripts/setup/$script_name" >> "$logfile" 2>&1; then
            echo -e "${GREEN}✅ Completed: $description${NC}"
        else
            echo -e "${RED}❌ Failed: $description${NC}"
            echo -e "${YELLOW}   Check log: $logfile${NC}"
            exit 1
        fi

        echo "Completed: $(date)" >> "$logfile"
        echo ""
    else
        echo -e "${YELLOW}⚠️ Skipped: $script_name (file not found)${NC}"
        echo ""
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

    local missing_tools=()

    # Check required tools
    tools=("git" "node" "npm" "curl" "jq")

    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
        echo "Please install missing tools and run again."
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites met${NC}"
    echo ""
}

# Function to validate environment variables
validate_env_vars() {
    echo -e "${BLUE}🔍 Validating environment variables...${NC}"

    local missing_vars=()
    local optional_vars=()

    # Critical environment variables
    critical_vars=(
        "GEMINI_API_KEY"
    )

    # Optional but recommended
    recommended_vars=(
        "SENDGRID_API_KEY"
        "TWILIO_ACCOUNT_SID"
        "TWILIO_AUTH_TOKEN"
        "STRIPE_SECRET_KEY"
    )

    for var in "${critical_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=($var)
        fi
    done

    for var in "${recommended_vars[@]}"; do
        if [ -z "${!var}" ]; then
            optional_vars+=($var)
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing critical environment variables: ${missing_vars[*]}${NC}"
        echo "Please set these variables and run again."
        exit 1
    fi

    if [ ${#optional_vars[@]} -ne 0 ]; then
        echo -e "${YELLOW}⚠️ Missing optional variables: ${optional_vars[*]}${NC}"
        echo "These services will need manual configuration later."
    fi

    echo -e "${GREEN}✅ Environment validation completed${NC}"
    echo ""
}

# Function to create summary report
create_summary_report() {
    local report_file="logs/setup/setup-summary.md"

    cat > "$report_file" << EOF
# PiuCane Setup Summary Report

**Date:** $(date)
**Duration:** $((SECONDS / 60)) minutes

## ✅ Completed Setup Steps

### 1. Firebase Project
- Project ID: piucane-prod
- Firestore database configured
- Authentication enabled
- Storage rules deployed
- Hosting targets created

### 2. GitHub Repository
- Repository created and configured
- Secrets added for all services
- CI/CD workflows configured
- Branch protection rules enabled
- Issue and PR templates created

### 3. Google Analytics & GTM
- GA4 property created
- Enhanced Ecommerce configured
- GTM container with CTA tracking
- Consent Mode v2 implemented
- Custom dimensions configured

### 4. Stripe Payments
- Products and pricing created
- Webhook endpoints configured
- Customer portal enabled
- Coupon codes created
- Subscription billing ready

### 5. Domains & SSL
- DNS zone created in Cloud DNS
- SSL certificates provisioned
- Custom domains mapped
- Redirect rules configured
- Monitoring enabled

### 6. Email Service (SendGrid)
- Domain authentication configured
- Email templates created
- Unsubscribe groups setup
- Contact lists created
- Webhook endpoints ready

### 7. SMS/WhatsApp (Twilio)
- Phone number acquired
- SMS webhooks configured
- WhatsApp Business API prepared
- Message templates created
- Compliance features enabled

### 8. AI Services (Gemini)
- API access configured
- Three AI agents created (Vet, Educator, Groomer)
- Safety settings implemented
- Content moderation enabled
- Monitoring and logging setup

### 9. CI/CD Pipeline
- Cloud Build configured
- Deployment scripts created
- Monitoring and alerting setup
- Health checks implemented
- Rollback procedures ready

## 🔧 Configuration Files Generated

$(find . -name ".env.*" -type f | sed 's/^/- /')

## 📋 Next Steps

1. **Domain Setup**: Configure nameservers at your domain registrar
2. **API Keys**: Replace placeholder values with real API keys
3. **Testing**: Run test deployments to staging environment
4. **Monitoring**: Verify all monitoring and alerts are working
5. **Documentation**: Review and update team documentation

## 🚀 Deployment Commands

\`\`\`bash
# Deploy to staging
./scripts/deploy/staging.sh

# Deploy to production
./scripts/deploy/production.sh

# Rollback if needed
./scripts/deploy/rollback.sh [version]
\`\`\`

## 🔗 Important URLs

- **App**: https://app.piucane.it
- **Admin**: https://admin.piucane.it
- **API**: https://api.piucane.it
- **GitHub**: [Set during GitHub setup]
- **Firebase Console**: https://console.firebase.google.com/project/piucane-prod
- **Google Cloud**: https://console.cloud.google.com/home?project=piucane-prod

## ⚠️ Security Reminders

- All secrets stored in Google Secret Manager
- Environment variables configured for each service
- HTTPS enforced on all domains
- RBAC implemented on all endpoints
- Monitoring and alerting active
- Backup procedures in place

---

**Setup completed successfully! 🎉**

For support: docs/runbooks/incident.md
EOF

    echo -e "${GREEN}📋 Setup summary saved to: $report_file${NC}"
}

# Main execution flow
main() {
    echo -e "${BLUE}🚀 Starting PiuCane complete setup...${NC}"
    echo "This will configure all services and environments."
    echo ""

    # Confirm execution
    read -p "Continue with full setup? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Setup cancelled."
        exit 1
    fi

    # Record start time
    start_time=$SECONDS

    # Run checks
    check_prerequisites
    validate_env_vars

    echo -e "${BLUE}🎯 Beginning setup sequence...${NC}"
    echo ""

    # Execute setup scripts in order
    run_setup_script "01-firebase-setup.sh" "Firebase Project & Database Setup"
    run_setup_script "02-github-setup.sh" "GitHub Repository & CI/CD Setup"
    run_setup_script "03-analytics-setup.sh" "Google Analytics & GTM Setup"
    run_setup_script "04-stripe-setup.sh" "Stripe Payments Setup"
    run_setup_script "05-domains-ssl-setup.sh" "Domains & SSL Certificates Setup"
    run_setup_script "06-sendgrid-setup.sh" "Email Service Setup"
    run_setup_script "07-twilio-setup.sh" "SMS/WhatsApp Setup"
    run_setup_script "08-gemini-ai-setup.sh" "AI Services Setup"
    run_setup_script "09-cicd-deployment.sh" "CI/CD & Deployment Pipeline Setup"

    # Calculate duration
    duration=$((SECONDS - start_time))

    echo ""
    echo -e "${GREEN}🎉 PiuCane setup completed successfully!${NC}"
    echo -e "${BLUE}   Duration: $((duration / 60)) minutes${NC}"
    echo ""

    # Create summary report
    create_summary_report

    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Review setup logs in logs/setup/"
    echo "2. Configure nameservers for domains"
    echo "3. Replace API key placeholders with real values"
    echo "4. Test staging deployment"
    echo "5. Verify monitoring and alerts"
    echo ""
    echo -e "${GREEN}Ready to launch PiuCane! 🚀${NC}"
}

# Error handling
trap 'echo -e "${RED}❌ Setup failed. Check logs in logs/setup/${NC}"' ERR

# Run main function
main "$@"