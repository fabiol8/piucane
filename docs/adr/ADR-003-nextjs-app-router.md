# ADR-003: Next.js 14 con App Router

**Status**: ✅ Accepted
**Date**: 2025-01-25
**Deciders**: Tech Lead, Frontend Team
**Technical Story**: #24

---

## Context

Necessità di scegliere un framework frontend per PiùCane che supporti:
- **PWA** (Progressive Web App) con offline support
- **SEO** ottimale per pagine pubbliche (prodotti, blog)
- **SSR** (Server-Side Rendering) per performance
- **React** come UI library (preferenza team)
- **TypeScript** first-class support
- **Edge deployment** per latenza bassa

**Alternatives considerate**:
1. **Next.js 14 (App Router)**
2. **Next.js (Pages Router)**
3. **Remix**
4. **Astro** (+ React Islands)
5. **Create React App + Vite**

---

## Decision

Adottiamo **Next.js 14** con **App Router** per entrambe le app (web + admin).

**Motivazioni chiave**:
- ✅ React Server Components (RSC)
- ✅ Streaming SSR
- ✅ File-based routing nested
- ✅ Built-in API routes
- ✅ Image optimization
- ✅ Deployment Vercel optimized
- ✅ TypeScript ottimo

---

## Rationale

### ✅ Pro Next.js 14 App Router

1. **React Server Components (RSC)**
   - Componenti server-only (no JS inviato al client)
   - Perfetto per data fetching (Firestore nel server component)
   - Riduce bundle size del 40-60%

   ```tsx
   // Server Component (default in App Router)
   async function ProductPage({ params }) {
     // Firestore query direttamente nel component
     const product = await getProduct(params.id);
     return <ProductDetail product={product} />;
   }
   ```

2. **Streaming SSR**
   - Pagine renderate progressivamente
   - Suspense boundaries per loading states
   - Time to First Byte (TTFB) <100ms

   ```tsx
   <Suspense fallback={<Skeleton />}>
     <ProductReviews productId={id} />
   </Suspense>
   ```

3. **File-Based Routing Migliorato**
   - Layout nidificati condivisi
   - Loading/error states co-locati
   - Parallel routes

   ```
   app/
   ├── layout.tsx        # Root layout
   ├── page.tsx          # Home
   ├── shop/
   │   ├── layout.tsx    # Shop layout
   │   ├── page.tsx      # Shop index
   │   └── products/
   │       └── [id]/
   │           ├── page.tsx     # Product detail
   │           ├── loading.tsx  # Loading state
   │           └── error.tsx    # Error boundary
   ```

4. **SEO Nativo**
   - Metadata API type-safe
   - Sitemap generation automatico
   - OpenGraph + Twitter Cards built-in

   ```tsx
   export const metadata: Metadata = {
     title: 'Product Name',
     description: '...',
     openGraph: {
       images: ['/og-image.jpg']
     }
   };
   ```

5. **Performance Optimization**
   - Automatic Code Splitting (per route)
   - Image optimization (`next/image`)
   - Font optimization (`next/font`)
   - Script optimization (`next/script`)

6. **Edge Runtime**
   - Deploy su Vercel Edge Network
   - Cold start <10ms (vs ~1s Lambda)
   - Middleware per auth, redirects, A/B test

7. **Developer Experience**
   - Fast Refresh (<1s)
   - TypeScript errors in browser overlay
   - Turbopack (Rust bundler) per dev speed
   - Ottima documentazione

### ❌ Contro Next.js App Router

1. **Curva Apprendimento**
   - App Router diverso da Pages Router (mental model)
   - Server vs Client Components confusione iniziale
   - **Mitigation**: Training team (2 settimane), docs interne

2. **Ecosystem Immaturo**
   - App Router rilasciato Q2 2023 (relativamente nuovo)
   - Alcuni package non compatibili (es. libraries client-only)
   - **Mitigation**: Usare `'use client'` per fallback

