#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Test configuration
const TEST_SUITES = {
  unit: {
    command: 'jest --config jest.config.js',
    description: 'Unit tests with Jest',
    timeout: 300000, // 5 minutes
  },
  integration: {
    command: 'jest --config jest.config.js tests/integration',
    description: 'Integration tests',
    timeout: 600000, // 10 minutes
  },
  e2e: {
    command: 'playwright test',
    description: 'End-to-end tests with Playwright',
    timeout: 1200000, // 20 minutes
  },
  a11y: {
    command: 'playwright test --config playwright-a11y.config.ts',
    description: 'Accessibility tests',
    timeout: 900000, // 15 minutes
  },
  lighthouse: {
    command: 'lhci autorun --config lighthouse.config.js',
    description: 'Performance tests with Lighthouse',
    timeout: 1800000, // 30 minutes
  },
  load: {
    command: 'playwright test tests/load',
    description: 'Load testing',
    timeout: 900000, // 15 minutes
  },
}

// Color utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function log(message, color = 'reset') {
  console.log(colorize(message, color))
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(`  ${title}`, 'bright')
  console.log('='.repeat(60))
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(40))
  log(`  ${title}`, 'cyan')
  console.log('-'.repeat(40))
}

// Utility functions
function checkPrerequisites() {
  logSection('Checking Prerequisites')

  const requirements = [
    { command: 'node --version', name: 'Node.js' },
    { command: 'npm --version', name: 'npm' },
  ]

  for (const req of requirements) {
    try {
      const version = execSync(req.command, { encoding: 'utf8' }).trim()
      log(`✓ ${req.name}: ${version}`, 'green')
    } catch (error) {
      log(`✗ ${req.name}: Not found`, 'red')
      process.exit(1)
    }
  }

  // Check if dependencies are installed
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    log('Installing dependencies...', 'yellow')
    execSync('npm install', { stdio: 'inherit' })
  }

  log('\n✓ All prerequisites met', 'green')
}

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    log(`Running: ${command}`, 'blue')

    const child = spawn('sh', ['-c', command], {
      stdio: 'inherit',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    })

    // Timeout handling
    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Command timed out after ${options.timeout || 300000}ms`))
    }, options.timeout || 300000)

    child.on('close', (code) => {
      clearTimeout(timeout)
      const duration = Date.now() - startTime
      const durationStr = `${(duration / 1000).toFixed(1)}s`

      if (code === 0) {
        log(`✓ Command completed successfully in ${durationStr}`, 'green')
        resolve({ code, duration })
      } else {
        log(`✗ Command failed with code ${code} after ${durationStr}`, 'red')
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

async function runTestSuite(suiteName, config) {
  logSubSection(`Running ${config.description}`)

  try {
    const result = await runCommand(config.command, {
      timeout: config.timeout,
      env: {
        CI: process.env.CI,
        NODE_ENV: 'test',
      },
    })

    return {
      suite: suiteName,
      success: true,
      duration: result.duration,
    }
  } catch (error) {
    log(`Failed: ${error.message}`, 'red')
    return {
      suite: suiteName,
      success: false,
      error: error.message,
    }
  }
}

function generateReport(results) {
  logSection('Test Results Summary')

  const totalSuites = results.length
  const passedSuites = results.filter(r => r.success).length
  const failedSuites = results.filter(r => !r.success).length

  log(`Total test suites: ${totalSuites}`, 'blue')
  log(`Passed: ${passedSuites}`, 'green')
  log(`Failed: ${failedSuites}`, 'red')

  console.log('\nDetailed Results:')
  console.log('-'.repeat(80))

  for (const result of results) {
    const status = result.success ? '✓' : '✗'
    const color = result.success ? 'green' : 'red'
    const duration = result.duration ? `(${(result.duration / 1000).toFixed(1)}s)` : ''

    log(`${status} ${result.suite} ${duration}`, color)
    if (result.error) {
      log(`  Error: ${result.error}`, 'red')
    }
  }

  // Generate JSON report
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalSuites,
      passed: passedSuites,
      failed: failedSuites,
      success: failedSuites === 0,
    },
    results,
  }

  const reportDir = path.join(process.cwd(), 'test-results')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const reportPath = path.join(reportDir, 'test-summary.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

  log(`\n📄 Report saved to: ${reportPath}`, 'cyan')

  return failedSuites === 0
}

async function runAllTests() {
  logSection('PiùCane Platform Test Suite')

  checkPrerequisites()

  const suitesToRun = process.argv.slice(2)
  const allSuites = Object.keys(TEST_SUITES)

  if (suitesToRun.length === 0) {
    log('No specific suites specified, running all tests...', 'yellow')
    suitesToRun.push(...allSuites)
  } else {
    // Validate suite names
    for (const suite of suitesToRun) {
      if (!TEST_SUITES[suite]) {
        log(`Unknown test suite: ${suite}`, 'red')
        log(`Available suites: ${allSuites.join(', ')}`, 'blue')
        process.exit(1)
      }
    }
  }

  log(`Running test suites: ${suitesToRun.join(', ')}`, 'cyan')

  const results = []

  for (const suiteName of suitesToRun) {
    const config = TEST_SUITES[suiteName]
    const result = await runTestSuite(suiteName, config)
    results.push(result)

    // Continue with other tests even if one fails (unless --fail-fast)
    if (!result.success && process.argv.includes('--fail-fast')) {
      log('Stopping due to --fail-fast flag', 'yellow')
      break
    }
  }

  const success = generateReport(results)

  if (success) {
    log('\n🎉 All tests passed!', 'green')
    process.exit(0)
  } else {
    log('\n💥 Some tests failed!', 'red')
    process.exit(1)
  }
}

// CLI help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colorize('PiùCane Test Runner', 'bright')}

Usage: node scripts/test-runner.js [suites...] [options]

Available test suites:
${Object.entries(TEST_SUITES)
  .map(([name, config]) => `  ${colorize(name, 'cyan')}: ${config.description}`)
  .join('\n')}

Options:
  --fail-fast    Stop running tests after first failure
  --help, -h     Show this help message

Examples:
  node scripts/test-runner.js                    # Run all tests
  node scripts/test-runner.js unit e2e           # Run specific suites
  node scripts/test-runner.js unit --fail-fast   # Stop on first failure
`)
  process.exit(0)
}

// Run the tests
runAllTests().catch((error) => {
  log(`Fatal error: ${error.message}`, 'red')
  process.exit(1)
})