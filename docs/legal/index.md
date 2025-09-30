# Legal & Compliance — Index
**Owner:** Legal Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Documentazione legale e compliance: privacy policy, terms of service, cookie policy, GDPR compliance, diritti utenti.

## Contenuti
- [privacy.md](./privacy.md) — Privacy Policy completa (GDPR compliant)
- [terms.md](./terms.md) — Terms of Service / Termini e Condizioni d'Uso
- [cookie-policy.md](./cookie-policy.md) — Cookie Policy (vedi anche `/docs/cmp/cookie-policy.md`)

## Requisiti GDPR

### Principi Chiave
- **Lawfulness**: Base giuridica per ogni trattamento (consent, contract, legitimate interest)
- **Purpose Limitation**: Dati raccolti solo per scopi specifici dichiarati
- **Data Minimization**: Solo dati strettamente necessari
- **Accuracy**: Dati aggiornati e corretti
- **Storage Limitation**: Conservati solo per il tempo necessario
- **Integrity & Confidentiality**: Sicurezza dati

### Diritti Utente (Art. 12-23)
- ✅ **Accesso** (Art. 15): Copia dati personali
- ✅ **Rettifica** (Art. 16): Correzione dati inesatti
- ✅ **Cancellazione** (Art. 17): "Right to be forgotten"
- ✅ **Limitazione** (Art. 18): Blocco trattamento
- ✅ **Portabilità** (Art. 20): Esportazione dati strutturati
- ✅ **Opposizione** (Art. 21): Opt-out marketing
- ✅ **Decisioni automatizzate** (Art. 22): No profiling senza consenso

### Implementazione API
**Endpoints**: `/api/user/privacy/`
- `GET /export` → Download JSON con tutti i dati utente
- `DELETE /delete-account` → Cancellazione completa (con conferma)
- `POST /data-correction` → Richiesta rettifica dati
- `POST /opt-out-marketing` → Revoca consenso marketing

## Cookie & Consent

Vedi documentazione dettagliata:
- [CMP Index](/docs/cmp/index.md)
- [Cookie Policy](/docs/cmp/cookie-policy.md)
- [Scripts Matrix](/docs/cmp/scripts-matrix.md)

### Consent Categories
- **Necessary**: Always active (essenziali)
- **Functional**: Opt-in (preferenze UI)
- **Analytics**: Opt-in (statistiche anonime)
- **Marketing**: Opt-in (ads personalizzati)

## Privacy by Design

### Anonimizzazione
- **IP addresses**: Anonimizzati in GA4 (`anonymize_ip: true`)
- **User IDs**: Hash SHA-256 per analytics
- **Email logs**: Truncate after 90 giorni

### Encryption
- **At rest**: Firestore encryption automatica (Google-managed keys)
- **In transit**: TLS 1.3 obbligatorio
- **Sensitive fields**: Firestore Security Rules + Client-side encryption per dati medici cane

### Access Control
- **RBAC**: Admin roles (super_admin, editor, viewer)
- **MFA**: Obbligatorio per admin
- **Audit logs**: Firestore collection `auditLogs/` con timestamp + userId + action

## Data Retention

| Data Type | Retention Period | Basis |
|-----------|------------------|-------|
| Account attivo | Finché account esiste | Contract |
| Account cancellato | 30 giorni (recovery period) | Legitimate interest |
| Ordini | 10 anni | Legal obligation (fiscale) |
| Consent records | 3 anni | Legal obligation (GDPR Art. 7) |
| Analytics (anonima) | 26 mesi | Legitimate interest |
| Email logs | 90 giorni | Legitimate interest |
| Chat logs (AI) | 2 anni (anonimizzati) | Quality assurance |

### Auto-deletion Job
**Cloud Scheduler**: `0 3 * * *` (03:00 ogni giorno)
```ts
// api/src/jobs/data-retention.ts
export async function runDataRetention() {
  // Delete cancelled accounts >30 days
  await deleteOldAccounts(30);

  // Anonymize old chat logs >2 years
  await anonymizeChatLogs(730);

  // Truncate email logs >90 days
  await truncateEmailLogs(90);
}
```

## Third-Party Processors

