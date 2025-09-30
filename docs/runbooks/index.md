# Runbooks — Index
**Owner:** DevOps + Backend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Runbooks operativi per gestione rilasci, incident response, rollback, monitoring, troubleshooting.

## Contenuti
- [release.md](./release.md) — Procedura rilascio produzione (deploy, smoke test, rollback)
- [incident.md](./incident.md) — Incident response playbook (detection, triage, resolution)

## Quick Links

### Emergency Contacts
- **On-call Engineer**: `@oncall` in Slack channel `#incidents`
- **Tech Lead**: fabio@piucane.it
- **DevOps**: devops@piucane.it

### Status Pages
- **Production**: https://status.piucane.it (Statuspage.io o custom)
- **Staging**: https://status-staging.piucane.it
- **Firebase Status**: https://status.firebase.google.com
- **Stripe Status**: https://status.stripe.com

### Monitoring Dashboards
- **Firebase Console**: https://console.firebase.google.com/project/piucane-prod
- **Cloud Logging**: https://console.cloud.google.com/logs (project: piucane-prod)
- **Sentry** (errors): https://sentry.io/organizations/piucane/
- **Lighthouse CI**: https://github.com/piucane/piucane/actions (performance)

## Runbook Categories

### 1. Deployment
- Release checklist (pre-deploy, deploy, post-deploy)
- Hotfix procedure (fast-track production fix)
- Rollback procedure (revert to previous version)
- Database migration (Firestore schema changes)

### 2. Incident Response
- Severity levels (P0-P4)
- Incident command roles (IC, Ops, Comms)
- Communication templates (internal + external)
- Post-mortem process

### 3. Monitoring & Alerts
- Alert rules configuration
- On-call rotation
- Escalation paths
- SLA/SLO definitions

### 4. Troubleshooting
- Common issues + resolution
- Debug procedures
- Log analysis
- Performance profiling

### 5. Maintenance
- Database backups
- Certificate renewal
- Dependency updates
- Security patches

## SLA Definitions

### Uptime Targets
- **Production (app.piucane.it)**: 99.9% uptime → Max 43 min downtime/mese
- **API (api.piucane.it)**: 99.9% uptime
- **Admin (admin.piucane.it)**: 99.5% uptime → Max 3.6 ore downtime/mese

### Response Times (API)
- **P50**: <200ms
- **P95**: <400ms
- **P99**: <800ms

### Error Rates
- **API**: <0.1% error rate (5xx)
- **Frontend**: <0.5% JS error rate

## Incident Severity Levels

### P0 — Critical (Immediate Response)
**Impact**: Total outage, no users can access site/API
**Examples**:
- App/API completamente down
- Database inaccessibile
- Payment processing broken (no checkout)
- Data breach / security incident

**Response**:
- 🔴 Page on-call engineer immediatamente
- 🔴 Incident Commander assigned
- 🔴 Status page updated: "Major Outage"
- 🔴 Resolution target: <1 ora

### P1 — High (Urgent)
**Impact**: Major feature broken, impacting >50% users
**Examples**:
- Login broken
- Checkout intermittent failures (>10% error rate)
- Email/Push notifications not sending
- Subscription renewals failing

**Response**:
- 🟠 Notify on-call engineer (Slack alert)
- 🟠 Status page updated: "Service Degradation"
- 🟠 Resolution target: <4 ore

### P2 — Medium (Important)
**Impact**: Minor feature broken, impacting <50% users
**Examples**:
- Search not working
- Image upload failures
- Single AI agent down (Vet/Educatore/Groomer)
- Admin dashboard slow

**Response**:
- 🟡 Create incident ticket (Jira/Linear)
- 🟡 Assign to relevant team
- 🟡 Resolution target: <24 ore

### P3 — Low (Routine)
**Impact**: Cosmetic issue, no functional impact
**Examples**:
- Styling issues
- Typos
- Minor UI bugs
- Non-critical warnings in logs

**Response**:
- 🟢 Create bug ticket
- 🟢 Prioritize in next sprint
- 🟢 Resolution target: <1 settimana

## On-Call Rotation

### Schedule
- **Primary**: 7-day rotation
- **Secondary**: Backup if primary non-reachable
- **Handoff**: Lunedì 09:00 CET

### Tools
- **PagerDuty** (o equivalente) per alerting
- **Slack** `#incidents` channel
- **Runbook** link: https://github.com/piucane/piucane/tree/main/docs/runbooks

### Escalation Path
1. **Primary On-Call** (5 min response time)
2. **Secondary On-Call** (se primary non risponde in 10 min)
3. **Tech Lead** (se nessuno risponde in 20 min)
4. **CTO** (se outage >1 ora)

## Communication Templates

### Internal (Slack `#incidents`)
```
🔴 **INCIDENT DETECTED** 🔴

**Severity**: P0 — Critical
**Component**: API (api.piucane.it)
**Impact**: Complete API outage, no users can place orders
**Started**: 2025-09-29 14:32 CET
**IC (Incident Commander)**: @fabio
**Status**: Investigating

**Updates**:
14:32 — Incident detected via Sentry alerts (5xx spike)
14:35 — IC assigned, investigating Cloud Run logs
14:40 — Root cause: Database connection pool exhausted
14:45 — Fix deployed: Increased connection pool size
14:50 — Monitoring recovery
15:00 — ✅ **RESOLVED** — API back to normal
```

