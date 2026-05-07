"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const VOID_TAGS = new Set(["AREA", "BASE", "BR", "COL", "EMBED", "HR", "IMG", "INPUT", "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"]);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function decodeEntity(value) {
  return String(value)
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

class TestTextNode {
  constructor(value) {
    this.nodeType = TEXT_NODE;
    this.nodeValue = decodeEntity(value || "");
    this.parentElement = null;
  }

  get textContent() {
    return this.nodeValue;
  }

  set textContent(value) {
    this.nodeValue = String(value || "");
  }

  cloneNode() {
    return new TestTextNode(this.nodeValue);
  }

  serialize() {
    return escapeHtml(this.nodeValue);
  }
}

class TestClassList {
  constructor(element) {
    this.element = element;
  }

  add(...classNames) {
    const tokens = this.tokens();
    for (const className of classNames) {
      if (className) {
        tokens.add(className);
      }
    }
    this.write(tokens);
  }

  remove(...classNames) {
    const tokens = this.tokens();
    for (const className of classNames) {
      tokens.delete(className);
    }
    this.write(tokens);
  }

  toggle(className, force) {
    const tokens = this.tokens();
    const shouldAdd = force === undefined ? !tokens.has(className) : Boolean(force);
    if (shouldAdd) {
      tokens.add(className);
    } else {
      tokens.delete(className);
    }
    this.write(tokens);
    return shouldAdd;
  }

  contains(className) {
    return this.tokens().has(className);
  }

  tokens() {
    return new Set((this.element.className || "").split(/\s+/).filter(Boolean));
  }

  write(tokens) {
    this.element.className = Array.from(tokens).join(" ");
  }
}

class TestElement {
  constructor(tagName, attributes = {}) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = String(tagName || "div").toUpperCase();
    this.attributes = {};
    this.childNodes = [];
    this.parentElement = null;
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.classList = new TestClassList(this);

    for (const [name, value] of Object.entries(attributes)) {
      this.setAttribute(name, value);
    }
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === ELEMENT_NODE);
  }

  get className() {
    return this.getAttribute("class") || "";
  }

  set className(value) {
    this.setAttribute("class", value);
  }

  get id() {
    return this.getAttribute("id") || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this.childNodes = [new TestTextNode(value)];
    this.childNodes[0].parentElement = this;
  }

  get innerText() {
    return this.textContent;
  }

  get innerHTML() {
    return this.childNodes.map((child) => child.serialize()).join("");
  }

  set innerHTML(value) {
    this.childNodes = [new TestTextNode(value)];
    this.childNodes[0].parentElement = this;
  }

  get content() {
    return this.getAttribute("content") || "";
  }

  set content(value) {
    this.setAttribute("content", value);
  }

  appendChild(node) {
    node.parentElement = this;
    this.childNodes.push(node);
    return node;
  }

  append(...nodes) {
    for (const node of nodes) {
      this.appendChild(typeof node === "string" ? new TestTextNode(node) : node);
    }
  }

  addEventListener(type, listener) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.listeners[type]) {
      return;
    }
    this.listeners[type] = this.listeners[type].filter((entry) => entry !== listener);
  }

  focus() {}

  select() {}

  remove() {
    if (!this.parentElement) {
      return;
    }
    const siblings = this.parentElement.childNodes;
    const index = siblings.indexOf(this);
    if (index !== -1) {
      siblings.splice(index, 1);
    }
    this.parentElement = null;
  }

  getAttribute(name) {
    const key = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(this.attributes, key) ? this.attributes[key] : null;
  }

  setAttribute(name, value) {
    this.attributes[String(name).toLowerCase()] = String(value);
  }

  removeAttribute(name) {
    delete this.attributes[String(name).toLowerCase()];
  }

  cloneNode(deep = false) {
    const clone = new TestElement(this.tagName, this.attributes);
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = splitSelectorList(selector);
    const matches = [];
    walkElements(this, (element) => {
      if (element === this) {
        return;
      }
      if (selectors.some((item) => matchesSelector(element, item))) {
        matches.push(element);
      }
    });
    return matches;
  }

  serialize() {
    const attrs = Object.entries(this.attributes)
      .map(([name, value]) => value === "" ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`)
      .join("");
    if (VOID_TAGS.has(this.tagName)) {
      return `<${this.tagName.toLowerCase()}${attrs}>`;
    }
    return `<${this.tagName.toLowerCase()}${attrs}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }
}

