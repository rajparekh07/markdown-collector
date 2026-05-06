"use strict";

const assert = require("assert");
const { runTests } = require("./_runner");
const { loadJSZip, parseZip, readUInt32LE } = require("./_helpers");

const JSZip = loadJSZip();
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("creates a single file ZIP", async () => {
  const zip = new JSZip();
  const bytes = await zip.file("hello.md", "# Hello").generateAsync({ type: "uint8array" });
  const entries = parseZip(bytes);
  assert.deepStrictEqual(entries, [{ name: "hello.md", content: "# Hello" }]);
});

test("creates a multiple file ZIP", async () => {
  const zip = new JSZip();
  const bytes = await zip
    .file("one.md", "One")
    .file("two.md", "Two")
    .generateAsync({ type: "uint8array" });
  assert.deepStrictEqual(parseZip(bytes), [
    { name: "one.md", content: "One" },
    { name: "two.md", content: "Two" }
  ]);
});

test("creates an empty ZIP", async () => {
  const bytes = await new JSZip().generateAsync({ type: "uint8array" });
  assert.strictEqual(bytes.length, 22);
  assert.strictEqual(readUInt32LE(bytes, 0), 0x06054b50);
});

test("sanitizes leading slashes in file names", async () => {
  const bytes = await new JSZip().file("///notes/page.md", "Body").generateAsync({ type: "uint8array" });
  assert.strictEqual(parseZip(bytes)[0].name, "notes/page.md");
});

test("generates Blob output by default", async () => {
  const blob = await new JSZip().file("hello.md", "Hello").generateAsync({ type: "blob" });
  assert.ok(blob instanceof Blob);
  assert.strictEqual(blob.type, "application/zip");
});

test("generates Uint8Array output", async () => {
  const bytes = await new JSZip().file("hello.md", "Hello").generateAsync({ type: "uint8array" });
  assert.ok(bytes instanceof Uint8Array);
  assert.strictEqual(readUInt32LE(bytes, 0), 0x04034b50);
});

async function run() {
  return runTests("test_jszip.js", tests, { exitOnFail: require.main === module });
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { test, run, tests };
