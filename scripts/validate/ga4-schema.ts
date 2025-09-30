#!/usr/bin/env tsx

/**
 * GA4 Schema Validation Script
 *
 * Validates that GA4 events in the codebase match the schema
 * and are properly mapped to CTA registry according to PROMPTMASTER requirements.
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

interface CTARegistryItem {
  id: string;
  ga4Event: string;
  [key: string]: any;
}

interface CTARegistry {
  cta: Record<string, Record<string, CTARegistryItem>>;
}

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'docs/cta/registry.json');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'apps/web/src/analytics/events.schema.ts');
const SEARCH_PATTERNS = [
  'apps/web/src/**/*.{ts,tsx,js,jsx}',
  'apps/admin/src/**/*.{ts,tsx,js,jsx}',
  'packages/lib/**/*.{ts,tsx,js,jsx}'
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

function extractSchemaEvents(): string[] {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    // Extract event names from schema mappings
    const eventMapRegex = /eventSchemaMap\s*=\s*{([^}]+)}/s;
    const match = schemaContent.match(eventMapRegex);

    if (!match) {
      throw new Error('Could not find eventSchemaMap in schema file');
    }

    const eventMapContent = match[1];
    const eventRegex = /'([^']+)':/g;
    const events: string[] = [];
    let eventMatch;

    while ((eventMatch = eventRegex.exec(eventMapContent)) !== null) {
      events.push(eventMatch[1]);
    }

    return events;
  } catch (error) {
    console.error('❌ Failed to extract schema events:', error);
    process.exit(1);
  }
}

function extractTrackEventCalls(filePath: string): Array<{ event: string; file: string; line?: number }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const trackEventRegex = /trackEvent\s*\(\s*['"]([^'"]+)['"]/g;
  const calls: Array<{ event: string; file: string; line?: number }> = [];
  let match;

  while ((match = trackEventRegex.exec(content)) !== null) {
    calls.push({
      event: match[1],
      file: path.relative(PROJECT_ROOT, filePath)
    });
  }

  return calls;
}

function getRegistryGA4Events(registry: CTARegistry): Array<{ ctaId: string; ga4Event: string }> {
  const mappings: Array<{ ctaId: string; ga4Event: string }> = [];

  Object.values(registry.cta).forEach(category => {
    Object.values(category).forEach(cta => {
      mappings.push({
        ctaId: cta.id,
        ga4Event: cta.ga4Event
      });
    });
  });

  return mappings;
}

