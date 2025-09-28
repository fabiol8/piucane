#!/bin/bash

# PiuCane SendGrid Email Setup Script
# Configura SendGrid account, domain authentication, templates

set -e

echo "📧 PiuCane SendGrid Setup Starting..."

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl."
    exit 1
fi

# SendGrid configuration
SENDGRID_DOMAIN="piucane.it"
FROM_EMAIL="noreply@piucane.it"
FROM_NAME="PiuCane"

echo "⚠️ Manual SendGrid Setup Required:"
echo "1. Create SendGrid account at https://sendgrid.com"
echo "2. Get API key from Settings > API Keys"
echo "3. Set API key in environment variable:"
echo "   export SENDGRID_API_KEY='your-api-key-here'"
echo ""

# Check if API key is set
if [ -z "$SENDGRID_API_KEY" ]; then
    echo "🔑 Please set SENDGRID_API_KEY environment variable and run script again"
    echo "   export SENDGRID_API_KEY='your-sendgrid-api-key'"
    exit 1
fi

# Verify API key works
echo "🔐 Verifying SendGrid API key..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    "https://api.sendgrid.com/v3/user/account")

if [ "$response" != "200" ]; then
    echo "❌ Invalid SendGrid API key. Please check your key."
    exit 1
fi

echo "✅ SendGrid API key verified!"

# Create authenticated domain
echo "🌐 Setting up domain authentication..."

DOMAIN_AUTH_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"domain\": \"$SENDGRID_DOMAIN\",
        \"subdomain\": \"email\",
        \"automatic_security\": false,
        \"custom_spf\": true,
        \"default\": true
    }" \
    "https://api.sendgrid.com/v3/whitelabel/domains")

echo "📋 Domain authentication created. Add these DNS records:"
echo "$DOMAIN_AUTH_RESPONSE" | jq '.dns'

# Create sender identity
echo "👤 Creating sender identity..."

SENDER_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"nickname\": \"PiuCane Default\",
        \"from\": {
            \"email\": \"$FROM_EMAIL\",
            \"name\": \"$FROM_NAME\"
        },
        \"reply_to\": {
            \"email\": \"support@piucane.it\",
            \"name\": \"PiuCane Support\"
        },
        \"address\": \"Via Roma 123\",
        \"address_2\": \"\",
        \"city\": \"Milano\",
        \"state\": \"MI\",
        \"zip\": \"20121\",
        \"country\": \"Italy\"
    }" \
    "https://api.sendgrid.com/v3/verified_senders")

echo "✅ Sender identity created"

# Create email templates
echo "📝 Creating email templates..."

# Welcome email template
WELCOME_TEMPLATE=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "PiuCane Welcome Email",
        "generation": "dynamic"
    }' \
    "https://api.sendgrid.com/v3/templates")

WELCOME_TEMPLATE_ID=$(echo "$WELCOME_TEMPLATE" | jq -r '.id')

