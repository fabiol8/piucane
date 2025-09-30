# ADR-002: Monorepo con Turborepo

**Status**: ✅ Accepted
**Date**: 2025-01-20
**Deciders**: Tech Lead, Frontend Team, DevOps
**Technical Story**: #18

---

## Context

PiùCane è composto da multiple applicazioni e librerie condivise:
- **App utente** (Next.js PWA) - `apps/web`
- **Admin dashboard** (Next.js) - `apps/admin`
- **API backend** (Node.js + Express) - `api`
- **Shared UI components** - `packages/ui`
- **Shared business logic** - `packages/lib`
- **Email templates** (MJML) - `packages/emails`

**Problema**: Come organizzare il codice per massimizzare riuso senza creare overhead di gestione?

**Alternatives considerate**:
1. **Monorepo con Turborepo**
2. **Monorepo con Nx**
3. **Monorepo con Lerna + Yarn Workspaces**
4. **Polyrepo** (repository separati)

---

## Decision

Adottiamo **Turborepo** per gestire il monorepo PiùCane.

**Struttura**:
```
piucane/
├── apps/
│   ├── web/           # App utente (Next.js 14)
│   ├── admin/         # Dashboard admin (Next.js 14)
│   └── docs/          # Documentazione (Next.js + MDX)
├── api/               # Backend API (Node.js + Express)
├── packages/
│   ├── ui/            # Componenti UI condivisi
│   ├── lib/           # Business logic condivisa
│   ├── emails/        # Template email MJML
│   └── tsconfig/      # TypeScript configs condivise
├── turbo.json         # Turborepo config
├── package.json       # Root workspace
└── pnpm-workspace.yaml
```

---

## Rationale

### ✅ Pro Turborepo

1. **Remote Caching**
   - Cache build artifacts su Vercel (o custom S3)
   - CI builds 10x più veloci (cache hit)
   - Cache condivisa tra dev team

2. **Parallel Execution**
   - Build/test tasks in parallelo con dependency graph
   - Max CPU utilization
   - `turbo run build` esegue tutti i build in ordine corretto

3. **Incremental Builds**
   - Rebuilda solo packages modificati
   - `turbo run build --filter=...@origin/main` (solo cambiati)
   - Git-aware (hash-based invalidation)

4. **Zero Config**
   - Setup minimale (`turbo.json`)
   - Convention-over-configuration
   - Meno boilerplate di Nx

5. **TypeScript Monorepo-Native**
   - Project references TypeScript automatici
   - Intellisense cross-package perfetto
   - Type checking incrementale

6. **Vercel Integration**
   - Vercel è il creatore di Turborepo
   - Deploy ottimizzati (solo apps cambiate)
   - Remote cache gratis su Vercel

### ❌ Contro Turborepo

1. **Ecosystem Più Piccolo**
   - Meno plugins di Nx
   - Community più piccola (ma in crescita)
   - **Mitigation**: Turborepo è semplice, meno bisogno di plugins

2. **No Code Generators**
   - Nx ha generator CLI (`nx generate component`)
   - Turborepo è solo task runner
   - **Mitigation**: Creare script custom per scaffolding

3. **No Affected Tests**
   - Nx calcola automaticamente quali test runare
   - Turborepo richiede `--filter` manuale
   - **Mitigation**: Script custom + git diff

---

## Alternatives Considered

### Option 2: Nx

**Pro**:
- Feature set più ricco (generators, affected tests)
- Plugin ecosystem grande (React, Next.js, Node, etc.)
- Computation caching + distributed task execution

**Contro**:
- Setup più complesso (nx.json, workspace.json, project.json)
- Curva apprendimento più ripida
- Più opinato (impone struttura)
- Overhead per progetti piccoli

**Verdict**: ❌ Rejected - Troppo complesso per le nostre needs. Turborepo più semplice e sufficiente.

---

### Option 3: Lerna + Yarn Workspaces

**Pro**:
- Maturo (2016)
- Supporto npm publish per packages
- Lerna changelog automatico

**Contro**:
- Lerna in maintenance mode (poco sviluppo)
- No caching intelligente
- No parallel builds out-of-the-box
- Richiede più tooling custom (scripty, concurrently)

**Verdict**: ❌ Rejected - Lerna superato da Turborepo/Nx

---

### Option 4: Polyrepo (Repository Separati)

**Pro**:
- Isolamento totale
- Deploy indipendenti
- Permissions granulari per repo

**Contro**:
- Code duplication (components, utils)
- Versioning hell (quale versione `@piucane/ui` usare?)
- No shared TypeScript types
- CI/CD duplicato per ogni repo
- Refactoring cross-repo nightmare

**Verdict**: ❌ Rejected - Troppi svantaggi per un team piccolo

---

## Consequences

### Positive

1. ✅ **Code Sharing Zero-Friction**: Import da `@piucane/ui` come npm package
2. ✅ **Type Safety Cross-Package**: TypeScript project references
3. ✅ **CI Builds 10x Faster**: Remote caching + incremental builds
4. ✅ **Atomic Commits**: Cambio in `packages/ui` → update `apps/web` in stesso commit
5. ✅ **Unified Dependencies**: Una sola `node_modules`, no version conflicts

### Negative