async function validateGA4Schema(): Promise<void> {
  console.log('🔍 Validating GA4 Schema and Event Mapping...\n');

  // Load registry and schema
  const registry = await loadRegistry();
  const schemaEvents = extractSchemaEvents();
  const registryMappings = getRegistryGA4Events(registry);

  console.log(`📋 Schema defines ${schemaEvents.length} events`);
  console.log(`📋 Registry maps ${registryMappings.length} CTAs to GA4 events\n`);

  // Find all trackEvent calls in codebase
  const allFiles: string[] = [];
  SEARCH_PATTERNS.forEach(pattern => {
    const files = globSync(pattern, { cwd: PROJECT_ROOT });
    allFiles.push(...files.map(f => path.join(PROJECT_ROOT, f)));
  });

  console.log(`🔍 Scanning ${allFiles.length} files for trackEvent calls...\n`);

  const trackEventCalls: Array<{ event: string; file: string; line?: number }> = [];

  allFiles.forEach(filePath => {
    const calls = extractTrackEventCalls(filePath);
    trackEventCalls.push(...calls);
  });

  const uniqueUsedEvents = [...new Set(trackEventCalls.map(call => call.event))];
  const uniqueRegistryEvents = [...new Set(registryMappings.map(mapping => mapping.ga4Event))];

  console.log(`📊 Found ${uniqueUsedEvents.length} unique events in trackEvent calls\n`);

  // Validation checks
  const issues: string[] = [];

  // 1. Check if all used events are in schema
  const eventsNotInSchema: string[] = [];
  uniqueUsedEvents.forEach(event => {
    if (!schemaEvents.includes(event)) {
      eventsNotInSchema.push(event);
      issues.push(`❌ Event used in code but not in schema: ${event}`);
    }
  });

  // 2. Check if all registry events are in schema
  const registryEventsNotInSchema: string[] = [];
  uniqueRegistryEvents.forEach(event => {
    if (!schemaEvents.includes(event)) {
      registryEventsNotInSchema.push(event);
      issues.push(`❌ Registry event not in schema: ${event}`);
    }
  });

  // 3. Check for schema events not used anywhere
  const unusedSchemaEvents: string[] = [];
  schemaEvents.forEach(event => {
    if (!uniqueUsedEvents.includes(event) && !uniqueRegistryEvents.includes(event)) {
      unusedSchemaEvents.push(event);
      issues.push(`⚠️  Schema event not used anywhere: ${event}`);
    }
  });

  // 4. Check for duplicate event mappings in registry
  const eventCounts = new Map<string, number>();
  registryMappings.forEach(mapping => {
    const count = eventCounts.get(mapping.ga4Event) || 0;
    eventCounts.set(mapping.ga4Event, count + 1);
  });

  eventCounts.forEach((count, event) => {
    if (count > 1) {
      issues.push(`⚠️  Event mapped to multiple CTAs: ${event} (${count} times)`);
    }
  });

  // 5. Validate PROMPTMASTER required events
  const requiredEvents = [
    'onboarding_started',
    'dog_created',
    'view_item_list',
    'view_item',
    'add_to_cart',
    'subscribe_click',
    'subscription_confirmed',
    'subscription_date_change',
    'inbox_open',
    'notification_click',
    'mission_completed',
    'badge_unlocked',
    'reward_redeemed',
    'ai_chat_started',
    'ai_vet_selected',
    'ai_educator_selected',
    'ai_groomer_selected',
    'ai_message_sent'
  ];

  const missingRequiredEvents: string[] = [];
  requiredEvents.forEach(event => {
    if (!schemaEvents.includes(event)) {
      missingRequiredEvents.push(event);
      issues.push(`❌ Missing required PROMPTMASTER event: ${event}`);
    }
  });

  // Report results
  console.log('📊 Validation Results:');
  console.log('─'.repeat(60));

  if (issues.length === 0) {
    console.log('✅ All GA4 events are properly defined and mapped!');
    console.log(`✅ Schema contains all ${requiredEvents.length} required PROMPTMASTER events`);
    console.log(`✅ ${uniqueUsedEvents.length} events used in code`);
    console.log(`✅ ${uniqueRegistryEvents.length} events mapped in CTA registry`);
  } else {
    console.log(`❌ Found ${issues.length} issues:\n`);
    issues.forEach(issue => console.log(issue));

    if (eventsNotInSchema.length > 0) {
      console.log('\n📝 Events used in code but not in schema:');
      trackEventCalls
        .filter(call => eventsNotInSchema.includes(call.event))
        .forEach(call => {
          console.log(`   ${call.event} in ${call.file}`);
        });
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   • Schema events: ${schemaEvents.length}`);
  console.log(`   • Used events: ${uniqueUsedEvents.length}`);
  console.log(`   • Registry events: ${uniqueRegistryEvents.length}`);
  console.log(`   • Required PROMPTMASTER events: ${requiredEvents.length - missingRequiredEvents.length}/${requiredEvents.length}`);
  console.log(`   • Issues found: ${issues.length}`);

  if (issues.length > 0) {
    console.log('\n💡 To fix issues:');
    console.log('   1. Add missing events to events.schema.ts');
    console.log('   2. Update CTA registry with correct event mappings');
    console.log('   3. Remove unused events from schema');
    console.log('   4. Ensure all PROMPTMASTER events are implemented');
    process.exit(1);
  }

  console.log('\n🎉 GA4 Schema validation passed!');
}

// Run validation
validateGA4Schema().catch(error => {
  console.error('💥 Validation failed:', error);
  process.exit(1);
});