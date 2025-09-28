#!/bin/bash

# PiuCane Twilio SMS/WhatsApp Setup Script
# Configura Twilio account, SMS, WhatsApp Business API

set -e

echo "📱 PiuCane Twilio Setup Starting..."

# Check if Twilio CLI is installed
if ! command -v twilio &> /dev/null; then
    echo "❌ Twilio CLI not found. Installing..."
    npm install -g twilio-cli
fi

echo "⚠️ Manual Twilio Setup Required:"
echo "1. Create Twilio account at https://www.twilio.com"
echo "2. Get Account SID and Auth Token from Console"
echo "3. Set environment variables:"
echo "   export TWILIO_ACCOUNT_SID='your-account-sid'"
echo "   export TWILIO_AUTH_TOKEN='your-auth-token'"
echo ""

# Check if credentials are set
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo "🔑 Please set Twilio credentials and run script again:"
    echo "   export TWILIO_ACCOUNT_SID='your-twilio-account-sid'"
    echo "   export TWILIO_AUTH_TOKEN='your-twilio-auth-token'"
    exit 1
fi

# Configure Twilio CLI
echo "🔐 Configuring Twilio CLI..."
twilio login --account-sid "$TWILIO_ACCOUNT_SID" --auth-token "$TWILIO_AUTH_TOKEN"

# Purchase phone number for SMS
echo "📞 Purchasing phone number for SMS..."
PHONE_NUMBER=$(twilio phone-numbers:buy:phone-number \
    --country-code IT \
    --sms-enabled \
    --voice-enabled \
    --area-code 393 \
    --format json | jq -r '.phoneNumber')

if [ "$PHONE_NUMBER" = "null" ]; then
    echo "⚠️ No phone numbers available for purchase. Using existing number or manual setup required."
    PHONE_NUMBER="+393XXXXXXXXX"  # Placeholder
else
    echo "✅ Phone number purchased: $PHONE_NUMBER"
fi

# Setup WhatsApp Business API
echo "📱 Setting up WhatsApp Business API..."

# Apply for WhatsApp Business API (manual process)
cat > whatsapp-business-setup.txt << EOF
🔧 WhatsApp Business API Setup (Manual Steps Required):

1. Apply for WhatsApp Business API:
   - Go to Twilio Console > Messaging > WhatsApp
   - Submit business verification documents
   - Wait for approval (can take 1-2 weeks)

2. Once approved, configure WhatsApp sender:
   - Business name: PiuCane
   - Business category: Pet Care Services
   - Business description: Alimentazione personalizzata e benessere per cani
   - Profile picture: Upload PiuCane logo

3. WhatsApp Templates (pre-approval required):
   - Welcome message template
   - Order confirmation template
   - Delivery notification template
   - Reminder templates

Note: WhatsApp Business API requires Meta approval for production use.
EOF

# Create webhook endpoints for SMS/WhatsApp
echo "🪝 Creating webhook endpoints..."

# Configure webhook URL for SMS
twilio phone-numbers:update $PHONE_NUMBER \
    --sms-url="https://api.piucane.it/webhooks/twilio/sms" \
    --sms-method="POST"

# Create Twilio webhook handler
cat > api/src/routes/webhooks/twilio.ts << 'EOF'
import express from 'express';
import twilio from 'twilio';
import { logger } from '../../utils/logger';
import { db } from '../../config/firebase';

const router = express.Router();

// Middleware to validate Twilio webhook
const validateTwilioWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    req.body
  );

  if (!isValid) {
    logger.error('Invalid Twilio webhook signature');
    return res.status(403).send('Forbidden');
  }

  next();
};