# Add version to welcome template
curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"template_id\": \"$WELCOME_TEMPLATE_ID\",
        \"active\": 1,
        \"name\": \"Welcome Email v1\",
        \"html_content\": \"<!DOCTYPE html><html><head><meta charset=\\\"UTF-8\\\"><title>Benvenuto in PiuCane!</title></head><body style=\\\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\\\"><div style=\\\"text-align: center; padding: 20px 0;\\\"><img src=\\\"https://piucane.it/logo.png\\\" alt=\\\"PiuCane\\\" style=\\\"max-width: 200px;\\\"></div><h1 style=\\\"color: #f97316; text-align: center;\\\">Benvenuto in PiuCane, {{user_name}}!</h1><p>Ciao {{user_name}},</p><p>Benvenuto nella famiglia PiuCane! Siamo entusiasti di accompagnarti nel percorso verso il benessere del tuo cane.</p><div style=\\\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\\\"><h3 style=\\\"color: #f97316; margin-top: 0;\\\">Cosa puoi fare ora:</h3><ul><li>🐕 Completa il profilo del tuo cane</li><li>🍽️ Scopri l'alimentazione personalizzata</li><li>🩺 Chatta con i nostri esperti AI</li><li>🎯 Inizia le prime missioni</li></ul></div><div style=\\\"text-align: center; margin: 30px 0;\\\"><a href=\\\"https://app.piucane.it/onboarding\\\" style=\\\"background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;\\\">Inizia Subito</a></div><p>Se hai domande, il nostro team è sempre disponibile.</p><p>Buona giornata!<br>Il Team PiuCane</p><hr style=\\\"border: none; border-top: 1px solid #eee; margin: 30px 0;\\\"><p style=\\\"font-size: 12px; color: #666; text-align: center;\\\">PiuCane - Il benessere del tuo cane<br>Se non desideri più ricevere queste email, <a href=\\\"{{unsubscribe}}\\\">clicca qui</a></p></body></html>\",
        \"plain_content\": \"Ciao {{user_name}},\\n\\nBenvenuto nella famiglia PiuCane! Siamo entusiasti di accompagnarti nel percorso verso il benessere del tuo cane.\\n\\nCosa puoi fare ora:\\n- Completa il profilo del tuo cane\\n- Scopri l'alimentazione personalizzata\\n- Chatta con i nostri esperti AI\\n- Inizia le prime missioni\\n\\nVisita: https://app.piucane.it/onboarding\\n\\nSe hai domande, il nostro team è sempre disponibile.\\n\\nBuona giornata!\\nIl Team PiuCane\\n\\n---\\nPiuCane - Il benessere del tuo cane\\nPer disiscriverti: {{unsubscribe}}\",
        \"subject\": \"🐕 Benvenuto in PiuCane, {{user_name}}!\"
    }" \
    "https://api.sendgrid.com/v3/templates/$WELCOME_TEMPLATE_ID/versions"

# Order confirmation template
ORDER_TEMPLATE=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "PiuCane Order Confirmation",
        "generation": "dynamic"
    }' \
    "https://api.sendgrid.com/v3/templates")

ORDER_TEMPLATE_ID=$(echo "$ORDER_TEMPLATE" | jq -r '.id')

curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"template_id\": \"$ORDER_TEMPLATE_ID\",
        \"active\": 1,
        \"name\": \"Order Confirmation v1\",
        \"subject\": \"📦 Conferma ordine #{{order_number}} - PiuCane\",
        \"html_content\": \"<!DOCTYPE html><html><head><meta charset=\\\"UTF-8\\\"><title>Conferma Ordine</title></head><body style=\\\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\\\"><div style=\\\"text-align: center; padding: 20px 0;\\\"><img src=\\\"https://piucane.it/logo.png\\\" alt=\\\"PiuCane\\\" style=\\\"max-width: 200px;\\\"></div><h1 style=\\\"color: #f97316; text-align: center;\\\">Ordine Confermato!</h1><p>Ciao {{customer_name}},</p><p>Il tuo ordine è stato confermato e sarà elaborato a breve.</p><div style=\\\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\\\"><h3 style=\\\"color: #f97316; margin-top: 0;\\\">Dettagli Ordine #{{order_number}}</h3><p><strong>Data ordine:</strong> {{order_date}}</p><p><strong>Totale:</strong> €{{total_amount}}</p><p><strong>Indirizzo di spedizione:</strong><br>{{shipping_address}}</p></div><div style=\\\"margin: 20px 0;\\\"><h3>Prodotti ordinati:</h3>{{#each items}}<div style=\\\"border-bottom: 1px solid #eee; padding: 10px 0;\\\"><strong>{{name}}</strong><br>Quantità: {{quantity}} - Prezzo: €{{price}}</div>{{/each}}</div><p>Riceverai una email di conferma spedizione non appena il tuo ordine sarà in viaggio.</p><div style=\\\"text-align: center; margin: 30px 0;\\\"><a href=\\\"https://app.piucane.it/orders/{{order_id}}\\\" style=\\\"background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;\\\">Visualizza Ordine</a></div><p>Grazie per aver scelto PiuCane!</p><p>Il Team PiuCane</p></body></html>\"
    }" \
    "https://api.sendgrid.com/v3/templates/$ORDER_TEMPLATE_ID/versions"

