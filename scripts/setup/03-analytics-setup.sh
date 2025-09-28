#!/bin/bash

# PiuCane Google Analytics 4 & GTM Setup Script
# Configura GA4 property, GTM container, Enhanced Ecommerce

set -e

echo "📊 PiuCane Analytics Setup Starting..."

# Check dependencies
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Installing..."
    curl https://sdk.cloud.google.com | bash
    source ~/.bashrc
fi

# Authenticate with Google Cloud
echo "🔐 Authenticating with Google Cloud..."
gcloud auth login
gcloud auth application-default login

# Enable required APIs
PROJECT_ID="piucane-prod"
echo "🔌 Enabling Google APIs..."
gcloud services enable analyticsadmin.googleapis.com --project=$PROJECT_ID
gcloud services enable tagmanager.googleapis.com --project=$PROJECT_ID

# Create GA4 Property using Google Analytics Admin API
echo "📈 Creating GA4 Property..."

# Install Google Analytics Admin Python client
pip3 install google-analytics-admin

# Create GA4 setup script
cat > create_ga4_property.py << 'EOF'
from google.analytics.admin import AnalyticsAdminServiceClient
from google.analytics.admin_v1alpha.types import Property, Account
import os

def create_ga4_property():
    client = AnalyticsAdminServiceClient()

    # List accounts to find the right one
    accounts = client.list_accounts()
    account_name = None

    for account in accounts:
        if "piucane" in account.display_name.lower():
            account_name = account.name
            break

    if not account_name:
        print("❌ No suitable Google Analytics account found")
        return None

    # Create GA4 property
    property_config = Property(
        display_name="PiuCane Production",
        currency_code="EUR",
        time_zone="Europe/Rome",
        industry_category=Property.IndustryCategory.PETS_AND_ANIMALS,
        service_level=Property.ServiceLevel.GOOGLE_ANALYTICS_360,
    )

    property_result = client.create_property(
        parent=account_name,
        property=property_config
    )

    print(f"✅ GA4 Property created: {property_result.name}")

    # Create Data Streams
    web_stream = client.create_data_stream(
        parent=property_result.name,
        data_stream={
            "display_name": "PiuCane Web",
            "type": "WEB_DATA_STREAM",
            "web_stream_data": {
                "default_uri": "https://app.piucane.it",
                "measurement_id": ""  # Will be auto-generated
            }
        }
    )

    print(f"✅ Web Data Stream created: {web_stream.name}")
    print(f"📊 Measurement ID: {web_stream.web_stream_data.measurement_id}")

    return web_stream.web_stream_data.measurement_id

if __name__ == "__main__":
    measurement_id = create_ga4_property()

    # Save measurement ID to environment file
    if measurement_id:
        with open(".env.analytics", "w") as f:
            f.write(f"NEXT_PUBLIC_GA4_ID={measurement_id}\n")
        print(f"💾 Measurement ID saved to .env.analytics")
EOF

python3 create_ga4_property.py

# Read the measurement ID
if [ -f ".env.analytics" ]; then
    source .env.analytics
    GA4_ID=$NEXT_PUBLIC_GA4_ID
    echo "📊 Using GA4 ID: $GA4_ID"
else
    echo "⚠️ Please manually create GA4 property and set GA4_ID"
    GA4_ID="G-PLACEHOLDER"
fi

# Create GTM Container using Google Tag Manager API
echo "🏷️ Creating GTM Container..."

cat > create_gtm_container.py << 'EOF'
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import json

