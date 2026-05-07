"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { runTests } = require("./_runner");
const { loadPopupApi, parseHtmlDocument } = require("./_helpers");

const popupHtml = fs.readFileSync(path.join(__dirname, "..", "popup.html"), "utf8");
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

class StubTurndownService {
  turndown(html) {
    return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function createCrypto() {
  let count = 0;
  return {
    randomUUID() {
      count += 1;
      return `test-id-${count}`;
    }
  };
}

function createChrome(captures = []) {
  let captureIndex = -1;
  return {
    runtime: {},
    storage: {
      local: {
        set(_payload, callback) {
          callback();
        }
      }
    },
    action: {
      setBadgeText(_options, callback) {
        callback();
      },
      setBadgeBackgroundColor(_options, callback) {
        callback();
      }
    },
    tabs: {
      query(_queryInfo, callback) {
        captureIndex += 1;
        const capture = captures[captureIndex];
        callback(capture ? [{ id: captureIndex + 1, title: capture.title, url: capture.url }] : []);
      }
    },
    scripting: {
      executeScript(_options, callback) {
        const capture = captures[captureIndex];
        callback(capture ? [{ result: capture }] : []);
      }
    }
  };
}

function loadInteractivePopup(options = {}) {
  const api = loadPopupApi({
    crypto: createCrypto(),
    TurndownService: StubTurndownService,
    ...options,
    document: parseHtmlDocument(popupHtml)
  });
  api.cacheElements();
  return api;
}

test("captureCurrentPage appends captured pages to the end", async () => {
  const api = loadInteractivePopup({
    chrome: createChrome([
      {
        title: "Oldest capture",
        url: "https://example.com/oldest",
        html: "<main><h1>Oldest capture</h1><p>Readable page content for the first capture.</p></main>",
        text: "Readable page content for the first capture."
      },
      {
        title: "Newest capture",
        url: "https://example.com/newest",
        html: "<main><h1>Newest capture</h1><p>Readable page content for the second capture.</p></main>",
        text: "Readable page content for the second capture."
      }
    ])
  });

  await api.captureCurrentPage();
  await api.captureCurrentPage();

  assert.deepStrictEqual(Array.from(api.state.pages, (page) => page.title), [
    "Oldest capture",
    "Newest capture"
  ]);
});

test("addCustomPage appends custom pages to the end", async () => {
  const api = loadInteractivePopup();

  await api.addCustomPage();
  await api.addCustomPage();

  assert.deepStrictEqual(Array.from(api.state.pages, (page) => page.id), [
    "test-id-1",
    "test-id-2"
  ]);
});

function run() {
  return runTests("test_ordering.js", tests, { exitOnFail: require.main === module });
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { test, run, tests };
