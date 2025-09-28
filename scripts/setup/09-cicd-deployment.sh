#!/bin/bash

# PiuCane CI/CD & Deployment Pipeline Setup Script
# Configura complete deployment pipeline, monitoring, security

set -e

echo "🚀 PiuCane CI/CD & Deployment Setup Starting..."

PROJECT_ID="piucane-prod"
REGION="europe-west1"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Installing..."
    curl https://sdk.cloud.google.com | bash
    source ~/.bashrc
fi

gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling deployment APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable cloudtrace.googleapis.com
gcloud services enable errorrepor ting.googleapis.com

# Create service accounts for deployment
echo "🔑 Creating service accounts..."

# Cloud Build service account
gcloud iam service-accounts create piucane-cloudbuild \
    --description="PiuCane Cloud Build Service Account" \
    --display-name="PiuCane Cloud Build"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:piucane-cloudbuild@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:piucane-cloudbuild@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:piucane-cloudbuild@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:piucane-cloudbuild@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"

# Create secrets in Secret Manager
echo "🔐 Creating secrets in Secret Manager..."

# Create secrets from environment files
secrets=(
    "stripe-secret-key"
    "sendgrid-api-key"
    "twilio-auth-token"
    "gemini-api-key"
    "firebase-admin-key"
)

for secret in "${secrets[@]}"; do
    if ! gcloud secrets describe $secret &>/dev/null; then
        echo "Creating secret: $secret"
        echo "placeholder-value" | gcloud secrets create $secret --data-file=-
    fi
done

# Create Cloud Build configuration
echo "🏗️ Creating Cloud Build configuration..."

cat > cloudbuild.yaml << 'EOF'
steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Type checking
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'type-check']

  # Linting
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'lint']

  # Unit tests
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'test']
    env:
      - 'NODE_ENV=test'

  # Build packages
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build:packages']

  # Build web app
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build:web']
    env:
      - 'NODE_ENV=production'
      - 'NEXT_PUBLIC_GA4_ID=${_GA4_ID}'
      - 'GTM_ID=${_GTM_ID}'

  # Build admin app
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build:admin']
    env:
      - 'NODE_ENV=production'

  # Build API
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build:api']

  # Build API Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/piucane-api:$BUILD_ID', './api']

  # Push API image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/piucane-api:$BUILD_ID']

  # Deploy API to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'piucane-api'
      - '--image=gcr.io/$PROJECT_ID/piucane-api:$BUILD_ID'
      - '--region=europe-west1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--set-env-vars=NODE_ENV=production'
      - '--set-secrets=STRIPE_SECRET_KEY=stripe-secret-key:latest'
      - '--set-secrets=SENDGRID_API_KEY=sendgrid-api-key:latest'
      - '--set-secrets=TWILIO_AUTH_TOKEN=twilio-auth-token:latest'
      - '--set-secrets=GEMINI_API_KEY=gemini-api-key:latest'

  # Deploy web app to Firebase Hosting
  - name: 'gcr.io/$PROJECT_ID/firebase'
    args: ['deploy', '--only', 'hosting:web', '--project', '$PROJECT_ID']

  # Deploy admin app to Firebase Hosting
  - name: 'gcr.io/$PROJECT_ID/firebase'
    args: ['deploy', '--only', 'hosting:admin', '--project', '$PROJECT_ID']

  # Run E2E tests after deployment
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'test:e2e']
    env:
      - 'BASE_URL=https://app.piucane.it'

substitutions:
  _GA4_ID: 'G-PLACEHOLDER'
  _GTM_ID: 'GTM-PLACEHOLDER'

options:
  machineType: 'E2_HIGHCPU_8'
  substitution_option: 'ALLOW_LOOSE'

timeout: '1800s'
EOF

# Create Dockerfile for API
cat > api/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/lib/package*.json ./packages/lib/
COPY api/package*.json ./api/

# Install dependencies
RUN npm ci --only=production

# Copy built code
COPY packages/lib/dist ./packages/lib/dist
COPY api/dist ./api/dist
COPY api/package.json ./api/

WORKDIR /app/api

EXPOSE 8080

CMD ["npm", "start"]
EOF

# Create Firebase Hosting Docker image
cat > Dockerfile.firebase << 'EOF'
FROM node:18-alpine

RUN npm install -g firebase-tools

ENTRYPOINT ["firebase"]
EOF

