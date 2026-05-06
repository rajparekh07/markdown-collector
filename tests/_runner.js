"use strict";

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m"
};

async function runTests(title, tests, options = {}) {
  let passed = 0;
  let failed = 0;

  if (title) {
    console.log(`${colors.cyan}${title}${colors.reset}`);
  }

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
      passed += 1;
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      console.log(`    ${error && error.stack ? error.stack.split("\n").slice(0, 3).join("\n    ") : error.message}`);
      failed += 1;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed && options.exitOnFail) {
    process.exit(1);
  }
  return { passed, failed };
}

module.exports = { colors, runTests };
