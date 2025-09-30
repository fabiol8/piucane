# Components Accessibility Documentation

Documentazione accessibilità dei componenti del design system PiùCane (`packages/ui`).

## Button Component

**Path**: `packages/ui/src/components/Button.tsx`

### Implementazione
```tsx
<Button
  variant="primary"
  size="md"
  disabled={false}
  aria-label="Aggiungi al carrello" // se icon-only
>
  Aggiungi al carrello
</Button>
```

### A11y features
- ✅ Semantic `<button>` element
- ✅ Keyboard accessible (Enter/Space)
- ✅ Focus visible (outline)
- ✅ Disabled state con `aria-disabled`
- ✅ Loading state con `aria-busy="true"`
- ✅ Touch target ≥44x44px

### Variants
- **Primary**: CTA principale (contrast ratio ≥4.5:1)
- **Secondary**: Azioni secondarie
- **Ghost**: Azioni terziarie
- **Destructive**: Azioni pericolose (delete)

---

## Input Component

**Path**: `packages/ui/src/components/Input.tsx`

### Implementazione
```tsx
<Input
  id="email"
  name="email"
  type="email"
  label="Email"
  required
  error="Email non valida"
  helperText="Inserisci la tua email"
/>
```

### A11y features
- ✅ Associated `<label for="id">`
- ✅ `aria-required="true"` se required
- ✅ `aria-invalid="true"` se error
- ✅ `aria-describedby` per helperText e error
- ✅ Visible focus indicator
- ✅ Autocomplete attributes (email, tel, etc.)

---

## Card Component

**Path**: `packages/ui/src/components/Card.tsx`

### Implementazione
```tsx
<Card
  as="article"
  heading="Product Name"
  headingLevel={3}
>
  <CardImage src="..." alt="Descrizione prodotto" />
  <CardContent>...</CardContent>
  <CardActions>
    <Button>Aggiungi</Button>
  </CardActions>
</Card>
```

### A11y features
- ✅ Semantic HTML (`<article>`)
- ✅ Heading hierarchy corretto
- ✅ Image alt text descrittivo
- ✅ Clickable area appropriata

---

## Modal/Dialog Component

**Path**: `packages/ui/src/components/Modal.tsx`

### Implementazione
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Conferma eliminazione"
  description="Sei sicuro di voler eliminare questo elemento?"
>
  <ModalContent>...</ModalContent>
</Modal>
```

### A11y features
- ✅ `role="dialog"` + `aria-modal="true"`
- ✅ `aria-labelledby` (title)
- ✅ `aria-describedby` (description)
- ✅ Focus trap dentro modal
- ✅ ESC key chiude modal
- ✅ Focus ritorna a trigger element
- ✅ Body scroll locked
- ✅ Backdrop dismiss con click

---

## Select/Dropdown Component

**Path**: `packages/ui/src/components/Select.tsx`

### Implementazione
```tsx
<Select
  id="breed"
  label="Razza del cane"
  options={breeds}
  value={selected}
  onChange={handleChange}
  required
/>
```

### A11y features
- ✅ Native `<select>` o custom con ARIA Combobox pattern
- ✅ Associated label
- ✅ Keyboard navigation (Arrow keys, Enter, ESC)
- ✅ `aria-expanded` state
- ✅ `aria-activedescendant` per option attiva

---

## Checkbox Component

**Path**: `packages/ui/src/components/Checkbox.tsx`

### Implementazione
```tsx
<Checkbox
  id="terms"
  label="Accetto termini e condizioni"
  required
  checked={accepted}
  onChange={handleCheck}
/>
```

### A11y features
- ✅ Native `<input type="checkbox">`
- ✅ Associated label (clickable)
- ✅ `aria-required` se required
- ✅ `aria-checked` state
- ✅ Focus visible
- ✅ Touch target ≥44x44px

---

## Radio Group Component

**Path**: `packages/ui/src/components/RadioGroup.tsx`

### Implementazione
```tsx
<RadioGroup
  name="payment"
  label="Metodo di pagamento"
  options={[
    { value: 'card', label: 'Carta di credito' },
    { value: 'paypal', label: 'PayPal' }
  ]}
  value={selected}
  onChange={handleChange}
