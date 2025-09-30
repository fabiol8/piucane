#!/usr/bin/env tsx

/**
 * CTA Registry Validation Script
 *
 * Validates that all CTA IDs in the codebase are registered
 * in docs/cta/registry.json according to PROMPTMASTER requirements.
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

interface CTARegistryItem {
  id: string;
  description: string;
  location: string;
  component: string;
  ga4Event: string;
  priority: string;
}

interface CTARegistry {
  version: string;
  lastUpdated: string;
  description: string;
  cta: Record<string, Record<string, CTARegistryItem>>;
  categories: Record<string, any>;
  validation: any;
  implementation: any;
}

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'docs/cta/registry.json');
const SEARCH_PATTERNS = [
  'apps/web/src/**/*.{ts,tsx,js,jsx}',
  'apps/admin/src/**/*.{ts,tsx,js,jsx}',
  'packages/ui/src/**/*.{ts,tsx,js,jsx}'
];

async function loadRegistry(): Promise<CTARegistry> {
  try {
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    return JSON.parse(registryContent);
  } catch (error) {
    console.error('❌ Failed to load CTA registry:', error);
    process.exit(1);
  }
}

function extractCTAIds(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ctaRegex = /data-cta-id=["']([^"']+)["']/g;
  const matches: string[] = [];
  let match;

  while ((match = ctaRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

function getAllRegisteredCTAs(registry: CTARegistry): string[] {
  const allCTAs: string[] = [];

  Object.values(registry.cta).forEach(category => {
    Object.values(category).forEach(cta => {
      allCTAs.push(cta.id);
    });
  });

  return allCTAs;
}

async function validateCTARegistry(): Promise<void> {
  console.log('🔍 Validating CTA Registry...\n');

  // Load registry
  const registry = await loadRegistry();
  const registeredCTAs = getAllRegisteredCTAs(registry);

  console.log(`📋 Registry contains ${registeredCTAs.length} registered CTAs`);

  // Find all CTA IDs in codebase
  const allFiles: string[] = [];
  SEARCH_PATTERNS.forEach(pattern => {
    const files = globSync(pattern, { cwd: PROJECT_ROOT });
    allFiles.push(...files.map(f => path.join(PROJECT_ROOT, f)));
  });

  console.log(`🔍 Scanning ${allFiles.length} files for CTA IDs...\n`);

  const foundCTAs: Array<{ ctaId: string; file: string; line?: number }> = [];
  const issues: string[] = [];

  allFiles.forEach(filePath => {
    const ctaIds = extractCTAIds(filePath);
    ctaIds.forEach(ctaId => {
      foundCTAs.push({
        ctaId,
        file: path.relative(PROJECT_ROOT, filePath)
      });
    });
  });

  const uniqueCTAs = [...new Set(foundCTAs.map(item => item.ctaId))];
  console.log(`📊 Found ${uniqueCTAs.length} unique CTA IDs in codebase\n`);

  // Validate each found CTA
  const unregisteredCTAs: string[] = [];
  const registeredButNotUsed: string[] = [];

  uniqueCTAs.forEach(ctaId => {
    if (!registeredCTAs.includes(ctaId)) {
      unregisteredCTAs.push(ctaId);
      issues.push(`❌ Unregistered CTA ID: ${ctaId}`);
    }
  });

  registeredCTAs.forEach(ctaId => {
    if (!uniqueCTAs.includes(ctaId)) {
      registeredButNotUsed.push(ctaId);
      issues.push(`⚠️  Registered but unused CTA ID: ${ctaId}`);
    }
  });

  // Validate registry structure
  const structureIssues = validateRegistryStructure(registry);
  issues.push(...structureIssues);

  // Report results
  console.log('📊 Validation Results:');
  console.log('─'.repeat(50));

  if (issues.length === 0) {
    console.log('✅ All CTA IDs are properly registered and used!');
    console.log(`✅ Registry structure is valid`);
    console.log(`✅ ${uniqueCTAs.length} CTAs tracked correctly`);
  } else {
    console.log(`❌ Found ${issues.length} issues:\n`);
    issues.forEach(issue => console.log(issue));

    if (unregisteredCTAs.length > 0) {
      console.log('\n📝 Unregistered CTAs found in these files:');
      foundCTAs
        .filter(item => unregisteredCTAs.includes(item.ctaId))
        .forEach(item => {
          console.log(`   ${item.ctaId} in ${item.file}`);
        });
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   • Registered CTAs: ${registeredCTAs.length}`);
  console.log(`   • Used CTAs: ${uniqueCTAs.length}`);
  console.log(`   • Unregistered: ${unregisteredCTAs.length}`);
  console.log(`   • Unused: ${registeredButNotUsed.length}`);

  if (issues.length > 0) {
    console.log('\n💡 To fix issues:');
    console.log('   1. Add missing CTAs to docs/cta/registry.json');
    console.log('   2. Remove unused CTAs from registry');
    console.log('   3. Ensure all data-cta-id attributes are registered');
    process.exit(1);
  }

  console.log('\n🎉 CTA Registry validation passed!');
}

function validateRegistryStructure(registry: CTARegistry): string[] {
  const issues: string[] = [];

  // Check required fields
  if (!registry.version) issues.push('❌ Registry missing version field');
  if (!registry.lastUpdated) issues.push('❌ Registry missing lastUpdated field');
  if (!registry.cta) issues.push('❌ Registry missing cta object');
  if (!registry.categories) issues.push('❌ Registry missing categories object');
  if (!registry.validation) issues.push('❌ Registry missing validation object');
  if (!registry.implementation) issues.push('❌ Registry missing implementation object');

  // Validate CTA objects structure
  if (registry.cta) {
    Object.entries(registry.cta).forEach(([categoryKey, category]) => {
      Object.entries(category).forEach(([ctaKey, cta]) => {
        const requiredFields = ['id', 'description', 'location', 'component', 'ga4Event', 'priority'];
        requiredFields.forEach(field => {
          if (!(field in cta)) {
            issues.push(`❌ CTA ${cta.id || ctaKey} missing required field: ${field}`);
          }
        });

        // Validate priority values
        const validPriorities = ['critical', 'high', 'medium', 'low'];
        if (cta.priority && !validPriorities.includes(cta.priority)) {
          issues.push(`❌ CTA ${cta.id} has invalid priority: ${cta.priority}`);
        }
      });
    });
  }

  return issues;
}

// Run validation
validateCTARegistry().catch(error => {
  console.error('💥 Validation failed:', error);
  process.exit(1);
});