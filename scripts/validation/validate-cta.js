#!/usr/bin/env node
/**
 * Validates CTA registry against implementation
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const CTA_REGISTRY_PATH = path.join(__dirname, '../../docs/cta/registry.json');
const APPS_DIR = path.join(__dirname, '../../apps');

async function validateCTA() {
  console.log('🔍 Validating CTA Registry...');

  // Load CTA registry
  const registry = JSON.parse(fs.readFileSync(CTA_REGISTRY_PATH, 'utf8'));
  const registeredCTAs = new Set();

  // Extract all CTA IDs from registry
  Object.values(registry.cta).forEach(category => {
    Object.values(category).forEach(cta => {
      registeredCTAs.add(cta.id);
    });
  });

  console.log(`📋 Found ${registeredCTAs.size} CTAs in registry`);

  // Find all React/TypeScript files
  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: APPS_DIR,
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'out/**']
  });

  const foundCTAs = new Set();
  const unregisteredCTAs = new Set();
  const filesCTAs = new Map();

  // Scan files for data-cta-id attributes
  files.forEach(file => {
    const filePath = path.join(APPS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Match data-cta-id="..." patterns
    const ctaMatches = content.match(/data-cta-id=["']([^"']+)["']/g);

    if (ctaMatches) {
      const fileCTAs = ctaMatches.map(match => {
        const id = match.match(/data-cta-id=["']([^"']+)["']/)[1];
        foundCTAs.add(id);

        if (!registeredCTAs.has(id)) {
          unregisteredCTAs.add(id);
        }

        return id;
      });

      if (fileCTAs.length > 0) {
        filesCTAs.set(file, fileCTAs);
      }
    }
  });

  console.log(`🔍 Found ${foundCTAs.size} CTAs in code`);

  // Check for missing CTAs
  const missingCTAs = new Set([...registeredCTAs].filter(id => !foundCTAs.has(id)));

  // Report results
  let hasErrors = false;

  if (unregisteredCTAs.size > 0) {
    console.error('❌ Unregistered CTAs found in code:');
    unregisteredCTAs.forEach(id => {
      console.error(`   - ${id}`);
    });
    hasErrors = true;
  }

  if (missingCTAs.size > 0) {
    console.warn('⚠️  Registered CTAs not found in code:');
    missingCTAs.forEach(id => {
      console.warn(`   - ${id}`);
    });
  }

  // Validate required fields
  Object.values(registry.cta).forEach(category => {
    Object.values(category).forEach(cta => {
      const required = registry.validation.required_fields;
      required.forEach(field => {
        if (!cta[field]) {
          console.error(`❌ CTA ${cta.id} missing required field: ${field}`);
          hasErrors = true;
        }
      });
    });
  });

  // Summary
  console.log('\n📊 CTA Validation Summary:');
  console.log(`   Registered CTAs: ${registeredCTAs.size}`);
  console.log(`   Found in code: ${foundCTAs.size}`);
  console.log(`   Unregistered: ${unregisteredCTAs.size}`);
  console.log(`   Missing: ${missingCTAs.size}`);

  if (hasErrors) {
    console.error('\n❌ CTA validation failed!');
    process.exit(1);
  } else {
    console.log('\n✅ CTA validation passed!');
  }
}

// Run validation if called directly
if (require.main === module) {
  validateCTA().catch(console.error);
}

module.exports = { validateCTA };