1. ⚠️ **Repo Size**: Monorepo grande (500MB+ con `node_modules`)
2. ⚠️ **Git Clone Slow**: Clone iniziale lento per nuovi dev
3. ⚠️ **Build Complexity**: Orchestrare task dependencies manualmente
4. ⚠️ **Risk di Breaking Changes**: Cambio in `packages/lib` può rompere apps

### Neutral

1. 🔵 **Package Manager Lock-in**: PNPM richiesto per workspaces
2. 🔵 **Learning Curve**: Team deve imparare Turborepo (1-2 giorni)

---

## Implementation

### turbo.json Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    ".env.local",
    "tsconfig.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "dist/**",
        "out/**"
      ]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "remoteCache": {
    "enabled": true,
    "signature": true
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:web": "turbo run dev --filter=web",
    "dev:admin": "turbo run dev --filter=admin",
    "build": "turbo run build",
    "build:web": "turbo run build --filter=web",
    "test": "turbo run test",
    "test:changed": "turbo run test --filter=...@origin/main",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

### Workspace Package Structure

**packages/ui/package.json**:
```json
{
  "name": "@piucane/ui",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./button": "./dist/button.js",
    "./card": "./dist/card.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  }
}
```

**apps/web/package.json**:
```json
{
  "name": "web",
  "dependencies": {
    "@piucane/ui": "workspace:*",
    "@piucane/lib": "workspace:*"
  }
}
```

---

## Build Pipeline

### Local Development
```bash
# Start all apps in dev mode
pnpm dev

# Start only web app
pnpm dev:web

# Build everything
pnpm build

# Run tests for changed packages only
pnpm test:changed
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile

      # Setup Turborepo remote cache
      - name: Setup Turbo cache
        uses: actions/cache@v3
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

  build:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: piucane

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

**Build Time Improvements**:
- **Without cache**: ~8 minutes
- **With local cache**: ~2 minutes
- **With remote cache** (CI): ~30 seconds

---

## Migration Strategy

### Phase 1: Setup (Week 1)
- [x] Initialize Turborepo (`npx create-turbo@latest`)
- [x] Move existing apps to `apps/` folder
- [x] Create `packages/ui` with shared components
- [x] Configure `turbo.json` pipeline

### Phase 2: Extract Shared Code (Week 2-3)
- [x] Extract UI components to `packages/ui`
- [x] Extract business logic to `packages/lib`
- [x] Extract email templates to `packages/emails`
- [x] Setup TypeScript project references

### Phase 3: CI/CD (Week 4)
- [x] Configure GitHub Actions with Turbo cache
- [x] Setup Vercel deployments (per-app)
- [x] Configure remote caching (Vercel or S3)

### Phase 4: Optimization (Ongoing)
- [ ] Add affected tests detection
- [ ] Optimize cache keys
- [ ] Add build time monitoring

---

## Monitoring

### Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| **CI Build Time** | <2 min (with cache) | GitHub Actions insights |
| **Local Build Time** | <30s (incremental) | `time turbo build` |
| **Cache Hit Rate** | >80% | Turbo logs |
| **Monorepo Size** | <1GB | `du -sh` |
| **Dependencies Duplicates** | 0 | `pnpm list --depth=0` |

### Alerts

- ⚠️ CI build time >5 min → investigate cache misses
- ⚠️ Monorepo size >2GB → cleanup `node_modules`
- ⚠️ Cache hit rate <50% → review turbo.json outputs

---

## Best Practices

### 1. Package Naming Convention
```
@piucane/ui        ← UI components
@piucane/lib       ← Business logic
@piucane/emails    ← Email templates
@piucane/tsconfig  ← Shared TS configs
```

### 2. Dependency Management
```bash
# Add dependency to specific package
pnpm add react --filter=@piucane/ui

# Add dependency to root (workspace tools only)
pnpm add -D turbo --workspace-root

# Update all dependencies
pnpm update -r
```

### 3. Breaking Changes Protocol
```
1. Make change in packages/*
2. Update internal consumers in same PR
3. Run `pnpm build` to verify no breaks
4. Commit atomically
```

### 4. Versioning Strategy
- **Internal packages**: `workspace:*` (always latest)
- **External deps**: Exact versions in root `package.json`
- **Publishable packages**: Semantic versioning

---

## Troubleshooting

### Issue: Cache not working
```bash
# Clear Turbo cache
rm -rf .turbo

# Verify cache config
turbo run build --dry-run
```

### Issue: Type errors after package update
```bash
# Rebuild all packages
pnpm build --force

# Reset TypeScript
rm -rf **/tsconfig.tsbuildinfo
```

### Issue: Dependency conflicts
```bash
# Check for duplicates
pnpm list --depth=1 | grep -E "├──|└──"

# Deduplicate
pnpm dedupe
```

---

## Review Date

**Next Review**: 2026-01-20 (1 year)

**Triggers for re-evaluation**:
- Team grows >15 devs → consider Nx for better tooling
- Need for micro-frontends → consider Module Federation
- Monorepo >5GB → consider splitting to polyrepo
- Build time >10min despite caching

---

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo Best Practices](https://monorepo.tools/)
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Vercel Turborepo Guide](https://vercel.com/docs/concepts/monorepos/turborepo)

---

## Sign-off

- ✅ **Tech Lead**: Approved
- ✅ **Frontend Team**: Approved
- ✅ **DevOps**: Approved
- ✅ **CTO**: Approved