// SMS webhook endpoint
router.post('/sms', express.urlencoded({ extended: false }), validateTwilioWebhook, async (req, res) => {
  const { From, Body, MessageSid } = req.body;

  logger.info(`SMS received from ${From}: ${Body}`);

  try {
    // Save incoming SMS to database
    await db.collection('sms_messages').add({
      from: From,
      body: Body,
      messageSid: MessageSid,
      direction: 'inbound',
      createdAt: new Date()
    });

    // Auto-reply logic
    const twiml = new twilio.twiml.MessagingResponse();

    if (Body.toLowerCase().includes('stop') || Body.toLowerCase().includes('basta')) {
      // Handle unsubscribe
      await handleSMSUnsubscribe(From);
      twiml.message('Hai annullato la ricezione di SMS da PiuCane. Per riattivare scrivi START.');
    } else if (Body.toLowerCase().includes('start')) {
      // Handle resubscribe
      await handleSMSResubscribe(From);
      twiml.message('Benvenuto! Riceverai aggiornamenti SMS da PiuCane. Per fermarli scrivi STOP.');
    } else {
      // Forward to customer support
      twiml.message('Grazie per il tuo messaggio! Il nostro team ti risponderà presto. Per supporto immediato visita https://app.piucane.it/support');
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    logger.error('Error processing SMS webhook:', error);
    res.status(500).send('Error processing SMS');
  }
});

// WhatsApp webhook endpoint
router.post('/whatsapp', express.urlencoded({ extended: false }), validateTwilioWebhook, async (req, res) => {
  const { From, Body, MessageSid, ProfileName } = req.body;

  logger.info(`WhatsApp message received from ${From} (${ProfileName}): ${Body}`);

  try {
    // Save incoming WhatsApp message
    await db.collection('whatsapp_messages').add({
      from: From,
      body: Body,
      profileName: ProfileName,
      messageSid: MessageSid,
      direction: 'inbound',
      createdAt: new Date()
    });

    const twiml = new twilio.twiml.MessagingResponse();

    // WhatsApp response logic
    if (Body.toLowerCase().includes('ordine') || Body.toLowerCase().includes('order')) {
      twiml.message('Per vedere i tuoi ordini, visita: https://app.piucane.it/orders');
    } else if (Body.toLowerCase().includes('abbonamento') || Body.toLowerCase().includes('subscription')) {
      twiml.message('Gestisci il tuo abbonamento qui: https://app.piucane.it/subscriptions');
    } else if (Body.toLowerCase().includes('aiuto') || Body.toLowerCase().includes('help')) {
      twiml.message(`Ciao! 👋 Come posso aiutarti?

🍽️ *Prodotti e ordini*: scrivi "ordine"
🔄 *Abbonamenti*: scrivi "abbonamento"
🩺 *Consulenza veterinaria*: visita https://app.piucane.it/vet
📞 *Supporto*: https://app.piucane.it/support

Il Team PiuCane 🐕`);
    } else {
      twiml.message('Grazie per il messaggio! Per assistenza completa visita https://app.piucane.it/support o scrivi "aiuto" per vedere le opzioni disponibili.');
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error);
    res.status(500).send('Error processing WhatsApp message');
  }
});

async function handleSMSUnsubscribe(phoneNumber: string) {
  await db.collection('sms_subscriptions').doc(phoneNumber).set({
    phoneNumber,
    subscribed: false,
    unsubscribedAt: new Date()
  }, { merge: true });
}

async function handleSMSResubscribe(phoneNumber: string) {
  await db.collection('sms_subscriptions').doc(phoneNumber).set({
    phoneNumber,
    subscribed: true,
    subscribedAt: new Date()
  }, { merge: true });
}

export default router;
EOF

# Create Twilio service utility
cat > packages/lib/src/messaging/twilio.ts << 'EOF'
import twilio from 'twilio';

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
  from?: string;
}

export class TwilioService {
  private client: twilio.Twilio;
  private fromPhone: string;
  private fromWhatsApp: string;

  constructor(accountSid: string, authToken: string, fromPhone: string) {
    this.client = twilio(accountSid, authToken);
    this.fromPhone = fromPhone;
    this.fromWhatsApp = `whatsapp:${fromPhone}`;
  }

  async sendSMS(message: SMSMessage): Promise<void> {
    try {
      await this.client.messages.create({
        body: message.body,
        from: message.from || this.fromPhone,
        to: message.to
      });

      console.log(`SMS sent to ${message.to}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendWhatsApp(message: WhatsAppMessage): Promise<void> {
    try {
      const messageData: any = {
        body: message.body,
        from: message.from || this.fromWhatsApp,
        to: `whatsapp:${message.to}`
      };

      if (message.mediaUrl) {
        messageData.mediaUrl = [message.mediaUrl];
      }

      await this.client.messages.create(messageData);

      console.log(`WhatsApp message sent to ${message.to}`);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async sendOrderConfirmationSMS(phoneNumber: string, orderNumber: string, totalAmount: string): Promise<void> {
    const body = `🐕 PiuCane: Ordine #${orderNumber} confermato! Totale: €${totalAmount}. Traccia la spedizione su https://app.piucane.it/orders/${orderNumber}`;

    await this.sendSMS({
      to: phoneNumber,
      body
    });
  }

  async sendDeliveryNotificationWhatsApp(phoneNumber: string, orderNumber: string, trackingNumber: string): Promise<void> {
    const body = `📦 Il tuo ordine PiuCane #${orderNumber} è in viaggio!

🚚 Numero tracking: ${trackingNumber}
📱 Traccia qui: https://app.piucane.it/tracking/${trackingNumber}

Grazie per aver scelto PiuCane! 🐕`;

    await this.sendWhatsApp({
      to: phoneNumber,
      body
    });
  }

  async sendSubscriptionReminderSMS(phoneNumber: string, dogName: string, deliveryDate: string): Promise<void> {
    const body = `🔔 PiuCane: Prossima consegna per ${dogName} il ${deliveryDate}. Modifica o pausa: https://app.piucane.it/subscriptions`;

    await this.sendSMS({
      to: phoneNumber,
      body
    });
  }

  async isPhoneNumberSubscribed(phoneNumber: string): Promise<boolean> {
    // Check SMS subscription status
    try {
      const response = await fetch(`https://api.piucane.it/sms-subscriptions/${phoneNumber}`);
      const data = await response.json();
      return data.subscribed || false;
    } catch {
      return false; // Default to not subscribed if check fails
    }
  }
}
EOF

# Create WhatsApp message templates
echo "📝 Creating WhatsApp message templates..."

mkdir -p templates/whatsapp

cat > templates/whatsapp/welcome-template.json << 'EOF'
{
  "name": "welcome_message",
  "language": "it",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Benvenuto in PiuCane! 🐕"
    },
    {
      "type": "BODY",
      "text": "Ciao {{1}}! Siamo entusiasti di averti nella famiglia PiuCane. Inizia subito a prenderti cura del benessere del tuo cane con la nostra alimentazione personalizzata e i consigli dei nostri esperti.",
      "example": {
        "body_text": [["Mario"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Il Team PiuCane"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Inizia Subito",
          "url": "https://app.piucane.it/onboarding"
        }
      ]
    }
  ]
}
EOF

cat > templates/whatsapp/order-confirmation-template.json << 'EOF'
{
  "name": "order_confirmation",
  "language": "it",
  "category": "TRANSACTIONAL",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Ordine Confermato! 📦"
    },
    {
      "type": "BODY",
      "text": "Il tuo ordine #{{1}} è stato confermato per un totale di €{{2}}. Riceverai una notifica non appena sarà spedito!",
      "example": {
        "body_text": [["ORD001", "29.99"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Visualizza Ordine",
          "url": "https://app.piucane.it/orders/{{1}}"
        }
      ]
    }
  ]
}
EOF