### External (Status Page)
```
⚠️ Service Disruption — API

We're experiencing issues with our API that may affect
order placement and account access.

Started: 14:32 CET
Status: Investigating

We'll provide updates every 15 minutes.
```

## Post-Mortem Process

**Timeline**: Entro 48 ore da resolution

**Template**: `/docs/runbooks/post-mortem-template.md`

**Sections**:
1. **Summary**: Cosa è successo (1 paragraph)
2. **Timeline**: Eventi con timestamp
3. **Root Cause**: Perché è successo
4. **Impact**: Utenti affetti, downtime, revenue loss
5. **Resolution**: Come è stato risolto
6. **Prevention**: Action items per evitare ripetizione
7. **Lessons Learned**: Cosa abbiamo imparato

**Review Meeting**:
- Partecipanti: IC, Engineering team, Product
- Blameless (no finger-pointing)
- Focus su process improvement

## Health Checks

### Automated Monitoring

#### Uptime Monitoring
- **Pingdom** o **UptimeRobot**
- Check every 1 min
- Alert if down >2 min

#### Synthetic Tests
- **Playwright** scheduled checks (ogni 10 min)
- Critical user flows:
  - Homepage load
  - Login
  - Product view
  - Add to cart
  - Checkout (test mode)

#### Firebase Alerts
- **Error rate** >0.5% → Slack alert
- **P95 latency** >800ms → Slack alert
- **Storage quota** >80% → Email alert

### Manual Health Check

Run dopo ogni deploy:

```bash
# Staging
npm run health-check:staging

# Production
npm run health-check:prod
```

**Checklist**:
- [ ] Homepage loads (<2s)
- [ ] Login works
- [ ] API endpoints respond (<500ms)
- [ ] Database queries work
- [ ] Firestore rules enforced
- [ ] Email/Push sending
- [ ] Stripe webhooks receiving

## Backup & Recovery

### Firestore Backup
- **Automatic**: Daily full backup (Cloud Scheduler)
- **Retention**: 30 giorni
- **Location**: `gs://piucane-backups/firestore/YYYY-MM-DD/`

### Restore Procedure
```bash
# Export backup
gcloud firestore export gs://piucane-backups/firestore/2025-09-29/ --project=piucane-prod

# Import to recovery project
gcloud firestore import gs://piucane-backups/firestore/2025-09-29/ --project=piucane-recovery
```

### Code Rollback
```bash
# Via Firebase Hosting
firebase hosting:rollback --project=piucane-prod

# Via GitHub Actions
# 1. Revert commit
git revert HEAD
git push origin main

# 2. Re-trigger deploy workflow
# 3. Monitor deploy
```

## Security Incidents

### Procedure
1. **Detect**: Sentry alert, user report, security scan
2. **Assess**: Severità + data affected
3. **Contain**: Blocca accesso, revoca token, disable feature
4. **Investigate**: Logs, audit trail, attack vector
5. **Notify**: DPO → Garante (se breach GDPR)
6. **Remediate**: Patch vulnerability, rotate secrets
7. **Post-Mortem**: Security review + action items

### Common Security Issues

#### Exposed API Key
```bash
# Immediate actions
1. Revoke key in Firebase Console
2. Generate new key
3. Update GitHub Secrets
4. Re-deploy
5. Audit: chi ha usato la key esposta?
```

#### Suspicious Activity (Account)
```bash
# Check user audit logs
# Firestore: auditLogs/{uid}
1. Review recent logins (IP, location, device)
2. Check recent orders (fraudolenti?)
3. Freeze account temporaneamente
4. Contact user via email registrata
5. Require password reset + MFA
```

#### DDoS Attack
```bash
1. Cloud Armor (GCP) → Enable rate limiting
2. Cloudflare (se usato) → Enable "Under Attack" mode
3. Scale Cloud Run instances (auto-scaling)
4. Block malicious IPs in firewall rules
5. Contact GCP Support (enterprise plan)
```

## Useful Commands

### Firebase
```bash
# Deploy specific targets
firebase deploy --only hosting:app
firebase deploy --only firestore:rules
firebase deploy --only functions:apiServer

# Check deployment history
firebase hosting:channel:list

# View logs
firebase functions:log
```

### GCP
```bash
# Cloud Run logs
gcloud run logs read piucane-api --project=piucane-prod --limit=100

# Firestore export
gcloud firestore export gs://bucket/path --project=piucane-prod

# Check quotas
gcloud compute project-info describe --project=piucane-prod
```

### Monitoring
```bash
# Tail production logs (streaming)
gcloud logging tail --project=piucane-prod --filter="severity>=ERROR"

# Check error rate
gcloud logging read "severity=ERROR" --project=piucane-prod --limit=50 --format=json
```

## Resources

- [Google Cloud Incident Response](https://cloud.google.com/architecture/incident-response)
- [PagerDuty Incident Response Guide](https://response.pagerduty.com/)
- [Atlassian Post-Mortem Template](https://www.atlassian.com/incident-management/postmortem/templates)
- [SRE Book (Google)](https://sre.google/sre-book/table-of-contents/)

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-29 | DevOps Team | Initial runbooks documentation |

**Next review**: 2026-01-01 (quarterly)