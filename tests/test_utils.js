"use strict";

const assert = require("assert");
const { runTests } = require("./_runner");
const { loadPopupApi } = require("./_helpers");

const utils = loadPopupApi();
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("yamlEscape escapes quotes and backslashes", () => {
  assert.strictEqual(utils.yamlEscape("A \"quote\" and \\ slash"), "A \\\"quote\\\" and \\\\ slash");
});

test("slugify creates safe file names", () => {
  assert.strictEqual(utils.slugify("Hello, World! 2026"), "hello-world-2026");
  assert.strictEqual(utils.slugify("!!!"), "page");
});

test("displayUrl compacts normal URLs and preserves invalid values", () => {
  assert.strictEqual(utils.displayUrl("https://example.com/path/page?x=1"), "example.com/path/page");
  assert.strictEqual(utils.displayUrl("not a url"), "not a url");
  assert.strictEqual(utils.displayUrl(""), "Custom page");
});

test("snippet strips Markdown syntax and frontmatter", () => {
  const markdown = "---\ntitle: \"A\"\n---\n\n# Title\n\n**Body** [link](https://example.com)";
  assert.strictEqual(utils.snippet(markdown), "Title Body link https://example.com");
});

test("formatBytes formats byte counts", () => {
  assert.strictEqual(utils.formatBytes(512), "512 B");
  assert.strictEqual(utils.formatBytes(1536), "1.5KB");
  assert.strictEqual(utils.formatBytes(2 * 1024 * 1024), "2.0MB");
});

test("relativeTime formats recent timestamps", () => {
  assert.strictEqual(utils.relativeTime(Date.now() - 30 * 1000), "just now");
  assert.match(utils.relativeTime(Date.now() - 2 * 60 * 1000), /^2 mins ago$/);
  assert.match(utils.relativeTime(Date.now() - 3 * 60 * 60 * 1000), /^3 hrs ago$/);
});

test("normalizeMarkdown normalizes line endings and spacing", () => {
  assert.strictEqual(utils.normalizeMarkdown(" A  \r\n\r\n\r\n\r\nB\t\n"), "A\n\n\nB");
});

test("addFrontmatter and stripFrontmatter round-trip Markdown body", () => {
  const body = "# Title\n\nBody";
  const markdown = utils.addFrontmatter(body, "A \"Title\"", "https://example.com/a", new Date("2026-01-02T03:04:05Z"));
  assert.match(markdown, /^---\ntitle: "A \\\"Title\\\""/);
  assert.strictEqual(utils.stripFrontmatter(markdown), body);
});

test("removeLeadingDuplicateHeading removes only matching first heading", () => {
  assert.strictEqual(utils.removeLeadingDuplicateHeading("# Title\n\nBody", "Title"), "Body");
  assert.strictEqual(utils.removeLeadingDuplicateHeading("# Other\n\nBody", "Title"), "# Other\n\nBody");
});

test("isValidPage accepts stored pages with id and markdown", () => {
  assert.strictEqual(utils.isValidPage({ id: "1", markdown: "Body" }), true);
  assert.strictEqual(utils.isValidPage({ id: 1, markdown: "Body" }), false);
  assert.strictEqual(utils.isValidPage({ id: "1" }), false);
});

test("isRestrictedUrl detects blocked browser schemes", () => {
  assert.strictEqual(utils.isRestrictedUrl("chrome://extensions"), true);
  assert.strictEqual(utils.isRestrictedUrl("chrome-extension://abc/popup.html"), true);
  assert.strictEqual(utils.isRestrictedUrl("https://example.com"), false);
});

test("createId returns a stable string identifier", () => {
  assert.strictEqual(utils.createId(), "00000000-0000-4000-8000-000000000001");
});

test("combineMarkdown combines pages with sources and duplicate heading removal", () => {
  const markdown = utils.combineMarkdown([
    { title: "Page One", url: "https://example.com/one", markdown: "---\na: b\n---\n\n# Page One\n\nBody one" },
    { title: "Page Two", url: "", markdown: "Body two" }
  ]);
  assert.match(markdown, /^# Page One\n\nBody one\n\nSource: https:\/\/example\.com\/one/);
  assert.match(markdown, /---\n\n# Page Two\n\nBody two\n\nSource: Custom page$/);
});

test("escapeHtml escapes HTML-sensitive characters", () => {
  assert.strictEqual(utils.escapeHtml("<a href=\"x\">It's & ok</a>"), "&lt;a href=&quot;x&quot;&gt;It&#039;s &amp; ok&lt;/a&gt;");
});

test("escapeRegExp escapes regular expression operators", () => {
  const escaped = utils.escapeRegExp("a+b*c?");
  assert.ok(new RegExp(escaped).test("a+b*c?"));
});

function run() {
  return runTests("test_utils.js", tests, { exitOnFail: require.main === module });
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { test, run, tests };
