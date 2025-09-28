# Pull Request - PiùCane

## 📝 Descrizione
<!-- Descrivi brevemente le modifiche apportate in questo PR -->

## 🔗 Issue Collegato
<!-- Collega l'issue GitHub se presente -->
Closes #

## 🧪 Tipo di Cambiamento
<!-- Seleziona il tipo di cambiamento -->
- [ ] 🐛 Bug fix (non-breaking change che risolve un problema)
- [ ] ✨ Nuova feature (non-breaking change che aggiunge funzionalità)
- [ ] 💥 Breaking change (fix o feature che causano incompatibilità)
- [ ] 📝 Documentazione (aggiornamento della documentazione)
- [ ] 🎨 Refactoring (miglioramento del codice senza cambiare funzionalità)
- [ ] ⚡ Performance (miglioramento delle performance)

## ✅ Checklist PROMPTMASTER - Pre-Merge

### 🔧 Qualità del Codice
- [ ] Il codice compila senza errori (`npm run build`)
- [ ] I test unitari passano (`npm run test`)
- [ ] I test E2E passano (`npm run test:e2e`)
- [ ] Il linting passa senza errori (`npm run lint`)
- [ ] TypeScript non ha errori (`npm run type-check`)

### 🎯 CTA & Analytics (Sezioni 4-7 PROMPTMASTER)
- [ ] Tutti i nuovi CTA hanno `data-cta-id` appropriati
- [ ] Il registry CTA è aggiornato (`docs/cta/registry.json`)
- [ ] Gli eventi GA4 sono mappati correttamente
- [ ] La documentazione GA4 è aggiornata (`docs/analytics/ga4-events.md`)
- [ ] Nessuna CTA senza mappatura eventi

### ♿ Accessibilità & Performance (Sezione 15 PROMPTMASTER)
- [ ] I test di accessibilità (axe) passano
- [ ] Lighthouse score: PWA ≥90, A11y ≥90
- [ ] Le performance non sono peggiorate
- [ ] Componenti WCAG 2.2 AA compliant

### 🔒 Sicurezza & Privacy (Sezione 15 PROMPTMASTER)
- [ ] Non ci sono chiavi API o segreti hardcoded
- [ ] Le Firestore rules sono testate (se applicabile)
- [ ] Il CMP è conforme (se applicabile)
- [ ] Non ci sono vulnerabilità di sicurezza introdotte
- [ ] CSP/HSTS/CORS headers configurati

### 📚 Documentazione (Sezione 17 PROMPTMASTER)
- [ ] I file `docs/index.md` sono aggiornati
- [ ] Il README Discovery Log è aggiornato
- [ ] Gli ADR sono creati per decisioni architetturali significative
- [ ] Gli esempi di codice sono funzionanti

### 🗄️ Schema & Database
- [ ] Le migrazioni Firestore sono incluse (se applicabile)
- [ ] Gli schema Zod sono aggiornati
- [ ] I tipi TypeScript sono esportati correttamente
- [ ] Le Firestore rules sono testate

## 🧪 Come Testare
<!-- Descrivi come testare le modifiche -->

1. Clona il branch: `git checkout feature/branch-name`
2. Installa le dipendenze: `npm install`
3. Avvia il dev server: `npm run dev`
4. Testa i seguenti scenari:
   - [ ] Scenario 1
   - [ ] Scenario 2
   - [ ] Scenario 3

## 📱 Test su Dispositivi
<!-- Seleziona i dispositivi su cui hai testato -->
- [ ] Desktop (Chrome)
- [ ] Desktop (Firefox)
- [ ] Desktop (Safari)
- [ ] Mobile (iOS Safari)
- [ ] Mobile (Android Chrome)

## 📊 Impact Assessment

### Performance
- Bundle size: 📈📉⚪ (increase/decrease/unchanged)
- Load time: 📈📉⚪ (slower/faster/unchanged)
- Memory usage: 📈📉⚪ (more/less/unchanged)

### Breaking Changes
<!-- Elenca tutti i breaking changes -->
- [ ] Nessun breaking change
- [ ] Breaking change: [descrizione]

### Database Changes
<!-- Elenca le modifiche al database -->
- [ ] Nessuna modifica al database
- [ ] Nuove collezioni Firestore
- [ ] Modifiche allo schema esistente
- [ ] Migrazioni richieste

## 📸 Screenshots/Video
<!-- Aggiungi screenshots o video se le modifiche riguardano la UI -->

## 🚀 Deploy Notes
<!-- Note specifiche per il deployment -->
- [ ] Richiede variabili d'ambiente aggiuntive
- [ ] Richiede setup Firebase
- [ ] Richiede comunicazione agli utenti

## 🔍 Checklist Revisore

### Conformità PROMPTMASTER
- [ ] Il codice rispetta l'architettura definita nel PROMPTMASTER
- [ ] Le convenzioni di naming sono rispettate
- [ ] I pattern utilizzati sono coerenti
- [ ] La separazione delle responsabilità è rispettata

---

**🎯 IMPORTANTE**: Questo PR deve essere conforme al 100% al PROMPTMASTER per essere approvato.