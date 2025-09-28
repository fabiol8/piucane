# API Endpoints - PiùCane

## 🔌 Panoramica API

L'API di PiùCane è costruita su Firebase Functions e fornisce un'interfaccia REST completa per tutte le funzionalità della piattaforma.

**Base URL**: `https://api.piucane.it`
**Versione**: `v1`
**Formato**: JSON
**Autenticazione**: Firebase Auth JWT

## 🔐 Autenticazione

Tutti gli endpoint richiedono autenticazione tramite Firebase Auth JWT token nell'header:

```http
Authorization: Bearer <firebase-jwt-token>
```

### Roles
- `user`: Utente standard
- `admin`: Amministratore
- `moderator`: Moderatore

## 📋 Endpoints per Categoria

### 🔄 Authentication & Users

#### POST `/auth/register`
Registrazione nuovo utente

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "Mario Rossi",
  "acceptTerms": true,
  "acceptPrivacy": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user123",
    "email": "user@example.com",
    "displayName": "Mario Rossi",
    "role": "user"
  },
  "token": "jwt-token"
}
```

#### GET `/users/profile`
Ottieni profilo utente corrente

**Response:**
```json
{
  "uid": "user123",
  "email": "user@example.com",
  "displayName": "Mario Rossi",
  "role": "user",
  "createdAt": "2024-01-01T00:00:00Z",
  "preferences": {
    "language": "it",
    "notifications": true
  }
}
```

#### PUT `/users/profile`
Aggiorna profilo utente

**Body:**
```json
{
  "displayName": "Mario Bianchi",
  "preferences": {
    "language": "en",
    "notifications": false
  }
}
```

### 🐕 Dogs Management

#### GET `/dogs`
Lista cani dell'utente

**Query Parameters:**
- `limit`: Numero massimo risultati (default: 10)
- `offset`: Offset per paginazione (default: 0)

**Response:**
```json
{
  "dogs": [
    {
      "id": "dog123",
      "name": "Buddy",
      "breed": "Golden Retriever",
      "birthDate": "2020-05-15",
      "weight": 30.5,
      "microchipNumber": "123456789",
      "ownerId": "user123",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

#### POST `/dogs`
Crea nuovo profilo cane

**Body:**
```json
{
  "name": "Buddy",
  "breed": "Golden Retriever",
  "birthDate": "2020-05-15",
  "weight": 30.5,
  "microchipNumber": "123456789",
  "gender": "male",
  "isNeutered": true
}
```

#### GET `/dogs/{dogId}`
Dettagli specifico cane

#### PUT `/dogs/{dogId}`
Aggiorna profilo cane

#### DELETE `/dogs/{dogId}`
Elimina profilo cane

### 💉 Vaccinations

#### GET `/dogs/{dogId}/vaccinations`
Lista vaccinazioni per cane

**Response:**
```json
{
  "vaccinations": [
    {
      "id": "vacc123",
      "dogId": "dog123",
      "vaccinationType": "rabies",
      "dateAdministered": "2024-01-15",
      "nextDueDate": "2025-01-15",
      "veterinarianId": "vet123",
      "batchNumber": "BATCH001",
      "notes": "Prima vaccinazione"
    }
  ]
}
```

#### POST `/dogs/{dogId}/vaccinations`
Aggiungi vaccinazione

**Body:**
```json
{
  "vaccinationType": "rabies",
  "dateAdministered": "2024-01-15",
  "nextDueDate": "2025-01-15",
  "veterinarianId": "vet123",
  "batchNumber": "BATCH001",
  "notes": "Prima vaccinazione"
}
```

### 👨‍⚕️ Veterinarians

#### GET `/veterinarians`
Lista veterinari disponibili

**Query Parameters:**
- `city`: Filtra per città
- `specialization`: Filtra per specializzazione

**Response:**
```json
{
  "veterinarians": [
    {
      "id": "vet123",
      "name": "Dr. Mario Bianchi",
      "clinicName": "Clinica Veterinaria Roma",
      "address": "Via Roma 123, Roma",
      "phone": "+39 06 123456",
      "email": "info@vetroma.it",
      "specializations": ["general", "surgery"]
    }
  ]
}
```

### 🛒 E-commerce

#### GET `/products`
Lista prodotti

**Query Parameters:**
- `category`: Filtra per categoria
- `search`: Ricerca testuale
- `limit`: Numero risultati (default: 20)
- `offset`: Offset paginazione
- `sort`: Ordinamento (price_asc, price_desc, name, newest)

**Response:**
```json
{
  "products": [
    {
      "id": "prod123",
      "name": "Crocchette Premium",
      "description": "Crocchette di alta qualità",
      "price": 29.99,
      "currency": "EUR",
      "category": "food",
      "images": ["image1.jpg", "image2.jpg"],
      "inStock": true,
      "stockQuantity": 50,
      "tags": ["premium", "adult"]
    }
  ],
  "total": 1,
  "hasMore": false
}
```

#### GET `/products/{productId}`
Dettagli prodotto

#### GET `/categories`
Lista categorie prodotti

### 🛒 Cart & Orders

#### GET `/cart`
Contenuto carrello corrente

**Response:**
```json
{
  "items": [
    {
      "productId": "prod123",
      "product": {
        "id": "prod123",
        "name": "Crocchette Premium",
        "price": 29.99
      },
      "quantity": 2,
      "subtotal": 59.98
    }
  ],
  "total": 59.98,
  "currency": "EUR"
}
```

#### POST `/cart/items`
Aggiungi prodotto al carrello

**Body:**
```json
{
  "productId": "prod123",
  "quantity": 2
}
```

#### PUT `/cart/items/{productId}`
Aggiorna quantità nel carrello

#### DELETE `/cart/items/{productId}`
Rimuovi dal carrello

#### POST `/orders`
Crea nuovo ordine

**Body:**
```json
{
  "items": [
    {
      "productId": "prod123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "Mario Rossi",
    "street": "Via Roma 123",
    "city": "Roma",
    "zipCode": "00100",
    "country": "IT"
  },
  "paymentMethodId": "pm_stripe123"
}
```

#### GET `/orders`
Lista ordini utente

#### GET `/orders/{orderId}`
Dettagli ordine specifico

### 🔄 Subscriptions

#### GET `/subscriptions`
Lista abbonamenti utente

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "sub123",
      "userId": "user123",
      "planType": "premium",
      "status": "active",
      "currentPeriodStart": "2024-01-01",
      "currentPeriodEnd": "2024-02-01",
      "cadence": 30,
      "nextDelivery": "2024-02-01",
      "items": [
        {
          "productId": "prod123",
          "quantity": 1
        }
      ]
    }
  ]
}
```

#### POST `/subscriptions`
Crea nuovo abbonamento

#### PUT `/subscriptions/{subscriptionId}`
Aggiorna abbonamento

#### POST `/subscriptions/{subscriptionId}/pause`
Pausa abbonamento

#### POST `/subscriptions/{subscriptionId}/resume`
Riprendi abbonamento

#### DELETE `/subscriptions/{subscriptionId}`
Cancella abbonamento

### 🎮 Gamification

#### GET `/missions`
Lista missioni disponibili

**Response:**
```json
{
  "missions": [
    {
      "id": "mission123",
      "title": "Prima passeggiata",
      "description": "Porta il tuo cane a passeggio",
      "type": "daily",
      "difficulty": "easy",
      "points": 100,
      "requirements": {
        "dogWalks": 1
      },
      "status": "available"
    }
  ]
}
```

#### GET `/user/missions`
Missioni utente corrente

#### POST `/user/missions/{missionId}/start`
Inizia missione

#### POST `/user/missions/{missionId}/complete`
Completa missione

#### GET `/user/progress`
Progresso gamification utente

**Response:**
```json
{
  "level": 5,
  "experience": 1250,
  "experienceToNext": 250,
  "totalPoints": 5000,
  "availablePoints": 1200,
  "completedMissions": 25,
  "unlockedBadges": 8
}
```

#### GET `/badges`
Lista badge disponibili

#### GET `/user/badges`
Badge utente

#### POST `/user/badges/{badgeId}/claim`
Rivendica badge

#### GET `/rewards`
Lista ricompense disponibili

#### POST `/rewards/{rewardId}/redeem`
Riscatta ricompensa

### 🤖 AI Agents

#### POST `/ai/conversations`
Crea nuova conversazione AI

**Body:**
```json
{
  "agentType": "vet",
  "dogId": "dog123",
  "initialMessage": "Il mio cane sembra stanco"
}
```

**Response:**
```json
{
  "conversationId": "conv123",
  "agentType": "vet",
  "dogId": "dog123",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### GET `/ai/conversations`
Lista conversazioni utente

#### GET `/ai/conversations/{conversationId}`
Dettagli conversazione

#### POST `/ai/conversations/{conversationId}/messages`
Invia messaggio

**Body:**
```json
{
  "message": "Come posso aiutare il mio cane?",
  "attachments": ["image1.jpg"]
}
```

**Response:**
```json
{
  "messageId": "msg123",
  "response": "Basandomi sulle informazioni...",
  "confidence": 0.95,
  "safetyFlags": [],
  "usageCount": 5,
  "remainingQuota": 15
}
```

#### GET `/ai/usage`
Utilizzo AI corrente

### 📬 Messaging

#### GET `/messages/inbox`
Inbox messaggi utente

**Response:**
```json
{
  "messages": [
    {
      "id": "msg123",
      "type": "notification",
      "title": "Vaccino in scadenza",
      "content": "Il vaccino del tuo cane scade tra 7 giorni",
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "metadata": {
        "dogId": "dog123",
        "vaccinationType": "rabies"
      }
    }
  ]
}
```

#### POST `/messages/{messageId}/read`
Marca messaggio come letto

#### DELETE `/messages/{messageId}`
Elimina messaggio

### 📊 Analytics (Admin Only)

#### GET `/admin/analytics/dashboard`
Dashboard analytics principale

**Requires**: Admin role

**Response:**
```json
{
  "users": {
    "total": 1250,
    "newThisMonth": 89,
    "activeThisMonth": 456
  },
  "orders": {
    "total": 2340,
    "revenue": 45600.50,
    "avgOrderValue": 19.49
  },
  "subscriptions": {
    "active": 234,
    "mrr": 7020.00,
    "churnRate": 0.05
  }
}
```

#### GET `/admin/analytics/users`
Analytics dettagliate utenti

#### GET `/admin/analytics/sales`
Analytics vendite

#### GET `/admin/analytics/ai-usage`
Analytics utilizzo AI

### 🔧 Admin Management

#### GET `/admin/users`
Lista tutti gli utenti (Admin)

#### PUT `/admin/users/{userId}/role`
Cambia ruolo utente (Admin)

#### GET `/admin/products`
Gestione prodotti (Admin)

#### POST `/admin/products`
Crea prodotto (Admin)

#### PUT `/admin/products/{productId}`
Aggiorna prodotto (Admin)

#### DELETE `/admin/products/{productId}`
Elimina prodotto (Admin)

### 🏭 Warehouse (Admin Only)

#### GET `/admin/warehouse/inventory`
Inventario completo

#### POST `/admin/warehouse/lots`
Crea nuovo lotto

#### GET `/admin/warehouse/pick-tasks`
Lista task picking

#### POST `/admin/warehouse/pick-tasks/{taskId}/complete`
Completa task picking

## 🔄 Webhooks

### Stripe Webhooks

#### POST `/webhooks/stripe`
Gestione eventi Stripe

**Events Supported:**
- `payment_intent.succeeded`
- `invoice.payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 📊 Rate Limiting

- **Free Users**: 100 richieste/ora
- **Premium Users**: 500 richieste/ora
- **Admin Users**: 2000 richieste/ora

## 🔍 Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dati non validi",
    "details": {
      "field": "email",
      "issue": "Formato email non valido"
    }
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Dati di input non validi
- `UNAUTHORIZED`: Token non valido o mancante
- `FORBIDDEN`: Permessi insufficienti
- `NOT_FOUND`: Risorsa non trovata
- `RATE_LIMIT_EXCEEDED`: Limite richieste superato
- `INTERNAL_ERROR`: Errore interno del server

## 🧪 Testing

### Test Environment
**Base URL**: `https://api-staging.piucane.it`

### Postman Collection
Disponibile collection Postman con tutti gli endpoint: [Download Collection](./postman-collection.json)

---

**🎯 IMPORTANTE**: Tutti gli endpoint devono rispettare i limiti GDPR e includere audit logging appropriato.