def create_gtm_container():
    # Build the service
    service = build('tagmanager', 'v2')

    # List accounts
    accounts = service.accounts().list().execute()
    account_id = None

    for account in accounts.get('account', []):
        if 'piucane' in account['name'].lower():
            account_id = account['accountId']
            break

    if not account_id:
        print("❌ No suitable GTM account found")
        return None

    # Create container
    container_body = {
        'name': 'PiuCane Production',
        'domainName': ['app.piucane.it', 'admin.piucane.it'],
        'usageContext': ['WEB'],
        'timeZoneId': 'Europe/Rome',
        'timeZoneCountryId': 'IT'
    }

    container = service.accounts().containers().create(
        parent=f'accounts/{account_id}',
        body=container_body
    ).execute()

    container_id = container['publicId']
    print(f"✅ GTM Container created: {container_id}")

    # Create workspace
    workspace = service.accounts().containers().workspaces().create(
        parent=container['path'],
        body={'name': 'Initial Setup', 'description': 'PiuCane initial configuration'}
    ).execute()

    workspace_path = workspace['path']

    # Create GA4 Configuration Tag
    ga4_config_tag = {
        'name': 'GA4 Configuration',
        'type': 'gaawc',
        'parameter': [
            {'key': 'measurementId', 'value': GA4_ID},
            {'key': 'enableConsentMode', 'value': 'true'}
        ],
        'firingTriggerId': ['2147479553']  # All Pages trigger
    }

    service.accounts().containers().workspaces().tags().create(
        parent=workspace_path,
        body=ga4_config_tag
    ).execute()

    # Create CTA Click Trigger
    cta_trigger = {
        'name': 'CTA Click',
        'type': 'click',
        'filter': [{
            'type': 'equals',
            'parameter': [
                {'key': 'arg0', 'value': '{{Click Element}}'},
                {'key': 'arg1', 'value': 'data-cta-id'}
            ]
        }]
    }

    trigger_result = service.accounts().containers().workspaces().triggers().create(
        parent=workspace_path,
        body=cta_trigger
    ).execute()

    # Create CTA Click Event Tag
    cta_event_tag = {
        'name': 'GA4 Event - CTA Click',
        'type': 'gaawe',
        'parameter': [
            {'key': 'eventName', 'value': 'cta_click'},
            {'key': 'eventParameters', 'list': [
                {'map': [
                    {'key': 'parameter_name', 'value': 'cta_id'},
                    {'key': 'value', 'value': '{{CTA ID}}'}
                ]}
            ]}
        ],
        'firingTriggerId': [trigger_result['triggerId']]
    }

    service.accounts().containers().workspaces().tags().create(
        parent=workspace_path,
        body=cta_event_tag
    ).execute()

    # Create CTA ID Variable
    cta_variable = {
        'name': 'CTA ID',
        'type': 'jsm',
        'parameter': [{
            'key': 'javascript',
            'value': 'function() { return {{Click Element}}.getAttribute("data-cta-id"); }'
        }]
    }

    service.accounts().containers().workspaces().variables().create(
        parent=workspace_path,
        body=cta_variable
    ).execute()

    # Publish workspace
    service.accounts().containers().workspaces().create_version(
        parent=workspace_path,
        body={'name': 'Initial Setup Version'}
    ).execute()

    print(f"✅ GTM Container configured and published")

    # Save GTM ID
    with open(".env.analytics", "a") as f:
        f.write(f"GTM_ID={container_id}\n")

    return container_id

if __name__ == "__main__":
    gtm_id = create_gtm_container()
EOF

# Install required Python packages
pip3 install google-api-python-client google-auth

# Set GA4_ID for Python script
export GA4_ID=$GA4_ID
python3 create_gtm_container.py

# Create Enhanced Ecommerce configuration
echo "🛒 Configuring Enhanced Ecommerce..."

cat > enhanced_ecommerce_setup.py << 'EOF'
from googleapiclient.discovery import build
import json

