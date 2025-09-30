/**
 * Lighthouse Performance Tests
 * Automated performance, accessibility, and best practices testing
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

interface LighthouseResult {
  lhr: {
    categories: {
      performance: { score: number };
      accessibility: { score: number };
      'best-practices': { score: number };
      seo: { score: number };
      pwa?: { score: number };
    };
    audits: {
      [key: string]: {
        score: number | null;
        displayValue?: string;
        details?: any;
      };
    };
  };
}

describe('Lighthouse Performance Tests', () => {
  let chrome: any;
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
    });
  });

  afterAll(async () => {
    if (chrome) {
      await chrome.kill();
    }
  });

  const runLighthouseTest = async (url: string, config?: any): Promise<LighthouseResult> => {
    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      port: chrome.port,
      ...config
    };

    const result = await lighthouse(url, options);
    return result as LighthouseResult;
  };

  describe('Homepage Performance', () => {
    it('should meet performance thresholds', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { categories, audits } = result.lhr;

      // Performance score should be above 85
      expect(categories.performance.score).toBeGreaterThanOrEqual(0.85);

      // Core Web Vitals checks
      expect(audits['largest-contentful-paint'].score).toBeGreaterThanOrEqual(0.9);
      expect(audits['first-contentful-paint'].score).toBeGreaterThanOrEqual(0.9);
      expect(audits['cumulative-layout-shift'].score).toBeGreaterThanOrEqual(0.9);

      // Speed Index should be good
      expect(audits['speed-index'].score).toBeGreaterThanOrEqual(0.85);
    }, 60000);

    it('should meet accessibility standards', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { categories, audits } = result.lhr;

      // Accessibility score should be above 95
      expect(categories.accessibility.score).toBeGreaterThanOrEqual(0.95);

      // Specific accessibility checks
      expect(audits['color-contrast'].score).toBe(1);
      expect(audits['image-alt'].score).toBe(1);
      expect(audits['heading-order'].score).toBe(1);
      expect(audits['label'].score).toBe(1);
    }, 60000);

    it('should follow best practices', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { categories, audits } = result.lhr;

      // Best practices score should be above 90
      expect(categories['best-practices'].score).toBeGreaterThanOrEqual(0.9);

      // Security checks
      expect(audits['is-on-https'].score).toBe(1);
      expect(audits['external-anchors-use-rel-noopener'].score).toBe(1);
    }, 60000);

    it('should be SEO optimized', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { categories, audits } = result.lhr;

      // SEO score should be above 90
      expect(categories.seo.score).toBeGreaterThanOrEqual(0.9);

      // SEO checks
      expect(audits['meta-description'].score).toBe(1);
      expect(audits['document-title'].score).toBe(1);
      expect(audits['html-has-lang'].score).toBe(1);
    }, 60000);
  });

  describe('Shop Page Performance', () => {
    const shopUrl = `${baseUrl}/shop`;

    it('should load shop efficiently', async () => {
      const result = await runLighthouseTest(shopUrl);
      const { categories, audits } = result.lhr;

      // Performance should be reasonable for content-heavy page
      expect(categories.performance.score).toBeGreaterThanOrEqual(0.75);

      // Image optimization
      expect(audits['modern-image-formats'].score).toBeGreaterThanOrEqual(0.8);
      expect(audits['efficient-animated-content'].score).toBe(1);
      expect(audits['uses-responsive-images'].score).toBeGreaterThanOrEqual(0.8);

      // Resource loading
      expect(audits['render-blocking-resources'].score).toBeGreaterThanOrEqual(0.8);
      expect(audits['unused-css-rules'].score).toBeGreaterThanOrEqual(0.8);
    }, 60000);

    it('should handle large product catalogs efficiently', async () => {
      const result = await runLighthouseTest(shopUrl, {
        onlyCategories: ['performance'],
        settings: {
          throttlingMethod: 'devtools',
          throttling: {
            cpuSlowdownMultiplier: 4,
            requestLatencyMs: 150,
            downloadThroughputKbps: 1600,
            uploadThroughputKbps: 750
          }
        }
      });

      const { audits } = result.lhr;

      // Should maintain reasonable performance under throttling
      expect(audits['interactive'].score).toBeGreaterThanOrEqual(0.7);
      expect(audits['mainthread-work-breakdown'].score).toBeGreaterThanOrEqual(0.7);
    }, 60000);
  });

  describe('Product Detail Performance', () => {
    const productUrl = `${baseUrl}/shop/products/test-product`;

    it('should load product details quickly', async () => {
      const result = await runLighthouseTest(productUrl);
      const { categories, audits } = result.lhr;

      // Product pages should be fast
      expect(categories.performance.score).toBeGreaterThanOrEqual(0.8);

      // Interactive elements should be responsive
      expect(audits['interactive'].score).toBeGreaterThanOrEqual(0.8);
      expect(audits['total-blocking-time'].score).toBeGreaterThanOrEqual(0.8);
    }, 60000);
  });

  describe('PWA Capabilities', () => {
    it('should meet PWA requirements', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { categories, audits } = result.lhr;

      // PWA score should be high
      if (categories.pwa) {
        expect(categories.pwa.score).toBeGreaterThanOrEqual(0.8);
      }

      // PWA requirements
      expect(audits['service-worker'].score).toBe(1);
      expect(audits['installable-manifest'].score).toBe(1);
      expect(audits['splash-screen'].score).toBe(1);
      expect(audits['themed-omnibox'].score).toBe(1);
    }, 60000);

    it('should work offline', async () => {
      const result = await runLighthouseTest(baseUrl, {
        onlyCategories: ['pwa'],
        settings: {
          emulatedFormFactor: 'mobile'
        }
      });

      const { audits } = result.lhr;

      // Offline functionality
      expect(audits['works-offline'].score).toBe(1);
      expect(audits['offline-start-url'].score).toBe(1);
    }, 60000);
  });

  describe('Mobile Performance', () => {
    const mobileConfig = {
      settings: {
        emulatedFormFactor: 'mobile',
        throttling: {
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 150,
          downloadThroughputKbps: 1600,
          uploadThroughputKbps: 750
        }
      }
    };

    it('should perform well on mobile devices', async () => {
      const result = await runLighthouseTest(baseUrl, mobileConfig);
      const { categories, audits } = result.lhr;

      // Mobile performance should be acceptable
      expect(categories.performance.score).toBeGreaterThanOrEqual(0.7);

      // Mobile-specific checks
      expect(audits['viewport'].score).toBe(1);
      expect(audits['tap-targets'].score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    it('should have good mobile accessibility', async () => {
      const result = await runLighthouseTest(baseUrl, {
        ...mobileConfig,
        onlyCategories: ['accessibility']
      });

      const { categories, audits } = result.lhr;

      expect(categories.accessibility.score).toBeGreaterThanOrEqual(0.95);
      expect(audits['touch-targets'].score).toBeGreaterThanOrEqual(0.9);
    }, 60000);
  });

  describe('Performance Budget', () => {
    it('should stay within resource budgets', async () => {
      const result = await runLighthouseTest(baseUrl, {
        settings: {
          budgets: [
            {
              path: '/*',
              timings: [
                { metric: 'first-contentful-paint', budget: 2000 },
                { metric: 'largest-contentful-paint', budget: 4000 },
                { metric: 'interactive', budget: 5000 }
              ],
              resourceSizes: [
                { resourceType: 'script', budget: 300 },
                { resourceType: 'image', budget: 500 },
                { resourceType: 'stylesheet', budget: 100 }
              ]
            }
          ]
        }
      });

      const { audits } = result.lhr;

      // Check if budgets are met
      if (audits['performance-budget']) {
        expect(audits['performance-budget'].score).toBeGreaterThanOrEqual(0.8);
      }

      if (audits['timing-budget']) {
        expect(audits['timing-budget'].score).toBeGreaterThanOrEqual(0.8);
      }
    }, 60000);
  });

  describe('Critical Path Analysis', () => {
    it('should minimize critical path resources', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { audits } = result.lhr;

      // Critical path optimizations
      expect(audits['critical-request-chains'].score).toBeGreaterThanOrEqual(0.8);
      expect(audits['render-blocking-resources'].score).toBeGreaterThanOrEqual(0.8);

      // Resource loading
      expect(audits['uses-rel-preload'].score).toBeGreaterThanOrEqual(0.8);
      expect(audits['uses-rel-preconnect'].score).toBeGreaterThanOrEqual(0.8);
    }, 60000);
  });

  describe('Network Optimization', () => {
    it('should optimize network requests', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { audits } = result.lhr;

      // Compression and caching
      expect(audits['uses-text-compression'].score).toBeGreaterThanOrEqual(0.9);
      expect(audits['uses-long-cache-ttl'].score).toBeGreaterThanOrEqual(0.8);

      // HTTP/2 optimization
      expect(audits['uses-http2'].score).toBeGreaterThanOrEqual(0.8);

      // Asset optimization
      expect(audits['unminified-css'].score).toBe(1);
      expect(audits['unminified-javascript'].score).toBe(1);
    }, 60000);
  });

  describe('Third Party Analysis', () => {
    it('should minimize third-party impact', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { audits } = result.lhr;

      // Third-party impact should be minimal
      if (audits['third-party-summary']) {
        const thirdPartyDetails = audits['third-party-summary'].details;
        if (thirdPartyDetails?.items) {
          const totalBlockingTime = thirdPartyDetails.items.reduce(
            (sum: number, item: any) => sum + (item.blockingTime || 0),
            0
          );
          expect(totalBlockingTime).toBeLessThan(500); // Less than 500ms
        }
      }
    }, 60000);
  });

  describe('User Experience Metrics', () => {
    it('should provide excellent user experience', async () => {
      const result = await runLighthouseTest(baseUrl);
      const { audits } = result.lhr;

      // Core Web Vitals
      const lcpScore = audits['largest-contentful-paint'].score || 0;
      const fidScore = audits['max-potential-fid'].score || 0;
      const clsScore = audits['cumulative-layout-shift'].score || 0;

      expect(lcpScore).toBeGreaterThanOrEqual(0.9);
      expect(fidScore).toBeGreaterThanOrEqual(0.9);
      expect(clsScore).toBeGreaterThanOrEqual(0.9);

      // Visual stability
      expect(audits['layout-shift-elements'].score).toBe(1);
    }, 60000);
  });
});