| Provider | Service | Data Processed | DPA Signed | Location |
|----------|---------|----------------|------------|----------|
| Google Firebase | Hosting, DB, Auth | All app data | ✅ Yes | EU (europe-west1) |
| Stripe | Payments | Payment info | ✅ Yes | EU + USA (SCC) |
| SendGrid | Transactional emails | Email, name | ✅ Yes | USA (SCC) |
| Twilio | WhatsApp, SMS | Phone, messages | ✅ Yes | USA (SCC) |
| Google (Gemini AI) | AI consultants | Chat messages | ✅ Yes | USA (SCC) |
| Meta | Pixel tracking | Behavioral data | ⚠️ Via consent | USA (DPF) |

**SCC** = Standard Contractual Clauses (EU-approved)
**DPF** = Data Privacy Framework (EU-US)

## Breach Notification

### Procedure (GDPR Art. 33-34)
1. **Detection** → Security team notified
2. **Assessment** → Severity + impact analysis
3. **Containment** → Stop breach, secure systems
4. **Notification Garante**: Entro **72 ore** se rischio per diritti utenti
5. **Notification Users**: Se rischio **alto** per diritti utenti
6. **Documentation**: Registro breaches in `docs/security/breach-log.md`

### Template Notification (Users)
```
Subject: Importante: Notifica di sicurezza PiùCane

Gentile [Nome],

Ti informiamo che il [DATA] è stato rilevato un incidente di sicurezza
che ha coinvolto i tuoi dati personali.

**Dati coinvolti**: [Descrizione]
**Azioni intraprese**: [Misure di sicurezza]
**Cosa puoi fare**: [Raccomandazioni]

Per domande: privacy@piucane.it

PiùCane Team
```

## Garante Privacy (Italia)

### Contatti
- **Website**: [garanteprivacy.it](https://www.garanteprivacy.it)
- **Email**: garante@gpdp.it
- **PEC**: protocollo@pec.gpdp.it
- **Phone**: +39 06 696771

### Notifications Required
- ✅ Nomina DPO (Data Protection Officer)
- ✅ Cookie Policy pubblicata e accessibile
- ✅ Privacy Policy pubblicata
- ⚠️ Breach notification entro 72h (se applicable)
- ⚠️ DPIA (Data Protection Impact Assessment) se trattamenti ad alto rischio

## DPO (Data Protection Officer)

**Email**: dpo@piucane.it
**Responsabilità**:
- Monitoraggio compliance GDPR
- Training team su privacy
- Punto contatto con Garante
- DPIA review e approval
- Gestione richieste utenti (Art. 15-22)

## Documentazione Admin

**Path**: `/apps/admin/src/modules/legal/`

### Funzionalità Admin
- [ ] **Privacy requests dashboard**: Visualizza richieste utenti (export, delete, rettifica)
- [ ] **Consent audit**: Log consensi per utente
- [ ] **DPA manager**: Upload/versioning DPA con third-parties
- [ ] **Breach log**: Registro incident con workflow notifica
- [ ] **Policy editor**: WYSIWYG per Privacy/Terms/Cookie policy

## Testing Compliance

### GDPR Compliance Checklist
- [ ] Privacy Policy published e updated
- [ ] Cookie banner blocks scripts senza consenso
- [ ] Utente può export dati (JSON)
- [ ] Utente può delete account
- [ ] Utente può opt-out marketing
- [ ] DPO contatto published
- [ ] Data retention policy rispettata
- [ ] Breach notification procedure defined
- [ ] DPA signed con tutti i processors

### Manual Testing
1. **Export data**: Login → Account → Privacy → Download my data
2. **Delete account**: Verify tutti i dati vengono cancellati (30 giorni)
3. **Opt-out**: Verify no più email marketing dopo opt-out
4. **Cookie consent**: Verify GA4/Pixel non caricano senza consenso

## Useful Links

- [GDPR Official Text](https://gdpr-info.eu/)
- [Garante Privacy (IT)](https://www.garanteprivacy.it/)
- [ICO GDPR Guide (UK)](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [EDPB Guidelines](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en)
- [Google GDPR Resources](https://privacy.google.com/businesses/compliance/)

## Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-09-29 | Initial legal documentation |

**Next review**: 2026-03-29 (every 6 months)