#!/bin/bash

# PiuCane Firebase Setup Script
# Configura Firebase project, Firestore, Hosting, Storage

set -e

echo "🔥 PiuCane Firebase Setup Starting..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Authenticate with Firebase
echo "🔐 Authenticating with Firebase..."
firebase login

# Create Firebase project
PROJECT_ID="piucane-prod"
echo "📦 Creating Firebase project: $PROJECT_ID"
firebase projects:create $PROJECT_ID --display-name "PiuCane Production"

# Use the project
firebase use $PROJECT_ID

# Initialize Firebase in project
echo "⚡ Initializing Firebase services..."
firebase init <<EOF
firestore
hosting
storage
functions
Y
firestore.rules
firestore.indexes.json
Y
apps/web/out
N
N
storage.rules
N
N
functions
TypeScript
Y
Y
N
EOF

# Enable required APIs
echo "🔌 Enabling Firebase APIs..."
gcloud services enable firestore.googleapis.com --project=$PROJECT_ID
gcloud services enable storage.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudfunctions.googleapis.com --project=$PROJECT_ID

# Configure Authentication
echo "🔐 Configuring Firebase Authentication..."
firebase auth:import ./scripts/setup/auth-config.json --project $PROJECT_ID

# Create service account for admin SDK
echo "🔑 Creating service account..."
gcloud iam service-accounts create piucane-admin \
    --description="PiuCane Admin Service Account" \
    --display-name="PiuCane Admin" \
    --project=$PROJECT_ID

# Download service account key
gcloud iam service-accounts keys create ./secrets/firebase-admin-key.json \
    --iam-account=piucane-admin@$PROJECT_ID.iam.gserviceaccount.com \
    --project=$PROJECT_ID

# Grant necessary roles to service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:piucane-admin@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:piucane-admin@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/datastore.owner"

# Configure hosting targets
echo "🌐 Configuring hosting targets..."
firebase target:apply hosting web $PROJECT_ID-web
firebase target:apply hosting admin $PROJECT_ID-admin

# Update firebase.json with custom domains
cat > firebase.json << EOF
{
  "hosting": [
    {
      "target": "web",
      "public": "apps/web/out",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{"source": "**", "destination": "/index.html"}],
      "headers": [
        {
          "source": "**",
          "headers": [
            {"key": "X-Frame-Options", "value": "DENY"},
            {"key": "X-Content-Type-Options", "value": "nosniff"},
            {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}
          ]
        }
      ]
    },
    {
      "target": "admin",
      "public": "apps/admin/out",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{"source": "**", "destination": "/index.html"}],
      "headers": [
        {
          "source": "**",
          "headers": [
            {"key": "X-Frame-Options", "value": "DENY"},
            {"key": "X-Content-Type-Options", "value": "nosniff"},
            {"key": "X-Robots-Tag", "value": "noindex, nofollow"}
          ]
        }
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}
EOF

# Deploy Firestore rules and indexes
echo "📋 Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes --project $PROJECT_ID

# Deploy Storage rules
echo "📁 Deploying Storage rules..."
firebase deploy --only storage --project $PROJECT_ID

# Create Firestore indexes
echo "📇 Creating Firestore indexes..."
cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "subscriptions",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "nextDelivery", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "read", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
EOF

firebase deploy --only firestore:indexes --project $PROJECT_ID

echo "✅ Firebase setup completed!"
echo "📋 Next steps:"
echo "1. Configure custom domains in Firebase Console"
echo "2. Update DNS records to point to Firebase"
echo "3. Add Firebase config to .env.local"
echo ""
echo "🔑 Service account key saved to: ./secrets/firebase-admin-key.json"
echo "📊 Project ID: $PROJECT_ID"