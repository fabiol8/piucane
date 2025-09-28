#!/bin/bash

# PiuCane Domains & SSL Setup Script
# Configura domini, DNS records, SSL certificates

set -e

echo "🌐 PiuCane Domains & SSL Setup Starting..."

# Domain configuration
MAIN_DOMAIN="piucane.it"
APP_DOMAIN="app.piucane.it"
ADMIN_DOMAIN="admin.piucane.it"
API_DOMAIN="api.piucane.it"

# Check if gcloud is installed and configured
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Installing..."
    curl https://sdk.cloud.google.com | bash
    source ~/.bashrc
fi

# Authenticate and set project
gcloud auth login
PROJECT_ID="piucane-prod"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling Google Cloud APIs..."
gcloud services enable dns.googleapis.com
gcloud services enable certificatemanager.googleapis.com
gcloud services enable compute.googleapis.com

# Create Cloud DNS managed zone
echo "🏷️ Creating Cloud DNS zone..."
gcloud dns managed-zones create piucane-zone \
    --description="PiuCane DNS Zone" \
    --dns-name=$MAIN_DOMAIN \
    --visibility=public

# Get name servers
NAME_SERVERS=$(gcloud dns managed-zones describe piucane-zone --format="value(nameServers[].join(' '))")
echo "📋 Configure these name servers at your domain registrar:"
echo "$NAME_SERVERS"

# Create DNS records
echo "📝 Creating DNS records..."

# A record for main domain (redirect to app)
gcloud dns record-sets transaction start --zone=piucane-zone

# Main domain redirect to app
gcloud dns record-sets transaction add "34.102.136.180" \
    --name=$MAIN_DOMAIN \
    --ttl=300 \
    --type=A \
    --zone=piucane-zone

# App subdomain (Firebase Hosting)
gcloud dns record-sets transaction add "151.101.1.195" "151.101.65.195" \
    --name=$APP_DOMAIN \
    --ttl=300 \
    --type=A \
    --zone=piucane-zone

# Admin subdomain (Firebase Hosting)
gcloud dns record-sets transaction add "151.101.1.195" "151.101.65.195" \
    --name=$ADMIN_DOMAIN \
    --ttl=300 \
    --type=A \
    --zone=piucane-zone

# API subdomain (Cloud Run)
gcloud dns record-sets transaction add "ghs.googlehosted.com." \
    --name=$API_DOMAIN \
    --ttl=300 \
    --type=CNAME \
    --zone=piucane-zone

# WWW redirect
gcloud dns record-sets transaction add "34.102.136.180" \
    --name="www.$MAIN_DOMAIN" \
    --ttl=300 \
    --type=A \
    --zone=piucane-zone

# MX records for email
gcloud dns record-sets transaction add "10 mx1.forwardemail.net." "20 mx2.forwardemail.net." \
    --name=$MAIN_DOMAIN \
    --ttl=300 \
    --type=MX \
    --zone=piucane-zone

# TXT records for domain verification
gcloud dns record-sets transaction add "\"v=spf1 include:_spf.google.com ~all\"" \
    --name=$MAIN_DOMAIN \
    --ttl=300 \
    --type=TXT \
    --zone=piucane-zone

gcloud dns record-sets transaction execute --zone=piucane-zone

echo "✅ DNS records created successfully!"

# Create SSL certificates using Certificate Manager
echo "🔒 Creating SSL certificates..."

# Create certificate for all domains
gcloud certificate-manager certificates create piucane-ssl-cert \
    --domains=$MAIN_DOMAIN,$APP_DOMAIN,$ADMIN_DOMAIN,$API_DOMAIN,www.$MAIN_DOMAIN

# Create certificate map
gcloud certificate-manager maps create piucane-cert-map

# Create certificate map entries
gcloud certificate-manager maps entries create app-entry \
    --map=piucane-cert-map \
    --hostname=$APP_DOMAIN \
    --certificates=piucane-ssl-cert

gcloud certificate-manager maps entries create admin-entry \
    --map=piucane-cert-map \
    --hostname=$ADMIN_DOMAIN \
    --certificates=piucane-ssl-cert

gcloud certificate-manager maps entries create api-entry \
    --map=piucane-cert-map \
    --hostname=$API_DOMAIN \
    --certificates=piucane-ssl-cert

gcloud certificate-manager maps entries create main-entry \
    --map=piucane-cert-map \
    --hostname=$MAIN_DOMAIN \
    --certificates=piucane-ssl-cert

# Deploy API to Cloud Run with custom domain
echo "🚀 Deploying API to Cloud Run..."

# Build and deploy API
cd api
gcloud builds submit --tag gcr.io/$PROJECT_ID/piucane-api
gcloud run deploy piucane-api \
    --image gcr.io/$PROJECT_ID/piucane-api \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production"

# Map custom domain to Cloud Run
gcloud run domain-mappings create \
    --service piucane-api \
    --domain $API_DOMAIN \
    --region europe-west1

cd ..

# Configure Firebase Hosting with custom domains
echo "🔥 Configuring Firebase custom domains..."

# Add custom domains to Firebase project
firebase hosting:sites:create piucane-app --project $PROJECT_ID
firebase hosting:sites:create piucane-admin --project $PROJECT_ID

# Configure domain mapping in Firebase Console
cat > firebase-domain-setup.txt << EOF
🔧 Manual Firebase Setup Required:

1. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/hosting/main
2. Add custom domains:
   - Add $APP_DOMAIN to piucane-app site
   - Add $ADMIN_DOMAIN to piucane-admin site
3. Follow domain verification steps
4. Firebase will automatically provision SSL certificates

Note: Firebase will show DNS configuration steps if needed.
EOF

# Create main domain redirect (using Cloud Load Balancer)
echo "↩️ Setting up main domain redirect..."

# Create backend bucket for redirect
gsutil mb gs://${PROJECT_ID}-redirect
echo '<html><head><meta http-equiv="refresh" content="0; URL=https://'$APP_DOMAIN'"></head></html>' | gsutil cp - gs://${PROJECT_ID}-redirect/index.html
gsutil web set -m index.html -e index.html gs://${PROJECT_ID}-redirect
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-redirect

# Create load balancer for main domain redirect
gcloud compute backend-buckets create piucane-redirect-bucket \
    --gcs-bucket-name=${PROJECT_ID}-redirect

gcloud compute url-maps create piucane-redirect-map \
    --default-backend-bucket=piucane-redirect-bucket

gcloud compute target-https-proxies create piucane-redirect-proxy \
    --url-map=piucane-redirect-map \
    --certificate-map=piucane-cert-map

gcloud compute global-forwarding-rules create piucane-redirect-rule \
    --target-https-proxy=piucane-redirect-proxy \
    --global \
    --ports=443

# Create HTTP to HTTPS redirect
gcloud compute url-maps create piucane-http-redirect \
    --default-url-redirect-response-code=301 \
    --default-url-redirect-https-redirect

gcloud compute target-http-proxies create piucane-http-proxy \
    --url-map=piucane-http-redirect

gcloud compute global-forwarding-rules create piucane-http-rule \
    --target-http-proxy=piucane-http-proxy \
    --global \
    --ports=80

# Create monitoring for SSL certificates
echo "📊 Setting up SSL certificate monitoring..."

cat > ssl-monitor.py << 'EOF'
import ssl
import socket
import datetime
from google.cloud import monitoring_v3

def check_ssl_expiry(hostname, port=443):
    """Check SSL certificate expiry for a domain"""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                not_after = datetime.datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                days_left = (not_after - datetime.datetime.now()).days

                print(f"{hostname}: {days_left} days until expiry ({not_after})")
                return days_left
    except Exception as e:
        print(f"Error checking {hostname}: {e}")
        return -1

def main():
    domains = [
        'app.piucane.it',
        'admin.piucane.it',
        'api.piucane.it',
        'piucane.it'
    ]

    for domain in domains:
        days_left = check_ssl_expiry(domain)

        # Send to Cloud Monitoring
        if days_left > 0:
            client = monitoring_v3.MetricServiceClient()
            project_name = f"projects/piucane-prod"

            series = monitoring_v3.TimeSeries()
            series.metric.type = "custom.googleapis.com/ssl_days_left"
            series.resource.type = "global"
            series.metric.labels["domain"] = domain

            point = series.points.add()
            point.value.double_value = days_left
            now = datetime.datetime.now()
            point.interval.end_time.seconds = int(now.timestamp())

            client.create_time_series(name=project_name, time_series=[series])

if __name__ == "__main__":
    main()
EOF

# Create Cloud Function for SSL monitoring
gcloud functions deploy ssl-certificate-monitor \
    --runtime python39 \
    --trigger-topic ssl-monitor \
    --source . \
    --entry-point main

# Create Cloud Scheduler job for SSL monitoring
gcloud scheduler jobs create pubsub ssl-monitor-job \
    --schedule="0 9 * * *" \
    --topic=ssl-monitor \
    --message-body="check-ssl"

# Create domain verification files
echo "✅ Creating domain verification files..."

mkdir -p verification

# Google verification
echo "google-site-verification: google123456789abcdef.html" > verification/google123456789abcdef.html

# Bing verification
echo "<?xml version=\"1.0\"?><users><user>BING_VERIFICATION_CODE</user></users>" > verification/BingSiteAuth.xml

# Save domain configuration
cat > .env.domains << EOF
# Domain Configuration
MAIN_DOMAIN=$MAIN_DOMAIN
APP_DOMAIN=$APP_DOMAIN
ADMIN_DOMAIN=$ADMIN_DOMAIN
API_DOMAIN=$API_DOMAIN

# SSL Certificate
SSL_CERT_NAME=piucane-ssl-cert
CERT_MAP_NAME=piucane-cert-map

# Cloud DNS
DNS_ZONE=piucane-zone
PROJECT_ID=$PROJECT_ID

# Name Servers (configure at registrar)
NAME_SERVERS="$NAME_SERVERS"
EOF

echo "✅ Domains & SSL setup completed!"
echo "📋 Configuration saved to .env.domains"
echo ""
echo "🔧 Manual steps required:"
echo "1. Configure name servers at domain registrar:"
echo "   $NAME_SERVERS"
echo "2. Complete Firebase domain verification (see firebase-domain-setup.txt)"
echo "3. Wait for DNS propagation (24-48 hours)"
echo "4. Verify SSL certificates are active"
echo ""
echo "🔍 Check domain status:"
echo "   - Main: https://$MAIN_DOMAIN"
echo "   - App: https://$APP_DOMAIN"
echo "   - Admin: https://$ADMIN_DOMAIN"
echo "   - API: https://$API_DOMAIN"