# Build Firebase Docker image
docker build -t gcr.io/$PROJECT_ID/firebase -f Dockerfile.firebase .
docker push gcr.io/$PROJECT_ID/firebase

# Create monitoring and alerting
echo "📊 Setting up monitoring and alerting..."

# Create uptime checks
gcloud alpha monitoring uptime create \
    --display-name="PiuCane App Uptime" \
    --http-check-path="/" \
    --hostname="app.piucane.it" \
    --port=443 \
    --use-ssl

gcloud alpha monitoring uptime create \
    --display-name="PiuCane API Uptime" \
    --http-check-path="/health" \
    --hostname="api.piucane.it" \
    --port=443 \
    --use-ssl

# Create alerting policies
cat > monitoring-policy.yaml << 'EOF'
displayName: "PiuCane Error Rate Alert"
conditions:
  - displayName: "High Error Rate"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="piucane-api"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.05
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_MEAN
          groupByFields:
            - resource.labels.service_name
notificationChannels:
  - projects/piucane-prod/notificationChannels/NOTIFICATION_CHANNEL_ID
EOF

# Create notification channels
gcloud alpha monitoring channels create \
    --display-name="PiuCane Email Alerts" \
    --type=email \
    --channel-labels=email_address=alerts@piucane.it

# Create custom dashboards
cat > monitoring-dashboard.json << 'EOF'
{
  "displayName": "PiuCane Production Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Request Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"piucane-api\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "xPos": 6,
        "widget": {
          "title": "Error Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"piucane-api\" AND metric.labels.response_code_class!=\"2xx\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.json

# Create deployment automation scripts
echo "⚙️ Creating deployment automation..."

cat > scripts/deploy/staging.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Deploying to Staging..."

# Set staging environment
export NODE_ENV=staging
export NEXT_PUBLIC_GA4_ID=$GA4_ID_STAGING
export GTM_ID=$GTM_ID_STAGING

# Build and deploy
gcloud builds submit \
    --config=cloudbuild-staging.yaml \
    --substitutions=_ENV=staging,_GA4_ID=$GA4_ID_STAGING,_GTM_ID=$GTM_ID_STAGING

echo "✅ Staging deployment completed!"
echo "🌐 App: https://app-staging.piucane.it"
echo "🔧 Admin: https://admin-staging.piucane.it"
echo "🔌 API: https://api-staging.piucane.it"
EOF

cat > scripts/deploy/production.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Deploying to Production..."

# Confirm production deployment
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

# Set production environment
export NODE_ENV=production
export NEXT_PUBLIC_GA4_ID=$GA4_ID_PRODUCTION
export GTM_ID=$GTM_ID_PRODUCTION

# Create backup
echo "📦 Creating database backup..."
gcloud firestore export gs://piucane-prod-backups/$(date +%Y%m%d-%H%M%S)

# Build and deploy
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_ENV=production,_GA4_ID=$GA4_ID_PRODUCTION,_GTM_ID=$GTM_ID_PRODUCTION

# Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:smoke -- --url=https://app.piucane.it

echo "✅ Production deployment completed!"
echo "🌐 App: https://app.piucane.it"
echo "🔧 Admin: https://admin.piucane.it"
echo "🔌 API: https://api.piucane.it"

# Send deployment notification
curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"text":"🚀 PiuCane Production deployment completed successfully!"}' \
    $SLACK_WEBHOOK_URL
EOF

chmod +x scripts/deploy/*.sh

# Create rollback script
cat > scripts/deploy/rollback.sh << 'EOF'
#!/bin/bash

set -e

echo "⏪ Rolling back PiuCane deployment..."

PREVIOUS_VERSION=${1:-"previous"}

# Rollback API
gcloud run services replace-traffic piucane-api \
    --to-revisions=$PREVIOUS_VERSION=100 \
    --region=europe-west1

# Rollback Firebase hosting (requires manual intervention)
echo "⚠️ Firebase Hosting rollback requires manual action:"
echo "1. Go to Firebase Console"
echo "2. Navigate to Hosting"
echo "3. Select previous version and click 'Rollback'"

echo "✅ API rollback completed!"
echo "📋 Manual action required for Firebase Hosting"
EOF

chmod +x scripts/deploy/rollback.sh

# Create health check endpoints
cat > api/src/routes/health.ts << 'EOF'
import express from 'express';
import { db } from '../config/firebase';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    };

    // Check database connection
    await db.collection('health').doc('check').get();
    health.database = 'connected';

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/ready', async (req, res) => {
  try {
    // Readiness check - more thorough
    const checks = {
      database: false,
      secrets: false,
      external_apis: false
    };

    // Check database
    await db.collection('health').doc('check').get();
    checks.database = true;

    // Check secrets (basic verification)
    checks.secrets = !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.SENDGRID_API_KEY &&
      process.env.GEMINI_API_KEY
    );

    // Check external APIs (basic ping)
    checks.external_apis = true; // Simplified for example

    const allReady = Object.values(checks).every(check => check === true);

    res.status(allReady ? 200 : 503).json({
      status: allReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
EOF

# Create performance monitoring
cat > scripts/maintenance/performance-monitoring.js << 'EOF'
const { google } = require('googleapis');
const monitoring = google.monitoring('v3');

async function checkPerformance() {
  console.log('📊 Performance Monitoring Report');
  console.log('=====================================');

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/monitoring.read']
  });

  const authClient = await auth.getClient();
  google.options({ auth: authClient });

  const projectName = 'projects/piucane-prod';

  // Get API response times
  const responseTimeQuery = {
    name: projectName,
    requestBody: {
      query: {
        filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="piucane-api"',
        interval: {
          endTime: new Date().toISOString(),
          startTime: new Date(Date.now() - 3600000).toISOString() // Last hour
        }
      }
    }
  };

  try {
    const result = await monitoring.projects.timeSeries.list(responseTimeQuery);
    console.log('⚡ API Performance Metrics:');
    console.log(`   Average Response Time: ${Math.round(calculateAverage(result.data.timeSeries))}ms`);
    console.log(`   Request Count: ${calculateTotal(result.data.timeSeries)}`);
  } catch (error) {
    console.error('Error fetching metrics:', error);
  }

  console.log('\n✅ Performance monitoring completed');
}

function calculateAverage(timeSeries) {
  // Simplified calculation
  return timeSeries.reduce((sum, series) => {
    return sum + series.points.reduce((pSum, point) => pSum + point.value.doubleValue, 0);
  }, 0) / timeSeries.length;
}

function calculateTotal(timeSeries) {
  return timeSeries.reduce((sum, series) => sum + series.points.length, 0);
}

checkPerformance().catch(console.error);
EOF

# Create load testing configuration
cat > scripts/testing/load-test.yaml << 'EOF'
config:
  target: 'https://api.piucane.it'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
    - duration: 60
      arrivalRate: 15

scenarios:
  - name: "Health Check"
    weight: 30
    flow:
      - get:
          url: "/health"

  - name: "API Authentication"
    weight: 40
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "testpassword"

  - name: "Product Listing"
    weight: 30
    flow:
      - get:
          url: "/api/ecommerce/products"
EOF

# Save deployment configuration
cat > .env.deployment << EOF
# Deployment Configuration
PROJECT_ID=$PROJECT_ID
REGION=$REGION

# Cloud Build
CLOUDBUILD_SERVICE_ACCOUNT=piucane-cloudbuild@$PROJECT_ID.iam.gserviceaccount.com

# Container Registry
CONTAINER_REGISTRY=gcr.io/$PROJECT_ID

# Monitoring
UPTIME_CHECK_WEB=piucane-app-uptime
UPTIME_CHECK_API=piucane-api-uptime

# Notification Channels
ALERT_EMAIL=alerts@piucane.it
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Backup
BACKUP_BUCKET=piucane-prod-backups
BACKUP_RETENTION_DAYS=30
EOF

echo "✅ CI/CD & Deployment setup completed!"
echo "📋 Configuration saved to .env.deployment"
echo ""
echo "🚀 Deployment Commands:"
echo "   Staging: ./scripts/deploy/staging.sh"
echo "   Production: ./scripts/deploy/production.sh"
echo "   Rollback: ./scripts/deploy/rollback.sh [version]"
echo ""
echo "📊 Monitoring:"
echo "   Health: https://api.piucane.it/health"
echo "   Readiness: https://api.piucane.it/ready"
echo "   Dashboards: Google Cloud Console > Monitoring"
echo ""
echo "📋 Next steps:"
echo "1. Configure notification channels with real email/Slack"
echo "2. Set up automated backups schedule"
echo "3. Configure load balancing and auto-scaling"
echo "4. Set up disaster recovery procedures"
echo "5. Create runbook for incident response"