3. **Caching Aggressivo**
   - Fetch requests cached by default (confusing)
   - Revalidation tags complessi
   - **Mitigation**: Documentare caching strategy chiara

4. **Lock-in Vercel**
   - Next.js ottimizzato per Vercel (image optimization, edge)
   - Self-hosting possibile ma perde features
   - **Mitigation**: Accettabile, Vercel è best hosting per Next.js

---

## Alternatives Considered

### Option 2: Next.js Pages Router

**Pro**:
- Maturo, stabile, testato in prod (2016)
- Ecosystem vastissimo
- Mental model più semplice

**Contro**:
- No React Server Components
- No Streaming SSR
- No layout nidificati
- Future di Next.js è App Router

**Verdict**: ❌ Rejected - Investire in Pages Router sarebbe legacy code in 1-2 anni

---

### Option 3: Remix

**Pro**:
- Ottimo data loading (loader/action pattern)
- Nested routing eccellente
- Form handling nativo
- Edge-ready

**Contro**:
- Ecosystem più piccolo
- No image optimization nativa
- No RSC (ancora)
- Team meno familiare con Remix

**Verdict**: ❌ Rejected - Next.js ha momentum maggiore e più features

---

### Option 4: Astro (+ React Islands)

**Pro**:
- Zero JS by default (ottimo per SEO)
- Multi-framework (React, Vue, Svelte)
- Content-focused (perfetto per blog)

**Contro**:
- Non adatto per app interattive (chat, dashboard)
- No real-time support
- Isole di React invece di SPA fluida

**Verdict**: ❌ Rejected - PiùCane è app-heavy, non content-focused

---

### Option 5: CRA + Vite

**Pro**:
- Full control su setup
- SPA classica (no SSR complexity)
- Vite velocissimo in dev

**Contro**:
- No SSR (bad for SEO)
- No image optimization
- No API routes (serve backend separato)
- Bundle size più grande (no code splitting automatico)

**Verdict**: ❌ Rejected - Manca troppo out-of-the-box

---

## Consequences

### Positive

1. ✅ **Bundle Size -50%**: RSC riducono JS inviato al client
2. ✅ **SEO Optimal**: SSR nativo + metadata API
3. ✅ **Developer Productivity**: File-based routing + TypeScript + Fast Refresh
4. ✅ **Performance**: Streaming SSR + Image optimization + Code splitting
5. ✅ **Future-Proof**: Next.js continuerà a ricevere features da React team

### Negative

1. ⚠️ **Learning Curve**: Team deve imparare Server Components (2-3 settimane)
2. ⚠️ **Caching Complexity**: Default caching può causare bugs se non compreso
3. ⚠️ **Debugging Harder**: Server components non visibili in DevTools
4. ⚠️ **Ecosystem Gaps**: Alcuni packages richiedono `'use client'` wrapper

### Neutral

1. 🔵 **Vercel Coupling**: Accettabile, Vercel è ottimo hosting
2. 🔵 **Node.js Required**: SSR richiede Node.js runtime (Vercel gestisce)

---

## Implementation

### Project Structure

```
apps/web/                       # User-facing app
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── shop/
│   │   ├── chat/
│   │   ├── onboarding/
│   │   └── api/                # API routes
│   │       └── webhooks/
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI (from @piucane/ui)
│   │   ├── shop/
│   │   └── layout/
│   ├── lib/                    # Business logic
│   ├── hooks/                  # Custom hooks
│   ├── contexts/               # React contexts
│   └── types/                  # TypeScript types
├── public/                     # Static assets
├── next.config.js
└── tsconfig.json

apps/admin/                     # Admin dashboard
├── src/app/                    # Similar structure
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Server Components
  experimental: {
    serverActions: true,
  },

  // PWA configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  },

  // Image optimization
  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/old-shop',
        destination: '/shop',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

### Server vs Client Components Guidelines

**Use Server Components (default) for**:
- ✅ Data fetching (Firestore, APIs)
- ✅ Accessing backend resources
- ✅ Keeping sensitive info on server (API keys)
- ✅ Large dependencies (markdown parser, date libs)

**Use Client Components (`'use client'`) for**:
- ✅ Interactivity (onClick, useState)
- ✅ Browser APIs (localStorage, geolocation)
- ✅ Hooks (useState, useEffect, custom hooks)
- ✅ Event listeners
- ✅ React Context

**Example**:
```tsx
// app/shop/products/[id]/page.tsx (Server Component)
import { ProductClient } from './ProductClient';

