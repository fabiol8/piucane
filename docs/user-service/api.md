# User Service API Documentation
**Versione:** v1.0 • **Ultimo aggiornamento:** 2025-09-30

## Base URL
```
Production: https://api.piucane.it
Staging: https://api-staging.piucane.it
Development: http://localhost:3002
```

## Authentication

Tutti gli endpoint protetti richiedono un token Firebase Auth nell'header:
```
Authorization: Bearer <firebase-id-token>
```

## Endpoints

### 1. Registrazione Utente

**POST** `/api/auth/register`

Registra un nuovo utente con Firebase Auth e crea il profilo in Firestore.

#### Request Body
```json
{
  "email": "utente@example.com",
  "password": "password123",
  "name": "Mario Rossi",
  "phone": "+393123456789",
  "gdprConsent": {
    "necessary": true,
    "analytics": false,
    "marketing": false,
    "personalization": false,
    "advertising": false
  },
  "termsAccepted": true,
  "privacyAccepted": true,
  "marketingConsent": false
}
```

#### Response 201 (Success)
```json
{
  "success": true,
  "message": "Utente registrato con successo",
  "userId": "firebase-user-id",
  "user": {
    "id": "firebase-user-id",
    "email": "utente@example.com",
    "name": "Mario Rossi",
    "role": "user"
  }
}
```

#### Response 400 (Validation Error)
```json
{
  "success": false,
  "error": "Dati non validi",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Email richiesta"
    }
  ]
}
```

#### Response 409 (Email Already Exists)
```json
{
  "success": false,
  "error": "Email già registrata"
}
```

---

### 2. Login Utente

**POST** `/api/auth/login`

Autentica un utente esistente e restituisce il profilo.

#### Headers Required
```
Authorization: Bearer <firebase-id-token>
```

#### Request Body
```json
{
  "email": "utente@example.com",
  "password": "password123"
}
```

#### Response 200 (Success)
```json
{
  "success": true,
  "user": {
    "id": "firebase-user-id",
    "email": "utente@example.com",
    "name": "Mario Rossi",
    "phone": "+393123456789",
    "preferences": {
      "emailNotifications": true,
      "pushNotifications": true,
      "smsNotifications": false,
      "marketingEmails": false,
      "language": "it",
      "currency": "EUR"
    },
    "role": "user",
    "status": "active",
    "createdAt": "2025-09-30T10:00:00.000Z"
  },
  "token": "firebase-id-token"
}
```

#### Response 401 (Unauthorized)
```json
{
  "success": false,
  "error": "Token di autenticazione richiesto"
}
```

---

### 3. Profilo Utente

**GET** `/api/auth/profile`

Ottiene il profilo dell'utente autenticato.

#### Headers Required
```
Authorization: Bearer <firebase-id-token>
```

#### Response 200 (Success)
```json
{
  "success": true,
  "user": {
    "id": "firebase-user-id",
    "email": "utente@example.com",
    "name": "Mario Rossi",
    "phone": "+393123456789",
    "preferences": {
      "emailNotifications": true,
      "pushNotifications": true,
      "smsNotifications": false,
      "marketingEmails": false,
      "language": "it",
      "currency": "EUR"
    },
    "role": "user",
    "status": "active",
    "createdAt": "2025-09-30T10:00:00.000Z",
    "updatedAt": "2025-09-30T11:30:00.000Z",
    "gdprConsent": {
      "necessary": true,
      "analytics": false,
      "marketing": false,
      "personalization": false,
      "advertising": false,
      "consentDate": "2025-09-30T10:00:00.000Z",
      "version": "1.0"
    }
  }
}
```

---

### 4. Aggiornamento Profilo

**PUT** `/api/auth/profile`

Aggiorna il profilo dell'utente autenticato.

#### Headers Required
```
Authorization: Bearer <firebase-id-token>
```

#### Request Body
```json
{
  "name": "Mario Rossi Aggiornato",
  "phone": "+393987654321",
  "preferences": {
    "emailNotifications": false,
    "language": "en"
  }
}
```

#### Response 200 (Success)
```json
{
  "success": true,
  "message": "Profilo aggiornato con successo"
}
```

---

