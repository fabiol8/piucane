# Contributing to PiùCane

Grazie per il tuo interesse nel contribuire a PiùCane! 🐕

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Testing](#testing)

## Code of Conduct

Questo progetto aderisce al nostro [Code of Conduct](CODE_OF_CONDUCT.md). Partecipando, ti impegni a rispettare questi termini.

## Getting Started

### Prerequisites

- **Node.js**: ≥20.0.0
- **npm**: ≥10.0.0
- **Git**: Latest version
- **Firebase CLI**: `npm install -g firebase-tools`

### Setup Locale

```bash
# Clone repository
git clone https://github.com/piucane/piucane.git
cd piucane

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edita .env.local con le tue credenziali

# Start Firebase Emulators
npm run emulator

# Start dev server (in altro terminale)
npm run dev
```

## Development Workflow

### Branching Strategy

Usiamo **Git Flow**:

- `main` → Production (protetto)
- `develop` → Staging (protetto)
- `feat/[name]` → Nuove feature
- `fix/[name]` → Bug fix
- `docs/[name]` → Solo documentazione
- `refactor/[name]` → Refactoring
- `test/[name]` → Aggiunta test

### Branch Naming

```bash
# Good
feat/subscription-pause
fix/checkout-payment-error
docs/update-api-endpoints

# Bad
new-feature
fix
update-docs
```

### Workflow Type

1. **Crea branch** da `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/my-feature
   ```

2. **Sviluppa** con commit atomici e messaggi chiari

3. **Test** localmente:
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run test:e2e
   ```

4. **Push** e apri **Pull Request** verso `develop`

5. **Code Review** da almeno 1 reviewer

6. **Merge** dopo approvazione e CI green

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) {
    throw new Error(`User ${userId} not found`);
  }
  return doc.data() as UserProfile;
}

// ❌ Bad
async function getUser(id) {
  const doc = await db.collection('users').doc(id).get();
  return doc.data();
}
```

### React Components

```tsx
// ✅ Good - Functional component con TypeScript
import { FC } from 'react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export const ProductCard: FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <article className="product-card">
      <h3>{product.name}</h3>
      <p>{product.price}€</p>
      <button
        onClick={() => onAddToCart(product.id)}
        data-cta-id="product_card.add_to_cart.button.click"
      >
        Aggiungi al carrello
      </button>
    </article>
  );
};

// ❌ Bad - No types, inline styles, no CTA tracking
export default function Card({ data }) {
  return (
    <div style={{ padding: '20px' }}>
      <h3>{data.name}</h3>
      <button onClick={() => addToCart(data.id)}>Add</button>
    </div>
  );
}
```

### Naming Conventions

- **Files**: kebab-case (`product-card.tsx`, `user-profile.ts`)
- **Components**: PascalCase (`ProductCard`, `UserProfile`)
- **Functions**: camelCase (`getUserProfile`, `calculateTotal`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `OrderItem`)

### ESLint & Prettier

Il progetto usa ESLint + Prettier configurati. **NON disabilitare** le regole senza discussione team.

```bash
# Auto-fix linting
npm run lint:fix

# Format code
npm run format
```

## Commit Guidelines

Usiamo **Conventional Commits**:

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types

- `feat`: Nuova feature
- `fix`: Bug fix
- `docs`: Solo documentazione
- `style`: Formatting, missing semi-colons, etc (no code change)
- `refactor`: Refactoring (no feature, no fix)
- `perf`: Performance improvement
- `test`: Aggiunta/modifica test
- `chore`: Build, tooling, dependencies

### Examples

```bash
# Good
feat(subscriptions): add pause subscription feature
fix(checkout): resolve Stripe payment intent error
docs(api): update endpoints documentation
test(e2e): add checkout flow test

# Bad
added new feature
fix bug
update
WIP
```

### Commit Message Body

Per commit complessi, aggiungi body esplicativo:

```
feat(subscriptions): add pause subscription feature

Allow users to pause their subscription for 30, 60, or 90 days.
Paused subscriptions will not be charged during the pause period.

- Add pause UI in /subscriptions page
- Implement pause API endpoint
- Update Stripe subscription to pause_collection
- Add tests for pause flow

Closes #123
```

## Pull Request Process

### PR Checklist

Prima di aprire PR, verifica:

- [ ] Codice compila senza errori (`npm run build`)
- [ ] Type check passa (`npm run type-check`)
- [ ] Lint passa (`npm run lint`)
- [ ] Unit tests passano (`npm run test`)
- [ ] E2E tests passano se applicabile (`npm run test:e2e`)
- [ ] Accessibilità verificata (`npm run test:a11y`)
- [ ] Documentazione aggiornata (se applicabile)
- [ ] CTA tracking aggiunti (se UI change)
- [ ] GA4 events mappati (se nuova feature)
- [ ] Discovery Log aggiornato (se decisione tecnica)

### PR Template

Il progetto usa `.github/PULL_REQUEST_TEMPLATE.md`. Compilalo completamente.

### PR Title

Stessa convenzione dei commit:

```
feat(subscriptions): add pause subscription feature
fix(checkout): resolve payment error on Safari
```

### Review Process

1. **Self-review**: Rileggi il tuo codice prima di richiedere review
2. **Request reviewers**: Almeno 1 reviewer, 2 per change critici
3. **Address feedback**: Rispondi a tutti i commenti
4. **Resolve conversations**: Marca conversations resolved dopo fix
5. **CI must pass**: Tutti i check devono essere green

### Merge Strategy

- **Squash and merge** per feature branches (default)
- **Rebase and merge** per hotfix (mantiene storia lineare)
- **NO merge commits** su main/develop

## Documentation

### Quando Aggiornare Docs

**SEMPRE aggiorna docs quando**:
- ✅ Aggiungi nuova feature
- ✅ Modifichi API endpoint
- ✅ Cambi behavior esistente
- ✅ Aggiungi nuovo CTA tracking
- ✅ Modifichi GA4 events
- ✅ Prendi decisione architettuale (ADR)

### Docs Structure

```
docs/
├── index.md (TOC)
├── area/
│   ├── index.md (area overview)
│   └── feature.md (specific doc)
└── adr/
    └── ADR-YYYYMMDD-decision.md
```

### Writing Style

- **Conciso**: Breve e al punto
- **Chiaro**: No jargon inutile
- **Esempi**: Include code examples
- **Aggiornato**: Data ultimo aggiornamento in header

## Testing

### Test Coverage Requirements

- **Overall**: ≥80% lines, ≥80% branches
- **New code**: ≥85% coverage

```bash
# Run all tests with coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Unit Tests

**Posizione**: `__tests__/unit/` accanto al file testato

```typescript
// calculateCadence.spec.ts
import { calculateCadenceDays } from './calculateCadence';

describe('calculateCadenceDays', () => {
  it('calculates 28 days for 25kg dog with 12kg bag', () => {
    const dog = { weight: 25, bcs: 5, activityLevel: 'moderate' };
    const product = { weightGrams: 12000 };

    const cadence = calculateCadenceDays(dog, product);

    expect(cadence).toBe(28);
  });

  it('clamps to minimum 14 days', () => {
    const dog = { weight: 40, bcs: 5, activityLevel: 'high' };
    const product = { weightGrams: 3000 };

    const cadence = calculateCadenceDays(dog, product);

    expect(cadence).toBeGreaterThanOrEqual(14);
  });
});
```

### E2E Tests

**Posizione**: `__tests__/e2e/`

```typescript
// checkout.spec.ts
import { test, expect } from '@playwright/test';

test('complete checkout flow', async ({ page }) => {
  await page.goto('/shop');
  await page.click('[data-testid="product-card"]:first-child');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout-button"]');

  // ... Stripe test mode

  await expect(page).toHaveURL('/checkout/success');
});
```

### Accessibility Tests

```typescript
import AxeBuilder from '@axe-core/playwright';

test('homepage is accessible', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations.filter(v =>
    ['critical', 'serious'].includes(v.impact!)
  )).toHaveLength(0);
});
```

## Analytics & Tracking

### CTA Tracking

Ogni elemento interattivo **DEVE** avere `data-cta-id`:

```tsx
<button
  data-cta-id="pdp.add_to_cart.button.click"
  onClick={handleAddToCart}
>
  Aggiungi al carrello
</button>
```

Registra in `docs/cta/registry.json`:

```json
{
  "id": "pdp.add_to_cart.button.click",
  "ga4_event": "add_to_cart",
  "params": ["product_id", "quantity"]
}
```

### GA4 Events

Usa wrapper `trackEvent`:

```typescript
import { trackEvent } from '@/analytics/ga4';

trackEvent('add_to_cart', {
  currency: 'EUR',
  value: product.price,
  items: [{
    item_id: product.id,
    item_name: product.name
  }]
});
```

Documenta in `docs/analytics/ga4-events.md`.

## Security

### Secrets

**MAI** committare secrets:
- ❌ API keys
- ❌ Firebase config con valori reali
- ❌ Stripe secret keys
- ❌ Database passwords

Usa `.env.local` (git-ignored) o GitHub Secrets.

### Dependencies

```bash
# Audit before commit
npm audit

# Fix vulnerabilities
npm audit fix
```

## Questions?

- **Docs**: Leggi `/docs/` per info dettagliate
- **Slack**: Chiedi in `#dev-piucane` channel
- **Email**: tech@piucane.it per domande private

---

Grazie per contribuire a PiùCane! 🐕❤️