# Subscription reminder template
SUBSCRIPTION_TEMPLATE=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "PiuCane Subscription Reminder",
        "generation": "dynamic"
    }' \
    "https://api.sendgrid.com/v3/templates")

SUBSCRIPTION_TEMPLATE_ID=$(echo "$SUBSCRIPTION_TEMPLATE" | jq -r '.id')

curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"template_id\": \"$SUBSCRIPTION_TEMPLATE_ID\",
        \"active\": 1,
        \"name\": \"Subscription Reminder v1\",
        \"subject\": \"🔔 Prossima consegna per {{dog_name}} - PiuCane\",
        \"html_content\": \"<!DOCTYPE html><html><head><meta charset=\\\"UTF-8\\\"><title>Prossima Consegna</title></head><body style=\\\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\\\"><div style=\\\"text-align: center; padding: 20px 0;\\\"><img src=\\\"https://piucane.it/logo.png\\\" alt=\\\"PiuCane\\\" style=\\\"max-width: 200px;\\\"></div><h1 style=\\\"color: #f97316; text-align: center;\\\">Prossima Consegna in Arrivo!</h1><p>Ciao {{customer_name}},</p><p>La prossima consegna per {{dog_name}} è programmata per <strong>{{delivery_date}}</strong>.</p><div style=\\\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\\\"><h3 style=\\\"color: #f97316; margin-top: 0;\\\">Dettagli Consegna</h3><p><strong>Data consegna:</strong> {{delivery_date}}</p><p><strong>Prodotti inclusi:</strong></p>{{#each products}}<p>• {{name}} ({{quantity}})</p>{{/each}}<p><strong>Indirizzo:</strong> {{delivery_address}}</p></div><p>Puoi modificare la data di consegna o mettere in pausa l'abbonamento in qualsiasi momento.</p><div style=\\\"text-align: center; margin: 30px 0;\\\"><a href=\\\"https://app.piucane.it/subscriptions\\\" style=\\\"background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;\\\">Gestisci Abbonamento</a><a href=\\\"https://app.piucane.it/subscriptions/{{subscription_id}}/reschedule\\\" style=\\\"background-color: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;\\\">Modifica Data</a></div><p>Grazie per la fiducia in PiuCane!</p><p>Il Team PiuCane</p></body></html>\"
    }" \
    "https://api.sendgrid.com/v3/templates/$SUBSCRIPTION_TEMPLATE_ID/versions"

# Create unsubscribe groups
echo "🚫 Creating unsubscribe groups..."

MARKETING_GROUP=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Marketing Emails",
        "description": "Promozioni, offerte speciali e newsletter PiuCane"
    }' \
    "https://api.sendgrid.com/v3/asm/groups")

TRANSACTIONAL_GROUP=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Transactional Emails",
        "description": "Conferme ordine, aggiornamenti account e comunicazioni di servizio"
    }' \
    "https://api.sendgrid.com/v3/asm/groups")

SUBSCRIPTION_GROUP=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Subscription Updates",
        "description": "Aggiornamenti abbonamenti e promemoria consegne"
    }' \
    "https://api.sendgrid.com/v3/asm/groups")

# Create contact lists
echo "📋 Creating contact lists..."

CUSTOMERS_LIST=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "PiuCane Customers"
    }' \
    "https://api.sendgrid.com/v3/marketing/lists")

SUBSCRIBERS_LIST=$(curl -s -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "PiuCane Subscribers"
    }' \
    "https://api.sendgrid.com/v3/marketing/lists")

# Create SendGrid service utility
cat > packages/lib/src/messaging/sendgrid.ts << 'EOF'
import sgMail from '@sendgrid/mail';

interface EmailTemplate {
  templateId: string;
  dynamicTemplateData: Record<string, any>;
}

interface EmailRecipient {
  email: string;
  name?: string;
}