class TestDocument {
  constructor(root) {
    this.nodeType = 9;
    this.documentElement = root;
    this.body = root.querySelector("body") || root;
  }

  get title() {
    const title = this.querySelector("title");
    return title ? title.textContent.trim() : "";
  }

  get textContent() {
    return this.documentElement.textContent;
  }

  get innerText() {
    return this.textContent;
  }

  addEventListener() {}

  querySelector(selector) {
    if (matchesSelector(this.documentElement, selector)) {
      return this.documentElement;
    }
    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector) {
    const selectors = splitSelectorList(selector);
    const matches = [];
    if (selectors.some((item) => matchesSelector(this.documentElement, item))) {
      matches.push(this.documentElement);
    }
    return matches.concat(this.documentElement.querySelectorAll(selector));
  }

  createElement(tagName) {
    return new TestElement(tagName);
  }
}

class TestDOMParser {
  parseFromString(input) {
    return parseHtmlDocument(input);
  }
}

function splitSelectorList(selector) {
  const selectors = [];
  let current = "";
  let bracketDepth = 0;

  for (const char of String(selector)) {
    if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth -= 1;
    }
    if (char === "," && bracketDepth === 0) {
      if (current.trim()) {
        selectors.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    selectors.push(current.trim());
  }
  return selectors;
}

function parseSimpleSelector(selector) {
  const result = { tag: null, id: null, classes: [], attrs: [] };
  let value = selector.trim();

  const tag = value.match(/^[a-zA-Z][\w-]*/);
  if (tag) {
    result.tag = tag[0].toUpperCase();
    value = value.slice(tag[0].length);
  }

  const partPattern = /([.#])([\w-]+)|\[([\w-]+)(?:=(['"]?)(.*?)\4)?\]/g;
  let match;
  while ((match = partPattern.exec(value))) {
    if (match[1] === ".") {
      result.classes.push(match[2]);
    } else if (match[1] === "#") {
      result.id = match[2];
    } else {
      result.attrs.push({
        name: match[3].toLowerCase(),
        value: match[5] === undefined ? null : match[5]
      });
    }
  }
  return result;
}

function matchesSelector(element, selector) {
  if (!element || element.nodeType !== ELEMENT_NODE) {
    return false;
  }

  const parsed = parseSimpleSelector(selector);
  if (parsed.tag && element.tagName !== parsed.tag) {
    return false;
  }
  if (parsed.id && element.id !== parsed.id) {
    return false;
  }
  const classNames = new Set((element.className || "").split(/\s+/).filter(Boolean));
  if (parsed.classes.some((className) => !classNames.has(className))) {
    return false;
  }
  return parsed.attrs.every((attr) => {
    const current = element.getAttribute(attr.name);
    if (current === null) {
      return false;
    }
    return attr.value === null || current === attr.value;
  });
}

function walkElements(root, visit) {
  for (const child of root.childNodes || []) {
    if (child.nodeType === ELEMENT_NODE) {
      visit(child);
      walkElements(child, visit);
    }
  }
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;

  while ((match = pattern.exec(source))) {
    attributes[match[1].toLowerCase()] = decodeEntity(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function parseHtmlDocument(input) {
  const root = new TestElement("html");
  const stack = [root];
  const tokens = String(input || "").match(/<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[^>]+>|[^<]+/gi) || [];

  for (const token of tokens) {
    if (token.startsWith("<!--") || /^<!doctype/i.test(token)) {
      continue;
    }
    if (token.startsWith("</")) {
      const closingName = token.slice(2, -1).trim().split(/\s+/)[0].toUpperCase();
      while (stack.length > 1) {
        const popped = stack.pop();
        if (popped.tagName === closingName) {
          break;
        }
      }
      continue;
    }
    if (token.startsWith("<")) {
      const selfClosing = /\/>$/.test(token);
      const raw = token.slice(1, selfClosing ? -2 : -1).trim();
      const spaceIndex = raw.search(/\s/);
      const tagName = (spaceIndex === -1 ? raw : raw.slice(0, spaceIndex)).toUpperCase();
      const attrSource = spaceIndex === -1 ? "" : raw.slice(spaceIndex + 1);
      const element = new TestElement(tagName, parseAttributes(attrSource));
      stack[stack.length - 1].appendChild(element);
      if (!selfClosing && !VOID_TAGS.has(tagName)) {
        stack.push(element);
      }
      continue;
    }
    stack[stack.length - 1].appendChild(new TestTextNode(token));
  }

  if (!root.querySelector("body")) {
    const body = new TestElement("body");
    body.childNodes = root.childNodes;
    for (const child of body.childNodes) {
      child.parentElement = body;
    }
    root.childNodes = [];
    root.appendChild(body);
  }

  return new TestDocument(root);
}

function createBaseContext(overrides = {}) {
  const document = overrides.document || {
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName) {
      return new TestElement(tagName);
    },
    body: new TestElement("body"),
    documentElement: new TestElement("html"),
    title: ""
  };
  const context = {
    console,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint32Array,
    Blob,
    URL,
    setTimeout() {},
    clearTimeout() {},
    DOMParser: TestDOMParser,
    Node: { ELEMENT_NODE, TEXT_NODE },
    document,
    location: overrides.location || { href: "https://example.com/" },
    navigator: {},
    chrome: undefined,
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    Date,
    Math,
    window: {}
  };
  const cleanOverrides = Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined));
  Object.assign(context, cleanOverrides);
  context.window = Object.assign(context.window, context, overrides.window || {});
  return context;
}

function runScript(filename, context, transform = (source) => source) {
  const source = fs.readFileSync(path.join(repoRoot, filename), "utf8");
  vm.runInNewContext(transform(source), context, { filename });
  return context;
}

function loadTurndown() {
  const context = createBaseContext();
  runScript("turndown.js", context);
  return context.window.TurndownService;
}

function loadJSZip() {
  const context = createBaseContext();
  runScript("jszip.min.js", context);
  return context.window.JSZip;
}

function loadPopupApi(options = {}) {
  const names = [
    "state",
    "elements",
    "cacheElements",
    "captureCurrentPage",
    "addCustomPage",
    "yamlEscape",
    "slugify",
    "displayUrl",
    "snippet",
    "formatBytes",
    "relativeTime",
    "normalizeMarkdown",
    "addFrontmatter",
    "stripFrontmatter",
    "removeLeadingDuplicateHeading",
    "isValidPage",
    "isRestrictedUrl",
    "createId",
    "combineMarkdown",
    "escapeHtml",
    "escapeRegExp",
    "extractPageContent"
  ];
  const document = options.html ? parseHtmlDocument(options.html) : options.document;
  const contextOptions = { ...options };
  delete contextOptions.html;
  delete contextOptions.url;
  delete contextOptions.document;
  delete contextOptions.location;
  const context = createBaseContext({
    ...contextOptions,
    document,
    location: options.location || { href: options.url || "https://example.com/articles/demo?ref=1" }
  });
  runScript("popup.js", context, (source) => source.replace(/\}\)\(\);\s*$/, `window.__popupTestApi = { ${names.join(", ")} };\n})();`));
  return context.window.__popupTestApi;
}

function readUInt16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt32LE(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function parseZip(bytes) {
  const output = [];
  let offset = 0;
  const decoder = new TextDecoder();

  while (offset < bytes.length && readUInt32LE(bytes, offset) === 0x04034b50) {
    const compressedSize = readUInt32LE(bytes, offset + 18);
    const fileNameLength = readUInt16LE(bytes, offset + 26);
    const extraLength = readUInt16LE(bytes, offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const contentStart = nameEnd + extraLength;
    const contentEnd = contentStart + compressedSize;
    output.push({
      name: decoder.decode(bytes.slice(nameStart, nameEnd)),
      content: decoder.decode(bytes.slice(contentStart, contentEnd))
    });
    offset = contentEnd;
  }

  return output;
}

module.exports = {
  ELEMENT_NODE,
  TEXT_NODE,
  TestDOMParser,
  TestElement,
  parseHtmlDocument,
  loadTurndown,
  loadJSZip,
  loadPopupApi,
  parseZip,
  readUInt32LE
};