/>
```

### A11y features
- ✅ `<fieldset>` + `<legend>`
- ✅ Native `<input type="radio">`
- ✅ Keyboard navigation (Arrow keys)
- ✅ Single tab stop (roving tabindex)
- ✅ `aria-checked` state

---

## Alert/Toast Component

**Path**: `packages/ui/src/components/Alert.tsx`

### Implementazione
```tsx
<Alert
  variant="success"
  title="Ordine confermato"
  message="Il tuo ordine è stato registrato"
  dismissible
/>
```

### A11y features
- ✅ `role="alert"` per messaggi urgenti
- ✅ `role="status"` per notifiche non urgenti
- ✅ `aria-live="polite"` o `"assertive"`
- ✅ Screen reader announce automatico
- ✅ Dismiss button accessibile

---

## Tabs Component

**Path**: `packages/ui/src/components/Tabs.tsx`

### Implementazione
```tsx
<Tabs defaultValue="profile">
  <TabsList aria-label="Sezioni profilo cane">
    <TabsTrigger value="profile">Profilo</TabsTrigger>
    <TabsTrigger value="health">Salute</TabsTrigger>
    <TabsTrigger value="orders">Ordini</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">...</TabsContent>
  <TabsContent value="health">...</TabsContent>
  <TabsContent value="orders">...</TabsContent>
</Tabs>
```

### A11y features
- ✅ ARIA Tabs pattern
- ✅ `role="tablist"`, `role="tab"`, `role="tabpanel"`
- ✅ `aria-selected` state
- ✅ `aria-controls` linking
- ✅ Keyboard navigation (Arrow keys, Home, End)
- ✅ Single tab stop (roving tabindex)

---

## Accordion Component

**Path**: `packages/ui/src/components/Accordion.tsx`

### Implementazione
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Quali ingredienti contiene?</AccordionTrigger>
    <AccordionContent>...</AccordionContent>
  </AccordionItem>
</Accordion>
```

### A11y features
- ✅ `<button>` trigger con `aria-expanded`
- ✅ `aria-controls` linking
- ✅ Keyboard navigation (Enter, Space)
- ✅ Single/Multiple expand modes
- ✅ Heading wrapper per SEO

---

## Tooltip Component

**Path**: `packages/ui/src/components/Tooltip.tsx`

### Implementazione
```tsx
<Tooltip content="Informazioni sul prodotto">
  <button>
    <InfoIcon aria-hidden="true" />
    <span className="sr-only">Info</span>
  </button>
</Tooltip>
```

### A11y features
- ✅ `role="tooltip"`
- ✅ `aria-describedby` sul trigger
- ✅ Show on hover + focus
- ✅ ESC key dismiss
- ✅ Non interactive content only

---

## Loading/Spinner Component

**Path**: `packages/ui/src/components/Loading.tsx`

### Implementazione
```tsx
<Loading
  label="Caricamento in corso"
  size="md"
/>
```

### A11y features
- ✅ `role="status"` o `role="progressbar"`
- ✅ `aria-live="polite"`
- ✅ `aria-label` descrittivo
- ✅ `aria-busy="true"` su container

---

## Best Practices Generali

### Color
- ❌ Non usare solo colore per comunicare info (es. errore = rosso + icona + testo)
- ✅ Verificare contrasto con Chrome DevTools

### Focus Management
- ✅ Mantenere focus order logico (DOM order)
- ✅ Custom focus indicator visibile (≥2px outline)
- ✅ Skip focus per elementi non interattivi

### ARIA Usage
- ✅ Native HTML semantic prima di ARIA
- ✅ No ARIA is better than bad ARIA
- ✅ Test con screen reader reale

### Screen Reader Testing
```bash
# macOS: VoiceOver
Cmd + F5

# Windows: NVDA (free)
https://www.nvaccess.org/download/

# Browser extension: ChromeVox
https://chrome.google.com/webstore (search "ChromeVox")
```

---

## Testing Checklist per ogni Component

- [ ] Keyboard navigation completa
- [ ] Focus visibile su tutti stati interattivi
- [ ] Screen reader announces correct info
- [ ] ARIA attributes corretti (validare con axe DevTools)
- [ ] Color contrast ≥4.5:1 (testo), ≥3:1 (UI)
- [ ] Touch target ≥44x44px (mobile)
- [ ] Responsive 320px → 1920px
- [ ] No ARIA errors in axe audit

---

## Resources
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Inclusive Components](https://inclusive-components.design/)
- [Radix UI Primitives](https://www.radix-ui.com/) (reference implementation)