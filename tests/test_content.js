"use strict";

const assert = require("assert");
const { runTests } = require("./_runner");
const { loadPopupApi } = require("./_helpers");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function longText(label) {
  return `${label} `.repeat(40);
}

function extract(html, url = "https://example.com/articles/post/") {
  return loadPopupApi({ html, url }).extractPageContent();
}

test("extractPageContent uses main content when it is substantial", () => {
  const page = extract(`
    <html><head><title>Fallback</title></head><body>
      <nav>Navigation should disappear</nav>
      <main><h1>Main Title</h1><p>${longText("main body")}</p></main>
      <div>${longText("outside body")}</div>
      <aside>${longText("aside")}</aside>
    </body></html>
  `);
  assert.strictEqual(page.title, "Fallback");
  assert.match(page.text, /main body/);
  assert.doesNotMatch(page.text, /outside body/);
  assert.doesNotMatch(page.html, /Navigation should disappear/);
});

test("extractPageContent detects article content", () => {
  const page = extract(`
    <html><head><title>Article Page</title></head><body>
      <article><h1>Article Title</h1><p>${longText("article text")}</p></article>
      <div>${longText("boilerplate")}</div>
    </body></html>
  `);
  assert.match(page.text, /article text/);
  assert.doesNotMatch(page.text, /boilerplate/);
});

test("extractPageContent detects .content containers", () => {
  const page = extract(`
    <html><head><title>Content Page</title></head><body>
      <div class="content"><h1>Content Title</h1><p>${longText("content text")}</p></div>
      <div class="sidebar">${longText("sidebar")}</div>
    </body></html>
  `);
  assert.match(page.text, /content text/);
  assert.doesNotMatch(page.html, /sidebar/);
});

test("extractPageContent prefers Open Graph title", () => {
  const page = extract(`
    <html><head>
      <title>Document Title</title>
      <meta property="og:title" content="Open Graph Title">
    </head><body><main><p>${longText("body")}</p></main></body></html>
  `);
  assert.strictEqual(page.title, "Open Graph Title");
});

test("extractPageContent resolves relative links and images", () => {
  const page = extract(`
    <html><head><title>Links</title></head><body>
      <main>
        <p>${longText("body")}</p>
        <a href="../about">About</a>
        <img src="/images/hero.png" alt="Hero">
      </main>
    </body></html>
  `, "https://example.com/articles/post/");
  assert.match(page.html, /href="https:\/\/example\.com\/articles\/about"/);
  assert.match(page.html, /src="https:\/\/example\.com\/images\/hero\.png"/);
});

test("extractPageContent removes ads and navigation", () => {
  const page = extract(`
    <html><head><title>Clean</title></head><body>
      <main>
        <nav>Inline nav</nav>
        <div class="ad">Buy now</div>
        <div class="advertisement">Sponsored</div>
        <p>${longText("readable body")}</p>
      </main>
    </body></html>
  `);
  assert.match(page.text, /readable body/);
  assert.doesNotMatch(page.html, /Inline nav/);
  assert.doesNotMatch(page.html, /Buy now/);
  assert.doesNotMatch(page.html, /Sponsored/);
});

function run() {
  return runTests("test_content.js", tests, { exitOnFail: require.main === module });
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { test, run, tests };
