# Accessibility Checklist — WCAG 2.2 AA

## Perceivable (Percepibile)

### 1.1 Text Alternatives
- [ ] Tutte le immagini hanno `alt` text descrittivo
- [ ] Immagini decorative hanno `alt=""` o `role="presentation"`
- [ ] Icone funzionali hanno label accessibili (`aria-label` o text visually-hidden)
- [ ] Logo ha alt text appropriato

### 1.2 Time-based Media
- [ ] Video hanno sottotitoli (captions)
- [ ] Video hanno trascrizioni testuali
- [ ] Audio hanno trascrizioni testuali

### 1.3 Adaptable
- [ ] Heading hierarchy corretta (h1 → h2 → h3, no skip)
- [ ] Landmark regions definite (`<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] Liste semantiche (`<ul>`, `<ol>`, `<dl>`)
- [ ] Tabelle dati con `<th>` e `scope`
- [ ] Form labels associati correttamente (`<label for="id">`)

### 1.4 Distinguishable
- [ ] Contrasto colore testo ≥4.5:1 (testo normale)
- [ ] Contrasto colore testo ≥3:1 (testo large ≥18pt o bold ≥14pt)
- [ ] Contrasto UI components/stati ≥3:1
- [ ] Testo ridimensionabile fino a 200% senza perdita contenuto
- [ ] Nessun testo in immagini (eccetto logo)
- [ ] Audio in background ≤20dB sotto voce principale

## Operable (Utilizzabile)

### 2.1 Keyboard Accessible
- [ ] Tutte le funzioni accessibili da tastiera
- [ ] Nessuna keyboard trap
- [ ] Focus visibile su tutti gli elementi interattivi
- [ ] Ordine di tabulazione logico (`tabindex` appropriati)
- [ ] Shortcuts non confliggono con screen reader

### 2.2 Enough Time
- [ ] Timer adjustable/estendibili/disattivabili
- [ ] Pause/Stop per contenuti in movimento
- [ ] Auto-update content può essere disabilitato
- [ ] Session timeout con warning ≥20 secondi prima

### 2.3 Seizures
- [ ] Nessun flash >3 volte al secondo
- [ ] Animazioni riducibili con `prefers-reduced-motion`

### 2.4 Navigable
- [ ] Skip link per saltare a contenuto principale
- [ ] Page title descrittivo (`<title>`)
- [ ] Focus order logico
- [ ] Link text descrittivo (no "click here")
- [ ] Multiple ways to find pages (menu, search, sitemap)
- [ ] Headings e labels descrittivi
- [ ] Focus visibile chiaramente indicato

### 2.5 Input Modalities
- [ ] Touch target size ≥44x44px (mobile)
- [ ] Gesture alternative (no only swipe/pinch)
- [ ] Label in name (visible label contenuto in accessible name)
- [ ] Motion actuation alternative

## Understandable (Comprensibile)

### 3.1 Readable
- [ ] Lang attribute su `<html lang="it">`
- [ ] Lang changes markup con `lang="xx"` inline
- [ ] Linguaggio semplice (livello B1/B2)

### 3.2 Predictable
- [ ] Focus non cambia contesto automaticamente
- [ ] Input non cambia contesto automaticamente (eccetto submit)
- [ ] Navigazione consistente tra pagine
- [ ] Componenti identificati consistentemente

### 3.3 Input Assistance
- [ ] Error messages descrittivi
- [ ] Label o instructions per input
- [ ] Error suggestions fornite
- [ ] Validazione lato client con feedback accessibile
- [ ] Confirmation per azioni critiche (delete, submit payment)
- [ ] Input review/edit before submit

## Robust (Robusto)

### 4.1 Compatible
- [ ] HTML valido (no parsing errors critici)
- [ ] ID unici nella pagina
- [ ] ARIA attributes corretti (validi per ruolo)
- [ ] Status messages con `role="status"` o `role="alert"`
- [ ] Compatibility con assistive technologies

## Componenti comuni PiùCane

### Navigation
- [ ] Main nav con `<nav aria-label="Menu principale">`
- [ ] Mobile menu togglabile da tastiera
- [ ] Active page indicata visivamente e semanticamente

### Forms
- [ ] Tutti i campi con `<label>`
- [ ] Required fields indicati (`aria-required="true"`)
- [ ] Error messages con `aria-describedby` o `aria-live`
- [ ] Success feedback accessibile

### Modals
- [ ] Focus trap dentro modal
- [ ] Close con ESC key
- [ ] Focus return dopo chiusura
- [ ] `role="dialog"` e `aria-modal="true"`
- [ ] `aria-labelledby` e `aria-describedby`

### Product Catalog
- [ ] Product cards con heading semantico
- [ ] Prezzi formattati semanticamente
- [ ] "Aggiungi carrello" button accessibile
- [ ] Filtri form accessibili

### Checkout
- [ ] Multi-step con heading chiaro
- [ ] Progress indicator accessibile
- [ ] Payment form 100% accessibile
- [ ] Error handling robusto

### Chat AI
- [ ] Message list con `role="log"` o `aria-live="polite"`
- [ ] Typing indicator accessibile
- [ ] File upload accessibile

## Testing workflow

1. **Automated tests**: `npm run test:a11y` (axe-core)
2. **Lighthouse CI**: Audit ogni PR (soglia ≥90)
3. **Manual keyboard testing**: Tab navigation, focus visibile
4. **Screen reader testing**: NVDA (Windows), VoiceOver (macOS/iOS)
5. **Color contrast**: Chrome DevTools o Contrast Checker
6. **Responsive testing**: 320px → 1920px width

## Resources
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Deque University](https://dequeuniversity.com/)