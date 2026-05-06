"use strict";

const assert = require("assert");
const { runTests } = require("./_runner");
const { loadTurndown } = require("./_helpers");

const TurndownService = loadTurndown();
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("converts basic HTML paragraphs to Markdown", () => {
  const service = new TurndownService();
  assert.strictEqual(service.turndown("<p>Hello world</p>"), "Hello world");
});

test("converts headings using ATX style", () => {
  const service = new TurndownService({ headingStyle: "atx" });
  const markdown = service.turndown("<h1>Title</h1><h3>Section</h3>");
  assert.match(markdown, /^# Title/);
  assert.match(markdown, /### Section$/);
});

test("converts h1 and h2 headings using setext style", () => {
  const service = new TurndownService({ headingStyle: "setext" });
  const markdown = service.turndown("<h1>Title</h1><h2>Section</h2>");
  assert.match(markdown, /Title\n={3,}/);
  assert.match(markdown, /Section\n-{3,}/);
});

test("converts bold, italic, inline code, links, and images", () => {
  const service = new TurndownService();
  const markdown = service.turndown("<p><strong>Bold</strong> <em>em</em> <code>x()</code> <a href=\"https://example.com/a b\">link</a> <img src=\"/img.png\" alt=\"Logo\"></p>");
  assert.match(markdown, /\*\*Bold\*\*/);
  assert.match(markdown, /_em_/);
  assert.match(markdown, /`x\(\)`/);
  assert.match(markdown, /\[link\]\(https:\/\/example\.com\/a%20b\)/);
  assert.match(markdown, /!\[Logo\]\(\/img\.png\)/);
});

test("converts unordered and ordered lists", () => {
  const service = new TurndownService({ bulletListMarker: "*" });
  const markdown = service.turndown("<ul><li>One</li><li>Two</li></ul><ol><li>First</li><li>Second</li></ol>");
  assert.match(markdown, /\* One/);
  assert.match(markdown, /\* Two/);
  assert.match(markdown, /1\. First/);
  assert.match(markdown, /1\. Second/);
});

test("converts blockquotes", () => {
  const service = new TurndownService();
  assert.strictEqual(service.turndown("<blockquote><p>Quoted text</p></blockquote>"), "> Quoted text");
});

test("converts fenced code blocks with language", () => {
  const service = new TurndownService({ codeBlockStyle: "fenced" });
  const markdown = service.turndown("<pre><code class=\"language-js\">const x = 1;\nconsole.log(x);</code></pre>");
  assert.strictEqual(markdown, "```js\nconst x = 1;\nconsole.log(x);\n```");
});

test("converts indented code blocks", () => {
  const service = new TurndownService({ codeBlockStyle: "indented" });
  assert.strictEqual(service.turndown("<pre>line 1\nline 2</pre>"), "    line 1\n    line 2");
});

test("converts tables", () => {
  const service = new TurndownService();
  const markdown = service.turndown("<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>");
  assert.strictEqual(markdown, "| Name | Value |\n| --- | --- |\n| A | 1 |");
});

test("converts horizontal rules", () => {
  const service = new TurndownService();
  assert.strictEqual(service.turndown("<p>Before</p><hr><p>After</p>"), "Before\n\n---\n\nAfter");
});

test("preserves nested formatting", () => {
  const service = new TurndownService();
  assert.strictEqual(service.turndown("<p><strong>Bold and <em>italic</em></strong></p>"), "**Bold and _italic_**");
});

test("handles empty input", () => {
  const service = new TurndownService();
  assert.strictEqual(service.turndown(""), "");
  assert.strictEqual(service.turndown(null), "");
});

test("handles malformed HTML", () => {
  const service = new TurndownService();
  const markdown = service.turndown("<h1>Broken<p>Body");
  assert.match(markdown, /Broken/);
  assert.match(markdown, /Body/);
});

function run() {
  return runTests("test_turndown.js", tests, { exitOnFail: require.main === module });
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { test, run, tests };