### 5. Aggiornamento Consensi GDPR

**PUT** `/api/auth/consent`

Aggiorna le preferenze di consenso GDPR dell'utente.

#### Headers Required
```
Authorization: Bearer <firebase-id-token>
```

#### Request Body
```json
{
  "necessary": true,
  "analytics": true,
  "marketing": false,
  "personalization": true,
  "advertising": false
}
```

#### Response 200 (Success)
```json
{
  "success": true,
  "message": "Preferenze di consenso aggiornate"
}
```

---

### 6. Export Dati Utente (GDPR Art. 15)

**POST** `/api/auth/export`

Esporta tutti i dati dell'utente in formato JSON o CSV.

#### Headers Required
```
Authorization: Bearer <firebase-id-token>
```

#### Request Body
```json
{
  "includeProfile": true,
  "includeDogs": true,
  "includeOrders": true,
  "includeSubscriptions": true,
  "includeMessages": false,
  "includeAnalytics": false,
  "format": "json"
}
```

#### Response 200 (Success)
```json
{
  "success": true,
  "message": "Dati esportati con successo",
  "data": {
    "exportDate": "2025-09-30T12:00:00.000Z",
    "userId": "firebase-user-id",
    "format": "json",
    "profile": {
      "email": "utente@example.com",
      "name": "Mario Rossi",
      "createdAt": "2025-09-30T10:00:00.000Z"
    },
    "gdprConsent": {
      "necessary": true,
      "analytics": true,
      "consentDate": "2025-09-30T10:00:00.000Z"
    },
    "dogs": [
      {
        "id": "dog-id",
        "name": "Rex",
        "breed": "Labrador",
        "weight": 30
      }
    ],
    "orders": [],
    "subscriptions": []
  }
}
```

---

### 7. Eliminazione Account (GDPR Art. 17)

**DELETE** `/api/auth/account`

Elimina definitivamente l'account utente e tutti i dati associati.

#### Headers Required
```
Authorization: Bearer <firebase-id-token>
```

#### Response 200 (Success)
```json
{
  "success": true,
  "message": "Account eliminato con successo"
}
```

## Error Codes

### 400 Bad Request
- Dati di input non validi
- Parametri mancanti
- Formato JSON non valido

### 401 Unauthorized
- Token mancante o non valido
- Utente non autenticato
- Token scaduto

### 403 Forbidden
- Permessi insufficienti
- Operazione non consentita

### 404 Not Found
- Utente non trovato
- Risorsa non esistente

### 409 Conflict
- Email già registrata
- Conflitto di dati

### 429 Too Many Requests
- Rate limit superato (100 req/min)

### 500 Internal Server Error
- Errore server interno
- Errore database
- Errore servizio esterno

## Rate Limiting

Tutti gli endpoint sono soggetti a rate limiting:
- **100 richieste per minuto** per IP
- **10 registrazioni per ora** per IP
- **5 export dati per giorno** per utente

## Validation Schema

### User Registration
```typescript
{
  email: string (email format),
  password: string (min 8 characters),
  name: string (2-50 characters),
  phone?: string (E.164 format),
  gdprConsent: {
    necessary: boolean,
    analytics: boolean,
    marketing: boolean,
    personalization: boolean,
    advertising: boolean
  },
  termsAccepted: boolean (must be true),
  privacyAccepted: boolean (must be true),
  marketingConsent?: boolean
}
```

### Profile Update
```typescript
{
  name?: string (2-50 characters),
  phone?: string (E.164 format),
  preferences?: {
    emailNotifications?: boolean,
    pushNotifications?: boolean,
    smsNotifications?: boolean,
    marketingEmails?: boolean,
    language?: 'it' | 'en',
    currency?: 'EUR' | 'USD'
  }
}
```

## Security Headers

Tutte le risposte includono security headers:
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## Monitoring & Analytics

Ogni chiamata API viene tracciata per:
- Performance monitoring
- Error tracking
- Usage analytics
- Security monitoring

## Testing

### Postman Collection
```
https://api.piucane.it/docs/postman/user-service.json
```

### Swagger/OpenAPI
```
https://api.piucane.it/docs/user-service/swagger.json
```