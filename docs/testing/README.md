# PiùCane Testing Suite

This document provides a comprehensive overview of the testing strategy and implementation for the PiùCane platform.

## Overview

The PiùCane platform uses a multi-layered testing approach to ensure quality, security, accessibility, and performance:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API and service integration testing
- **End-to-End Tests**: Full user journey testing
- **Accessibility Tests**: WCAG 2.2 AA compliance testing
- **Performance Tests**: Lighthouse performance auditing
- **Load Tests**: Concurrent user simulation
- **Security Tests**: Vulnerability and security testing

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/         # React component tests
│   ├── hooks/             # Custom hooks tests
│   └── utils/             # Utility function tests
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   └── services/          # Service integration tests
├── e2e/                   # End-to-end tests
│   ├── user-onboarding.spec.ts
│   ├── shopping-flow.spec.ts
│   └── privacy-consent.spec.ts
├── accessibility/         # Accessibility tests
│   └── a11y.spec.ts
├── performance/           # Performance tests
│   └── lighthouse.config.js
├── load/                  # Load testing
│   └── load-test.spec.ts
├── security/              # Security tests
│   └── security.test.ts
└── utils/                 # Test utilities
    └── test-utils.tsx
```

## Quick Start

### Running All Tests

```bash
npm run test:all
```

### Running Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# End-to-end tests
npm run test:e2e

# Accessibility tests
npm run test:a11y

# Performance tests
npm run test:lighthouse

# Load tests
npm run test:load

# With coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### CI/CD Integration

```bash
# For CI environments (fail-fast)
npm run test:ci
```

## Test Configuration

### Jest Configuration (Unit/Integration Tests)

- **Config File**: `jest.config.js`
- **Setup File**: `jest.setup.js`
- **Environment**: jsdom for React components
- **Coverage Threshold**: 80% for all metrics
- **Timeout**: 30 seconds per test

Key features:
- Automatic mocking of browser APIs
- Firebase mocking
- Google Analytics mocking
- Custom test utilities and matchers

### Playwright Configuration (E2E/A11Y/Load Tests)

- **Config File**: `playwright.config.ts`
- **A11Y Config**: `playwright-a11y.config.ts`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 60 seconds per test

Key features:
- Cross-browser testing
- Mobile device simulation
- Screenshot/video on failure
- Trace collection for debugging

### Lighthouse Configuration (Performance Tests)

- **Config File**: `tests/performance/lighthouse.config.js`
- **Categories**: Performance, Accessibility, Best Practices, SEO, PWA
- **Thresholds**: Configurable minimum scores
- **Multiple URLs**: Tests key pages of the application

## Test Utilities

### Custom Test Utils (`tests/utils/test-utils.tsx`)

Provides enhanced testing utilities:

```typescript
import { render, screen, userEvent, runAxeTest } from '../utils/test-utils'

// Enhanced render with providers
render(<Component />)

// Mock data generators
const user = mockUser
const dog = mockDogProfile
const order = mockOrder

// Accessibility testing
await runAxeTest(container)

// Analytics testing
expectAnalyticsEvent('event_name', parameters)

// Form testing helpers
await fillForm(getByLabelText, { name: 'John', email: 'john@example.com' })
```

### Mock Data

Pre-defined mock objects for consistent testing:
- `mockUser`: Complete user profile
- `mockDogProfile`: Dog profile with health data
- `mockOrder`: E-commerce order
- `mockPaymentMethods`: Payment method data

## Testing Patterns

### Component Testing

```typescript
describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName prop="value" />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const handleClick = jest.fn()
    render(<ComponentName onClick={handleClick} />)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('meets accessibility standards', async () => {
    const { container } = render(<ComponentName />)
    await runAxeTest(container)
  })
})
```

### E2E Testing

```typescript
test('should complete user flow', async ({ page }) => {
  await page.goto('/start')

  // Test user interactions
  await page.getByLabel('Name').fill('John')
  await page.getByRole('button', { name: 'Submit' }).click()

  // Assert outcomes
  await expect(page).toHaveURL('/success')
  await expect(page.getByText('Success!')).toBeVisible()
})
```

### API Testing

```typescript
describe('API Endpoint', () => {
  it('handles successful requests', async () => {
    const result = await apiFunction(validData)
    expect(result.success).toBe(true)
  })

  it('validates input data', async () => {
    const result = await apiFunction(invalidData)
    expect(result.error).toBe('VALIDATION_ERROR')
  })
})
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Critical Areas (90%+ Coverage Required)

