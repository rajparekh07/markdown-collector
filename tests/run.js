"use strict";

const path = require("path");
const { colors } = require("./_runner");

const modules = [
  "./test_turndown",
  "./test_jszip",
  "./test_utils",
  "./test_content"
];

async function main() {
  let passed = 0;
  let failed = 0;

  for (const modulePath of modules) {
    const testModule = require(path.join(__dirname, modulePath));
    console.log(`${colors.cyan}${path.basename(modulePath)}.js${colors.reset}`);

    for (const { name, fn } of testModule.tests) {
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
    console.log("");
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