export class SendGridService {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendTemplatedEmail(
    to: EmailRecipient | EmailRecipient[],
    templateId: string,
    dynamicData: Record<string, any>,
    from: EmailRecipient = { email: 'noreply@piucane.it', name: 'PiuCane' }
  ) {
    const msg = {
      to,
      from,
      templateId,
      dynamicTemplateData: dynamicData,
      asm: {
        groupId: this.getUnsubscribeGroup(templateId)
      }
    };

    try {
      await sgMail.send(msg);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    await this.sendTemplatedEmail(
      { email, name },
      process.env.SENDGRID_WELCOME_TEMPLATE_ID!,
      { user_name: name }
    );
  }

  async sendOrderConfirmation(
    email: string,
    name: string,
    orderData: {
      order_number: string;
      order_date: string;
      total_amount: string;
      shipping_address: string;
      items: Array<{ name: string; quantity: number; price: string }>;
      order_id: string;
    }
  ) {
    await this.sendTemplatedEmail(
      { email, name },
      process.env.SENDGRID_ORDER_TEMPLATE_ID!,
      {
        customer_name: name,
        ...orderData
      }
    );
  }

  async sendSubscriptionReminder(
    email: string,
    name: string,
    subscriptionData: {
      dog_name: string;
      delivery_date: string;
      products: Array<{ name: string; quantity: string }>;
      delivery_address: string;
      subscription_id: string;
    }
  ) {
    await this.sendTemplatedEmail(
      { email, name },
      process.env.SENDGRID_SUBSCRIPTION_TEMPLATE_ID!,
      {
        customer_name: name,
        ...subscriptionData
      }
    );
  }

  private getUnsubscribeGroup(templateId: string): number {
    // Map template IDs to unsubscribe groups
    const templateGroups: Record<string, number> = {
      [process.env.SENDGRID_WELCOME_TEMPLATE_ID!]: parseInt(process.env.SENDGRID_TRANSACTIONAL_GROUP_ID!),
      [process.env.SENDGRID_ORDER_TEMPLATE_ID!]: parseInt(process.env.SENDGRID_TRANSACTIONAL_GROUP_ID!),
      [process.env.SENDGRID_SUBSCRIPTION_TEMPLATE_ID!]: parseInt(process.env.SENDGRID_SUBSCRIPTION_GROUP_ID!)
    };

    return templateGroups[templateId] || parseInt(process.env.SENDGRID_MARKETING_GROUP_ID!);
  }
}
EOF

# Save SendGrid configuration
cat > .env.sendgrid << EOF
# SendGrid Configuration
SENDGRID_API_KEY=$SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=$FROM_EMAIL
SENDGRID_FROM_NAME=$FROM_NAME

# Template IDs
SENDGRID_WELCOME_TEMPLATE_ID=$WELCOME_TEMPLATE_ID
SENDGRID_ORDER_TEMPLATE_ID=$ORDER_TEMPLATE_ID
SENDGRID_SUBSCRIPTION_TEMPLATE_ID=$SUBSCRIPTION_TEMPLATE_ID

# Unsubscribe Group IDs
SENDGRID_MARKETING_GROUP_ID=$(echo "$MARKETING_GROUP" | jq -r '.id')
SENDGRID_TRANSACTIONAL_GROUP_ID=$(echo "$TRANSACTIONAL_GROUP" | jq -r '.id')
SENDGRID_SUBSCRIPTION_GROUP_ID=$(echo "$SUBSCRIPTION_GROUP" | jq -r '.id')

# Contact List IDs
SENDGRID_CUSTOMERS_LIST_ID=$(echo "$CUSTOMERS_LIST" | jq -r '.id')
SENDGRID_SUBSCRIBERS_LIST_ID=$(echo "$SUBSCRIBERS_LIST" | jq -r '.id')
EOF

echo "✅ SendGrid setup completed!"
echo "📋 Configuration saved to .env.sendgrid"
echo "📋 Template IDs created:"
echo "   - Welcome: $WELCOME_TEMPLATE_ID"
echo "   - Order: $ORDER_TEMPLATE_ID"
echo "   - Subscription: $SUBSCRIPTION_TEMPLATE_ID"
echo ""
echo "📋 Next steps:"
echo "1. Verify domain authentication in SendGrid console"
echo "2. Add DNS records shown above to your domain"
echo "3. Test email templates"
echo "4. Configure email analytics and reporting"