- Authentication flows
- Payment processing
- Privacy/consent management
- Data validation
- Security functions

## Performance Benchmarks

### Lighthouse Thresholds

#### Desktop
- **Performance**: ≥80
- **Accessibility**: ≥95
- **Best Practices**: ≥90
- **SEO**: ≥90
- **PWA**: ≥80

#### Mobile
- **Performance**: ≥70 (more lenient for mobile)
- **Accessibility**: ≥95
- **Best Practices**: ≥90
- **SEO**: ≥90
- **PWA**: ≥85

### Load Testing Targets

- **Page Load**: <3s average, <5s max
- **API Response**: <2s average
- **Concurrent Users**: Support 20+ simultaneous users
- **Memory Usage**: <100MB total, <50MB growth
- **Bundle Size**: <2MB JS, <500KB CSS

## Accessibility Standards

### WCAG 2.2 AA Compliance

All tests verify compliance with:
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader**: Proper ARIA labels and descriptions
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Proper heading structure and landmarks

### Testing Coverage

- Form accessibility and validation
- Modal and dialog management
- Navigation and skip links
- Image alt text
- Loading states and error messages

## Security Testing

### Areas Covered

- **Input Validation**: XSS and SQL injection prevention
- **Authentication**: Proper session management
- **Authorization**: Access control verification
- **File Upload**: Malicious file detection
- **Headers**: Security header verification
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: Abuse prevention

### Security Headers Required

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

### Test Parallelization

- Unit tests run in parallel per file
- E2E tests run in parallel per browser
- Load tests run sequentially to avoid resource conflicts

## Debugging Tests

### Common Issues

1. **Timing Issues**: Use `waitFor` and proper async/await
2. **Mock Issues**: Ensure mocks are cleared between tests
3. **Environment Issues**: Check Node.js and browser versions
4. **Flaky Tests**: Add appropriate waits and retries

### Debugging Tools

- **Playwright Inspector**: `npx playwright test --debug`
- **Jest Watch Mode**: `npm run test:watch`
- **Coverage Reports**: `npm run test:coverage`
- **Lighthouse Reports**: Generated in `test-results/lighthouse-report/`

## Best Practices

### Writing Tests

1. **Test Behavior, Not Implementation**: Focus on user outcomes
2. **Use Descriptive Names**: Clear test descriptions
3. **Keep Tests Independent**: No shared state between tests
4. **Mock External Dependencies**: Ensure test isolation
5. **Test Edge Cases**: Error conditions and boundary values

### Maintaining Tests

1. **Regular Updates**: Keep tests updated with feature changes
2. **Performance Monitoring**: Track test execution times
3. **Coverage Analysis**: Review uncovered code regularly
4. **Flaky Test Management**: Fix or quarantine unstable tests

### Code Quality

1. **Consistent Patterns**: Follow established test patterns
2. **DRY Principle**: Reuse test utilities and setup
3. **Clear Assertions**: Use specific, meaningful assertions
4. **Error Messages**: Provide clear failure messages

## Reporting and Metrics

### Test Results

Test results are available in multiple formats:
- **HTML Reports**: `test-results/` directory
- **JSON Reports**: Machine-readable format
- **JUnit XML**: CI/CD integration
- **Coverage Reports**: Detailed coverage analysis

### Key Metrics Tracked

- Test success/failure rates
- Coverage percentages
- Performance scores
- Accessibility violations
- Security vulnerabilities
- Load testing results

## Troubleshooting

### Common Problems

#### Jest Issues
```bash
# Clear Jest cache
npx jest --clearCache

# Run with verbose output
npm run test:unit -- --verbose
```

#### Playwright Issues
```bash
# Install browsers
npx playwright install

# Run in headed mode
npx playwright test --headed

# Generate test files
npx playwright codegen
```

#### Lighthouse Issues
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run locally
lhci autorun --config lighthouse.config.js
```

### Getting Help

- Review test logs in `test-results/`
- Check GitHub Actions for CI failures
- Use debug modes for interactive debugging
- Consult team documentation and standards

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Screenshot comparison
2. **Contract Testing**: API contract verification
3. **Mutation Testing**: Test quality assessment
4. **Chaos Engineering**: Resilience testing
5. **A/B Testing**: Experiment validation

### Tools Under Consideration

- **Storybook**: Component testing and documentation
- **Chromatic**: Visual testing
- **Pact**: Contract testing
- **Artillery**: Advanced load testing
- **OWASP ZAP**: Security scanning