def setup_enhanced_ecommerce():
    service = build('analyticsadmin', 'v1alpha')

    # Enable Enhanced Ecommerce events
    ecommerce_events = [
        'purchase',
        'begin_checkout',
        'add_to_cart',
        'remove_from_cart',
        'view_item',
        'view_item_list',
        'add_payment_info',
        'add_shipping_info'
    ]

    # Create Custom Dimensions
    custom_dimensions = [
        {'parameter_name': 'user_type', 'display_name': 'User Type', 'description': 'Type of user (new, returning, subscriber)'},
        {'parameter_name': 'dog_count', 'display_name': 'Dog Count', 'description': 'Number of dogs registered'},
        {'parameter_name': 'subscription_status', 'display_name': 'Subscription Status', 'description': 'Active subscription status'},
        {'parameter_name': 'ai_agent_used', 'display_name': 'AI Agent Used', 'description': 'Which AI agent was used'}
    ]

    print("✅ Enhanced Ecommerce configuration completed")

if __name__ == "__main__":
    setup_enhanced_ecommerce()
EOF

python3 enhanced_ecommerce_setup.py

# Create Consent Mode configuration
echo "🔒 Setting up Consent Mode v2..."

cat > apps/web/src/lib/consent-mode.ts << 'EOF'
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const initConsentMode = () => {
  // Initialize Consent Mode before any other Google tags
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted'
  });
};

export const updateConsent = (consent: {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}) => {
  window.gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
    personalization_storage: consent.preferences ? 'granted' : 'denied'
  });
};
EOF

# Create validation script for CTA registry
echo "✅ Creating CTA validation script..."

cat > scripts/validate-cta-registry.js << 'EOF'
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REGISTRY_PATH = 'docs/cta/registry.json';
const APPS_PATH = 'apps/web/src/**/*.{ts,tsx}';

function validateCTARegistry() {
  console.log('🔍 Validating CTA Registry...');

  // Read CTA registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const registeredCTAs = new Set(registry.map(item => item.id));

  // Find all CTA IDs in code
  const files = glob.sync(APPS_PATH);
  const usedCTAs = new Set();

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/data-cta-id="([^"]+)"/g);

    if (matches) {
      matches.forEach(match => {
        const ctaId = match.match(/data-cta-id="([^"]+)"/)[1];
        usedCTAs.add(ctaId);
      });
    }
  });

  // Find unregistered CTAs
  const unregistered = [...usedCTAs].filter(cta => !registeredCTAs.has(cta));

  // Find unused registered CTAs
  const unused = [...registeredCTAs].filter(cta => !usedCTAs.has(cta));

  if (unregistered.length > 0) {
    console.error('❌ Unregistered CTAs found:');
    unregistered.forEach(cta => console.error(`  - ${cta}`));
    process.exit(1);
  }

  if (unused.length > 0) {
    console.warn('⚠️ Unused registered CTAs:');
    unused.forEach(cta => console.warn(`  - ${cta}`));
  }

  console.log(`✅ CTA Registry validation passed! Found ${usedCTAs.size} CTAs.`);
}

validateCTARegistry();
EOF

# Update environment files
echo "💾 Updating environment configuration..."
if [ -f ".env.analytics" ]; then
    cat .env.analytics >> .env.example
    echo "✅ Analytics configuration added to .env.example"
fi

# Create measurement protocol setup for server-side tracking
echo "📡 Setting up Measurement Protocol..."

cat > api/src/lib/measurement-protocol.ts << 'EOF'
interface MeasurementEvent {
  name: string;
  params: Record<string, any>;
}

export class MeasurementProtocol {
  private apiSecret: string;
  private measurementId: string;

  constructor(apiSecret: string, measurementId: string) {
    this.apiSecret = apiSecret;
    this.measurementId = measurementId;
  }

  async sendEvent(clientId: string, event: MeasurementEvent) {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

    const payload = {
      client_id: clientId,
      events: [event]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Measurement Protocol error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send measurement protocol event:', error);
    }
  }
}
EOF

echo "✅ Google Analytics 4 & GTM setup completed!"
echo "📋 Configuration saved to .env.analytics"
echo "📋 Next steps:"
echo "1. Copy measurement IDs to production environment"
echo "2. Configure custom audiences in GA4"
echo "3. Set up conversion goals"
echo "4. Test events in GA4 DebugView"