# Create SMS automation scripts
cat > scripts/maintenance/send-bulk-sms.js << 'EOF'
const twilio = require('twilio');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function sendBulkSMS(campaign) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    // Get subscribers
    const subscribersSnapshot = await db.collection('sms_subscriptions')
      .where('subscribed', '==', true)
      .get();

    console.log(`Sending SMS to ${subscribersSnapshot.size} subscribers...`);

    const promises = subscribersSnapshot.docs.map(async (doc) => {
      const phoneNumber = doc.data().phoneNumber;

      try {
        await client.messages.create({
          body: campaign.message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });

        console.log(`SMS sent to ${phoneNumber}`);
      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('Bulk SMS campaign completed!');

  } catch (error) {
    console.error('Error sending bulk SMS:', error);
  }
}

// Example usage
const campaign = {
  message: "🎉 Offerta speciale PiuCane! 20% di sconto su tutti i prodotti fino a domenica. Usa codice WEEKEND20 → https://app.piucane.it/shop"
};

sendBulkSMS(campaign);
EOF

# Save Twilio configuration
cat > .env.twilio << EOF
# Twilio Configuration
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=$PHONE_NUMBER
TWILIO_WHATSAPP_NUMBER=whatsapp:$PHONE_NUMBER

# Webhook URLs
TWILIO_SMS_WEBHOOK_URL=https://api.piucane.it/webhooks/twilio/sms
TWILIO_WHATSAPP_WEBHOOK_URL=https://api.piucane.it/webhooks/twilio/whatsapp

# WhatsApp Business (after approval)
WHATSAPP_BUSINESS_PHONE_NUMBER=+14155238886
WHATSAPP_BUSINESS_NAME=PiuCane
EOF

# Create Twilio Functions for advanced automation
echo "⚡ Creating Twilio Functions..."

cat > twilio-functions/order-notifications.js << 'EOF'
exports.handler = function(context, event, callback) {
  const twilio = require('twilio')(context.ACCOUNT_SID, context.AUTH_TOKEN);

  const orderData = JSON.parse(event.orderData);
  const phoneNumber = orderData.phoneNumber;
  const orderNumber = orderData.orderNumber;
  const totalAmount = orderData.totalAmount;

  const message = `🐕 PiuCane: Ordine #${orderNumber} confermato! Totale: €${totalAmount}. Segui la spedizione: ${context.DOMAIN_NAME}/orders/${orderNumber}`;

  twilio.messages.create({
    body: message,
    from: context.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  })
  .then(message => {
    console.log('SMS sent:', message.sid);
    callback(null, { success: true, messageSid: message.sid });
  })
  .catch(error => {
    console.error('Error sending SMS:', error);
    callback(error);
  });
};
EOF

# Integration with API webhook handler
cat >> api/src/index.ts << 'EOF'

// Add Twilio webhooks
import twilioRoutes from './routes/webhooks/twilio';
app.use('/api/webhooks/twilio', twilioRoutes);
EOF

echo "✅ Twilio SMS/WhatsApp setup completed!"
echo "📋 Configuration saved to .env.twilio"
echo "📱 Phone number: $PHONE_NUMBER"
echo ""
echo "📋 Next steps:"
echo "1. Apply for WhatsApp Business API approval"
echo "2. Submit WhatsApp message templates for approval"
echo "3. Configure webhook URLs in Twilio Console"
echo "4. Test SMS and WhatsApp functionality"
echo "5. Set up compliance and opt-out handling"
echo ""
echo "⚠️ Important compliance notes:"
echo "- Always provide opt-out instructions (STOP/BASTA)"
echo "- Respect user preferences and unsubscribe requests"
echo "- Follow GDPR guidelines for phone number collection"
echo "- WhatsApp Business API requires Meta approval for production"