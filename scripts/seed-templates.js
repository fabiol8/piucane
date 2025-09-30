const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('../environments/firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seedTemplates() {
  console.log('📧 Starting message templates seeding...');

  try {
    await seedEmailTemplates();
    await seedSMSTemplates();
    await seedWhatsAppTemplates();
    await seedPushTemplates();

    console.log('✅ Message templates seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding message templates:', error);
  }
}

async function seedEmailTemplates() {
  console.log('📧 Seeding email templates...');

  const emailTemplates = [
    // Welcome Series
    {
      id: 'welcome_email',
      name: 'Email di Benvenuto',
      type: 'email',
      category: 'onboarding',
      subject: 'Benvenuto in PiùCane, {{user.firstName}}! 🐕',
      content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benvenuto in PiùCane</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e1e1e1; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .dogs-grid { display: flex; gap: 20px; margin: 20px 0; }
        .dog-card { flex: 1; text-align: center; }
        .highlight { background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐕 Benvenuto in PiùCane!</h1>
            <p>Ciao {{user.firstName}}, siamo felici di averti con noi!</p>
        </div>

        <div class="content">
            <h2>Il tuo viaggio con PiùCane inizia ora!</h2>

            <p>Hai appena fatto il primo passo per prenderti cura del tuo fedele compagno nel modo migliore. Con PiùCane avrai:</p>

            <div class="highlight">
                <h3>🎯 Cosa puoi fare subito:</h3>
                <ul>
                    <li><strong>Aggiungi il profilo del tuo cane</strong> - Per ricevere consigli personalizzati</li>
                    <li><strong>Esplora i nostri prodotti</strong> - Cibo e accessori di qualità premium</li>
                    <li><strong>Attiva un abbonamento</strong> - Per non rimanere mai senza il necessario</li>
                    <li><strong>Chatta con il nostro AI</strong> - Ricevi consigli esperti 24/7</li>
                </ul>
            </div>

            {{#if dogs}}
            <h3>I tuoi cani registrati:</h3>
            <div class="dogs-grid">
                {{#each dogs}}
                <div class="dog-card">
                    <h4>{{name}}</h4>
                    <p>{{breed}}</p>
                    <p>{{dogAge birthDate}}</p>
                </div>
                {{/each}}
            </div>
            {{else}}
            <div class="highlight">
                <h3>🐕 Inizia aggiungendo il tuo cane!</h3>
                <p>Per darti i migliori consigli personalizzati, abbiamo bisogno di conoscere il tuo fedele compagno.</p>
                <a href="{{trackingUrl urls.app '/dogs/add' user.id 'welcome_email'}}" class="button">Aggiungi il tuo cane</a>
            </div>
            {{/if}}

            <h3>🎁 Regalo di benvenuto</h3>
            <p>Per ringraziarti di esserti unito alla famiglia PiùCane, abbiamo un regalo speciale per te:</p>

            <div class="highlight">
                <p><strong>SCONTO DEL 15% sul tuo primo ordine</strong></p>
                <p>Usa il codice: <strong>BENVENUTO15</strong></p>
                <p><small>Valido fino al {{formatDate (add date.now 30) 'short'}} su ordini superiori a €30</small></p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{trackingUrl urls.app '/shop' user.id 'welcome_email'}}" class="button">Inizia lo shopping</a>
            </div>

            <p>Se hai domande, il nostro team è sempre disponibile. Puoi anche chattare con il nostro assistente AI che ti darà consigli personalizzati per il tuo cane!</p>

            <p>Benvenuto nella famiglia PiùCane! 🐾</p>
        </div>

        <div class="footer">
            <p><strong>Team PiùCane</strong></p>
            <p>{{company.email}} | {{company.phone}}</p>
            <p><a href="{{urls.unsubscribe}}">Annulla iscrizione</a></p>
        </div>
    </div>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'user.id', type: 'string', required: true, description: 'ID dell\'utente' },
        { name: 'dogs', type: 'array', required: false, description: 'Array dei cani dell\'utente' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },

    // Order Confirmation
    {
      id: 'order_confirmation',
      name: 'Conferma Ordine',
      type: 'email',
      category: 'transactional',
      subject: 'Ordine confermato #{{order.id}} - Grazie {{user.firstName}}!',
      content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conferma Ordine</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e1e1e1; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .order-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e1e1e1; }
        .total { font-weight: bold; font-size: 18px; padding-top: 15px; border-top: 2px solid #10B981; }
        .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .shipping-info { background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Ordine Confermato!</h1>
            <p>Ordine #{{order.id}}</p>
        </div>

        <div class="content">
            <h2>Grazie {{user.firstName}}!</h2>
            <p>Il tuo ordine è stato confermato e lo stiamo preparando con cura per {{#if order.dogName}}{{order.dogName}}{{else}}il tuo fedele compagno{{/if}}.</p>

            <div class="order-summary">
                <h3>Riepilogo Ordine</h3>
                <p><strong>Data ordine:</strong> {{formatDate order.createdAt 'long'}}</p>
                <p><strong>Numero ordine:</strong> #{{order.id}}</p>

                {{#each order.items}}
                <div class="order-item">
                    <div>
                        <strong>{{name}}</strong><br>
                        <small>Quantità: {{quantity}}</small>
                        {{#if dogName}}<br><small>Per: {{dogName}}</small>{{/if}}
                    </div>
                    <div>{{formatCurrency total}}</div>
                </div>
                {{/each}}

                <div class="order-item">
                    <div>Subtotale</div>
                    <div>{{formatCurrency order.subtotal}}</div>
                </div>

                {{#if order.discount}}
                <div class="order-item">
                    <div>Sconto{{#if order.discountCode}} ({{order.discountCode}}){{/if}}</div>
                    <div>-{{formatCurrency order.discount}}</div>
                </div>
                {{/if}}

                <div class="order-item">
                    <div>Spedizione</div>
                    <div>{{#if order.freeShipping}}Gratuita{{else}}{{formatCurrency order.shipping}}{{/if}}</div>
                </div>

                <div class="order-item total">
                    <div>Totale</div>
                    <div>{{formatCurrency order.total}}</div>
                </div>
            </div>

            <div class="shipping-info">
                <h3>📦 Informazioni Spedizione</h3>
                <p><strong>Indirizzo di spedizione:</strong></p>
                <p>
                    {{order.shippingAddress.name}}<br>
                    {{order.shippingAddress.street}}<br>
                    {{order.shippingAddress.city}} {{order.shippingAddress.postalCode}}<br>
                    {{order.shippingAddress.country}}
                </p>

                <p><strong>Consegna stimata:</strong> {{formatDate order.estimatedDelivery 'long'}}</p>
                {{#if order.trackingNumber}}
                <p><strong>Numero tracking:</strong> {{order.trackingNumber}}</p>
                {{/if}}
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{trackingUrl urls.app '/orders/' order.id user.id 'order_confirmation'}}" class="button">Traccia il tuo ordine</a>
            </div>

            {{#if order.subscriptionItems}}
            <div class="shipping-info">
                <h3>🔄 Abbonamenti</h3>
                <p>Alcuni articoli del tuo ordine sono parte di un abbonamento. Riceverai automaticamente le consegne future secondo la frequenza scelta.</p>
                <a href="{{trackingUrl urls.app '/subscriptions' user.id 'order_confirmation'}}">Gestisci i tuoi abbonamenti</a>
            </div>
            {{/if}}

            <h3>💡 Suggerimento</h3>
            <p>Mentre aspetti il tuo ordine, perché non aggiorni il profilo di {{#if order.dogName}}{{order.dogName}}{{else}}il tuo cane{{/if}}? Più informazioni ci dai, migliori saranno i nostri consigli!</p>

            <p>Grazie per aver scelto PiùCane! 🐾</p>
        </div>

        <div class="footer">
            <p><strong>Team PiùCane</strong></p>
            <p>Domande? Contattaci: {{company.email}} | {{company.phone}}</p>
            <p><a href="{{urls.unsubscribe}}">Gestisci preferenze email</a></p>
        </div>
    </div>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'order', type: 'object', required: true, description: 'Oggetto ordine completo' },
        { name: 'order.id', type: 'string', required: true, description: 'ID dell\'ordine' },
        { name: 'order.items', type: 'array', required: true, description: 'Articoli dell\'ordine' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },

    // Subscription Reminder
    {
      id: 'subscription_reminder',
      name: 'Promemoria Abbonamento',
      type: 'email',
      category: 'subscription',
      subject: '🔔 La tua consegna PiùCane arriva {{formatDate subscription.nextDelivery "short"}}',
      content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Promemoria Consegna</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e1e1e1; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .subscription-info { background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .dog-info { background: #FFF7ED; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .button.secondary { background: #6B7280; }
        .savings { background: #D1FAE5; color: #065F46; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚚 La tua consegna è in arrivo!</h1>
            <p>{{formatDate subscription.nextDelivery "long"}}</p>
        </div>

        <div class="content">
            <h2>Ciao {{user.firstName}}!</h2>
            <p>La tua prossima consegna PiùCane arriverà {{formatDate subscription.nextDelivery "long"}}.</p>

            {{#if subscription.dog}}
            <div class="dog-info">
                <h3>🐕 Per {{subscription.dog.name}}</h3>
                <p><strong>Razza:</strong> {{subscription.dog.breed}}</p>
                <p><strong>Età:</strong> {{dogAge subscription.dog.birthDate}}</p>
                <p><strong>Peso:</strong> {{subscription.dog.weight}}kg ({{weightCategory subscription.dog.weight}} taglia)</p>
            </div>
            {{/if}}

            <div class="subscription-info">
                <h3>📦 Cosa riceverai</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                    <div>
                        <strong>{{subscription.product.name}}</strong><br>
                        <small>Quantità: {{subscription.quantity}}</small>
                    </div>
                    <div>
                        <strong>{{formatCurrency subscription.itemTotal}}</strong>
                    </div>
                </div>

                <div class="savings">
                    💰 Risparmi {{formatCurrency subscription.savings}} rispetto all'acquisto singolo!
                </div>

                <p><strong>Frequenza:</strong>
                {{#eq subscription.frequency 'weekly'}}Settimanale{{/eq}}
                {{#eq subscription.frequency 'biweekly'}}Ogni 2 settimane{{/eq}}
                {{#eq subscription.frequency 'monthly'}}Mensile{{/eq}}
                </p>

                <p><strong>Prossima consegna dopo questa:</strong> {{formatDate subscription.nextAfterDelivery "short"}}</p>
            </div>

            {{#if subscription.recommendations}}
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3>💡 Consiglio personalizzato</h3>
                {{#each subscription.recommendations}}
                <p>{{this}}</p>
                {{/each}}
            </div>
            {{/if}}

            <h3>Vuoi modificare qualcosa?</h3>
            <p>Puoi sempre modificare quantità, frequenza o indirizzo di consegna fino a 24 ore prima della spedizione:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{trackingUrl urls.app '/subscriptions/' subscription.id user.id 'subscription_reminder'}}" class="button">Modifica abbonamento</a>
                <a href="{{trackingUrl urls.app '/subscriptions/' subscription.id '/pause' user.id 'subscription_reminder'}}" class="button secondary">Pausa temporanea</a>
            </div>

            <h3>🎯 Hai mai provato...</h3>
            <p>In base ai prodotti che acquisti per {{#if subscription.dog}}{{subscription.dog.name}}{{else}}il tuo cane{{/if}}, pensiamo che potrebbero interessarti anche:</p>

            {{#if relatedProducts}}
            {{#each relatedProducts}}
            <div style="border: 1px solid #e1e1e1; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <strong>{{name}}</strong> - {{formatCurrency price}}
                <p>{{shortDescription}}</p>
            </div>
            {{/each}}
            {{/if}}

            <p>Grazie per essere parte della famiglia PiùCane! 🐾</p>
        </div>

        <div class="footer">
            <p><strong>Team PiùCane</strong></p>
            <p>Domande? Siamo qui per aiutarti: {{company.email}}</p>
            <p><a href="{{urls.unsubscribe}}">Gestisci preferenze email</a></p>
        </div>
    </div>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'subscription', type: 'object', required: true, description: 'Oggetto abbonamento' },
        { name: 'subscription.nextDelivery', type: 'date', required: true, description: 'Data prossima consegna' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },

    // Health Reminder
    {
      id: 'health_reminder',
      name: 'Promemoria Salute',
      type: 'email',
      category: 'health',
      subject: '🏥 Promemoria salute per {{dog.name}}',
      content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Promemoria Salute</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e1e1e1; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .reminder-box { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 20px; margin: 20px 0; }
        .dog-info { background: #F0FDF4; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .urgent { background: #FEE2E2; color: #991B1B; padding: 10px; border-radius: 5px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Promemoria Salute</h1>
            <p>È tempo di prendersi cura di {{dog.name}}</p>
        </div>

        <div class="content">
            <h2>Ciao {{user.firstName}}!</h2>

            <div class="dog-info">
                <h3>🐕 {{dog.name}}</h3>
                <p><strong>Razza:</strong> {{dog.breed}}</p>
                <p><strong>Età:</strong> {{dogAge dog.birthDate}}</p>
                <p><strong>Peso attuale:</strong> {{dog.weight}}kg</p>
            </div>

            {{#if reminder.urgent}}
            <div class="urgent">
                ⚠️ URGENTE: Questo promemoria richiede attenzione immediata!
            </div>
            {{/if}}

            <div class="reminder-box">
                <h3>{{reminder.title}}</h3>
                <p><strong>Tipo:</strong> {{reminder.type}}</p>
                <p><strong>Scadenza:</strong> {{formatDate reminder.dueDate "long"}}</p>

                {{#if reminder.description}}
                <p>{{reminder.description}}</p>
                {{/if}}

                {{#if reminder.lastCompleted}}
                <p><small>Ultimo completamento: {{formatDate reminder.lastCompleted "short"}}</small></p>
                {{/if}}
            </div>

            {{#eq reminder.type 'vaccination'}}
            <h3>💉 Informazioni Vaccinazione</h3>
            <p>Le vaccinazioni sono fondamentali per mantenere {{dog.name}} in salute. Ecco cosa devi sapere:</p>
            <ul>
                <li><strong>Vaccino dovuto:</strong> {{reminder.vaccineName}}</li>
                <li><strong>Protezione:</strong> {{reminder.protection}}</li>
                <li><strong>Frequenza:</strong> {{reminder.frequency}}</li>
            </ul>
            {{/eq}}

            {{#eq reminder.type 'checkup'}}
            <h3>🔍 Controllo Veterinario</h3>
            <p>Un controllo regolare aiuta a prevenire problemi di salute e mantiene {{dog.name}} in forma ottimale.</p>
            <p>Durante la visita, il veterinario controllerà:</p>
            <ul>
                <li>Peso e condizione corporea</li>
                <li>Denti e igiene orale</li>
                <li>Occhi, orecchie e pelle</li>
                <li>Cuore e polmoni</li>
            </ul>
            {{/eq}}

            {{#eq reminder.type 'worming'}}
            <h3>🐛 Trattamento Antiparassitario</h3>
            <p>I trattamenti antiparassitari regolari proteggono {{dog.name}} da parassiti interni ed esterni.</p>
            <p><strong>Tipo di trattamento:</strong> {{reminder.treatmentType}}</p>
            <p><strong>Dosaggio raccomandato:</strong> Basato sul peso di {{dog.weight}}kg</p>
            {{/eq}}

            <h3>🎯 I nostri veterinari partner</h3>
            <p>Abbiamo una rete di veterinari qualificati nella tua zona. Possiamo aiutarti a trovare quello più vicino a te.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{trackingUrl urls.app '/veterinary/book' user.id 'health_reminder'}}" class="button">Prenota visita</a>
                <a href="{{trackingUrl urls.app '/dogs/' dog.id '/health' user.id 'health_reminder'}}" class="button" style="background: #10B981;">Aggiorna record</a>
            </div>

            {{#if reminder.tips}}
            <h3>💡 Consigli utili</h3>
            {{#each reminder.tips}}
            <p>• {{this}}</p>
            {{/each}}
            {{/if}}

            <p>La salute di {{dog.name}} è la nostra priorità. Se hai domande, non esitare a contattarci!</p>

            <p>Con affetto,<br>Il team PiùCane 🐾</p>
        </div>

        <div class="footer">
            <p><strong>Team PiùCane</strong></p>
            <p>Supporto 24/7: {{company.email}} | {{company.phone}}</p>
            <p><a href="{{urls.unsubscribe}}">Gestisci promemoria</a></p>
        </div>
    </div>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'dog', type: 'object', required: true, description: 'Oggetto cane' },
        { name: 'reminder', type: 'object', required: true, description: 'Oggetto promemoria' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  emailTemplates.forEach(template => {
    const docRef = db.collection('templates').doc(template.id);
    batch.set(docRef, template);
  });

  await batch.commit();
  console.log(`✅ Seeded ${emailTemplates.length} email templates`);
}

async function seedSMSTemplates() {
  console.log('📱 Seeding SMS templates...');

  const smsTemplates = [
    {
      id: 'welcome_sms',
      name: 'Benvenuto SMS',
      type: 'sms',
      category: 'onboarding',
      content: 'Ciao {{user.firstName}}! 🐕 Benvenuto in PiùCane! Il tuo codice sconto BENVENUTO15 ti aspetta. Scarica l\'app: {{urls.app}}',
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'order_shipped_sms',
      name: 'Ordine Spedito SMS',
      type: 'sms',
      category: 'transactional',
      content: '📦 Il tuo ordine #{{order.id}} è in viaggio! Tracking: {{order.trackingNumber}}. Consegna prevista: {{formatDate order.estimatedDelivery "short"}}. Traccia: {{urls.app}}/orders/{{order.id}}',
      variables: [
        { name: 'order.id', type: 'string', required: true, description: 'ID ordine' },
        { name: 'order.trackingNumber', type: 'string', required: true, description: 'Numero tracking' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'subscription_reminder_sms',
      name: 'Promemoria Abbonamento SMS',
      type: 'sms',
      category: 'subscription',
      content: '🔔 La tua consegna PiùCane per {{subscription.dog.name}} arriva {{formatDate subscription.nextDelivery "short"}}! Modifica: {{urls.app}}/subscriptions/{{subscription.id}}',
      variables: [
        { name: 'subscription.dog.name', type: 'string', required: true, description: 'Nome del cane' },
        { name: 'subscription.nextDelivery', type: 'date', required: true, description: 'Data prossima consegna' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'health_reminder_sms',
      name: 'Promemoria Salute SMS',
      type: 'sms',
      category: 'health',
      content: '🏥 Promemoria per {{dog.name}}: {{reminder.title}} in scadenza il {{formatDate reminder.dueDate "short"}}. Prenota: {{urls.app}}/veterinary/book',
      variables: [
        { name: 'dog.name', type: 'string', required: true, description: 'Nome del cane' },
        { name: 'reminder.title', type: 'string', required: true, description: 'Titolo promemoria' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  smsTemplates.forEach(template => {
    const docRef = db.collection('templates').doc(template.id);
    batch.set(docRef, template);
  });

  await batch.commit();
  console.log(`✅ Seeded ${smsTemplates.length} SMS templates`);
}

async function seedWhatsAppTemplates() {
  console.log('💬 Seeding WhatsApp templates...');

  const whatsappTemplates = [
    {
      id: 'welcome_whatsapp',
      name: 'Benvenuto WhatsApp',
      type: 'whatsapp',
      category: 'onboarding',
      content: '🐕 *Benvenuto in PiùCane, {{user.firstName}}!*\n\nSiamo felicissimi di averti nella nostra famiglia! \n\n🎁 *Regalo di benvenuto*: Usa il codice *BENVENUTO15* per il 15% di sconto sul tuo primo ordine.\n\n{{#if dogs.length}}Vedo che hai già registrato {{dogs.length}} {{pluralize dogs.length "cane" "cani"}}! Perfetto! 🐾{{else}}💡 *Consiglio*: Aggiungi il profilo del tuo cane per ricevere consigli personalizzati!{{/if}}\n\nScarica l\'app: {{urls.app}}',
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'dogs', type: 'array', required: false, description: 'Array dei cani' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'order_confirmation_whatsapp',
      name: 'Conferma Ordine WhatsApp',
      type: 'whatsapp',
      category: 'transactional',
      content: '✅ *Ordine confermato #{{order.id}}*\n\nGrazie {{user.firstName}}! Il tuo ordine da {{formatCurrency order.total}} è confermato.\n\n📦 *Cosa hai ordinato:*\n{{#each order.items}}• {{name}} ({{quantity}}x)\n{{/each}}\n🚚 *Consegna stimata:* {{formatDate order.estimatedDelivery "long"}}\n\nTraccia il tuo ordine: {{urls.app}}/orders/{{order.id}}',
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'order', type: 'object', required: true, description: 'Oggetto ordine' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'subscription_delivery_whatsapp',
      name: 'Consegna Abbonamento WhatsApp',
      type: 'whatsapp',
      category: 'subscription',
      content: '🚚 *La tua consegna è in arrivo!*\n\nCiao {{user.firstName}}, la consegna per {{subscription.dog.name}} arriva *{{formatDate subscription.nextDelivery "short"}}*\n\n📦 *In arrivo:*\n• {{subscription.product.name}} ({{subscription.quantity}}x)\n• Totale: {{formatCurrency subscription.total}}\n\n💰 Stai risparmiando {{formatCurrency subscription.savings}} rispetto all\'acquisto singolo!\n\nVuoi modificare? {{urls.app}}/subscriptions/{{subscription.id}}',
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' },
        { name: 'subscription', type: 'object', required: true, description: 'Oggetto abbonamento' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  whatsappTemplates.forEach(template => {
    const docRef = db.collection('templates').doc(template.id);
    batch.set(docRef, template);
  });

  await batch.commit();
  console.log(`✅ Seeded ${whatsappTemplates.length} WhatsApp templates`);
}

async function seedPushTemplates() {
  console.log('🔔 Seeding push notification templates...');

  const pushTemplates = [
    {
      id: 'welcome_push',
      name: 'Benvenuto Push',
      type: 'push',
      category: 'onboarding',
      content: JSON.stringify({
        title: 'Benvenuto in PiùCane! 🐕',
        body: 'Ciao {{user.firstName}}! Il tuo sconto del 15% ti aspetta. Inizia subito!',
        data: {
          type: 'welcome',
          action: 'open_shop',
          discount_code: 'BENVENUTO15'
        },
        clickAction: '{{urls.app}}/shop?welcome=true'
      }),
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'Nome dell\'utente' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'order_shipped_push',
      name: 'Ordine Spedito Push',
      type: 'push',
      category: 'transactional',
      content: JSON.stringify({
        title: 'Il tuo ordine è in viaggio! 📦',
        body: 'Ordine #{{order.id}} spedito. Consegna prevista: {{formatDate order.estimatedDelivery "short"}}',
        data: {
          type: 'order_update',
          order_id: '{{order.id}}',
          status: 'shipped'
        },
        clickAction: '{{urls.app}}/orders/{{order.id}}'
      }),
      variables: [
        { name: 'order.id', type: 'string', required: true, description: 'ID ordine' },
        { name: 'order.estimatedDelivery', type: 'date', required: true, description: 'Data consegna stimata' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'subscription_reminder_push',
      name: 'Promemoria Abbonamento Push',
      type: 'push',
      category: 'subscription',
      content: JSON.stringify({
        title: 'Consegna in arrivo per {{subscription.dog.name}} 🐕',
        body: 'La tua consegna arriva {{formatDate subscription.nextDelivery "short"}}. Tutto pronto?',
        data: {
          type: 'subscription_reminder',
          subscription_id: '{{subscription.id}}',
          dog_id: '{{subscription.dog.id}}'
        },
        clickAction: '{{urls.app}}/subscriptions/{{subscription.id}}'
      }),
      variables: [
        { name: 'subscription.dog.name', type: 'string', required: true, description: 'Nome del cane' },
        { name: 'subscription.nextDelivery', type: 'date', required: true, description: 'Data prossima consegna' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'health_reminder_push',
      name: 'Promemoria Salute Push',
      type: 'push',
      category: 'health',
      content: JSON.stringify({
        title: 'Promemoria salute per {{dog.name}} 🏥',
        body: '{{reminder.title}} in scadenza. Prenota subito la visita!',
        data: {
          type: 'health_reminder',
          dog_id: '{{dog.id}}',
          reminder_type: '{{reminder.type}}'
        },
        clickAction: '{{urls.app}}/dogs/{{dog.id}}/health'
      }),
      variables: [
        { name: 'dog.name', type: 'string', required: true, description: 'Nome del cane' },
        { name: 'reminder.title', type: 'string', required: true, description: 'Titolo promemoria' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'daily_checkin_push',
      name: 'Check-in Giornaliero Push',
      type: 'push',
      category: 'engagement',
      content: JSON.stringify({
        title: 'Come sta {{#if primaryDog}}{{primaryDog.name}}{{else}}il tuo cane{{/if}} oggi? 🐕',
        body: 'Aggiorna il suo stato e guadagna punti! Streak attuale: {{gamification.streak}} giorni',
        data: {
          type: 'daily_checkin',
          streak: '{{gamification.streak}}'
        },
        clickAction: '{{urls.app}}/dogs'
      }),
      variables: [
        { name: 'primaryDog.name', type: 'string', required: false, description: 'Nome del cane principale' },
        { name: 'gamification.streak', type: 'number', required: true, description: 'Streak attuale' }
      ],
      language: 'it',
      active: true,
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  pushTemplates.forEach(template => {
    const docRef = db.collection('templates').doc(template.id);
    batch.set(docRef, template);
  });

  await batch.commit();
  console.log(`✅ Seeded ${pushTemplates.length} push notification templates`);
}

// Run the seeding
seedTemplates();