async function ProductPage({ params }) {
  // Fetch data on server
  const product = await getProduct(params.id);

  return (
    <div>
      <h1>{product.name}</h1>
      {/* Pass data to client component */}
      <ProductClient product={product} />
    </div>
  );
}

// app/shop/products/[id]/ProductClient.tsx (Client Component)
'use client';

import { useState } from 'react';

export function ProductClient({ product }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div>
      <button onClick={() => setQuantity(q => q + 1)}>
        Add to Cart ({quantity})
      </button>
    </div>
  );
}
```

---

## Caching Strategy

### 1. Fetch Caching (Default: Cache Forever)

```tsx
// Default: cache forever (similar to SSG)
const data = await fetch('https://api.example.com/data');

// No cache (similar to SSR)
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
});

// Revalidate every 60s (ISR)
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 }
});
```

### 2. Route Segment Config

```tsx
// Force dynamic rendering (like getServerSideProps)
export const dynamic = 'force-dynamic';

// Force static rendering (like getStaticProps)
export const dynamic = 'force-static';

// Revalidate every 3600s (1 hour)
export const revalidate = 3600;
```

### 3. Data Cache Invalidation

```tsx
// app/actions/revalidate.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProduct(productId: string) {
  await updateProductInDB(productId);

  // Revalidate specific path
  revalidatePath(`/shop/products/${productId}`);

  // Or revalidate by tag
  revalidateTag('products');
}
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Contentful Paint (FCP)** | <1.0s | Lighthouse |
| **Largest Contentful Paint (LCP)** | <2.5s | Lighthouse |
| **Time to Interactive (TTI)** | <3.0s | Lighthouse |
| **Cumulative Layout Shift (CLS)** | <0.1 | Lighthouse |
| **First Input Delay (FID)** | <100ms | Real User Monitoring |
| **Bundle Size (JS)** | <150KB gzipped | Next.js build output |

### Monitoring

- **Vercel Analytics** - Core Web Vitals real-user data
- **Lighthouse CI** - Automated performance checks in PR
- **Sentry** - Error tracking + performance monitoring

---

## Migration Path (If Needed)

**If Next.js becomes problematic**, migration paths:
1. **Next.js Pages Router** - Easy migration (same framework)
2. **Remix** - Similar mental model (loader/action)
3. **Astro** - For content-heavy sections (blog)
4. **Custom SSR** - React + Express (last resort)

**Likelihood**: Low. Next.js è framework mainstream con momentum crescente.

---

## Training Plan

### Week 1: Fundamentals
- App Router file structure
- Server vs Client Components
- Data fetching patterns

### Week 2: Advanced
- Streaming + Suspense
- Parallel routes
- Intercepting routes
- Server Actions

### Week 3: Performance
- Image optimization
- Font optimization
- Bundle analysis
- Caching strategies

**Resources**:
- [Next.js Learn Course](https://nextjs.org/learn)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)

---

## Review Date

**Next Review**: 2026-01-25 (1 year)

**Triggers for re-evaluation**:
- App Router bugs critici blockers
- Performance targets non raggiunti (<80 Lighthouse)
- Team productivity cala (>50% time in debugging)
- Framework alternative emerge con features killer

---

## References

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [App Router Best Practices](https://nextjs.org/docs/app/building-your-application)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Vercel Performance Guide](https://vercel.com/docs/concepts/next.js/overview)

---

## Sign-off

- ✅ **Tech Lead**: Approved
- ✅ **Frontend Team**: Approved
- ✅ **DevOps**: Approved (Vercel hosting)
- ✅ **CTO**: Approved