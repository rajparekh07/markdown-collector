(() => {
  "use strict";

  const BLOCK_TAGS = new Set([
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "DIV",
    "DL",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "HEADER",
    "HR",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "UL"
  ]);

  function collapseWhitespace(value) {
    return value.replace(/[ \t\r\n]+/g, " ");
  }

  function trimBlankLines(value) {
    return value
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function escapeMarkdown(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/([*_`~])/g, "\\$1")
      .replace(/^([#>+-])/gm, "\\$1");
  }

  function normalizeUrl(value) {
    return (value || "").replace(/\s+/g, "%20").trim();
  }

  class TurndownService {
    constructor(options = {}) {
      this.options = {
        headingStyle: options.headingStyle || "atx",
        bulletListMarker: options.bulletListMarker || "-",
        codeBlockStyle: options.codeBlockStyle || "fenced"
      };
    }

    turndown(input) {
      if (!input) {
        return "";
      }

      const document = new DOMParser().parseFromString(String(input), "text/html");
      const body = document.body || document;
      return trimBlankLines(this.convertChildren(body, { listDepth: 0 }));
    }

    convertChildren(node, context) {
      return Array.from(node.childNodes)
        .map((child) => this.convertNode(child, context))
        .join("");
    }

    convertNode(node, context) {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeMarkdown(collapseWhitespace(node.nodeValue || ""));
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName;
      const childContext = { ...context };
      const children = () => this.convertChildren(node, childContext);
      const inlineChildren = () => trimBlankLines(children()).replace(/\n+/g, " ");

      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE") {
        return "";
      }

      if (tag === "BR") {
        return "  \n";
      }

      if (tag === "HR") {
        return "\n\n---\n\n";
      }

      if (/^H[1-6]$/.test(tag)) {
        const level = Number(tag.slice(1));
        const text = inlineChildren();
        if (!text) {
          return "";
        }
        if (this.options.headingStyle === "setext" && level <= 2) {
          return `\n\n${text}\n${(level === 1 ? "=" : "-").repeat(Math.max(3, text.length))}\n\n`;
        }
        return `\n\n${"#".repeat(level)} ${text}\n\n`;
      }

      if (tag === "P") {
        const text = trimBlankLines(children());
        return text ? `\n\n${text}\n\n` : "";
      }

      if (tag === "STRONG" || tag === "B") {
        const text = inlineChildren();
        return text ? `**${text}**` : "";
      }

      if (tag === "EM" || tag === "I") {
        const text = inlineChildren();
        return text ? `_${text}_` : "";
      }

      if (tag === "S" || tag === "DEL") {
        const text = inlineChildren();
        return text ? `~~${text}~~` : "";
      }

      if (tag === "CODE") {
        if (node.parentElement && node.parentElement.tagName === "PRE") {
          return node.textContent || "";
        }
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) {
          return "";
        }
        const fence = text.includes("`") ? "``" : "`";
        return `${fence}${text}${fence}`;
      }

      if (tag === "PRE") {
        const code = node.textContent ? node.textContent.replace(/\n+$/g, "") : "";
        if (!code) {
          return "";
        }
        if (this.options.codeBlockStyle === "indented") {
          return `\n\n${code.split("\n").map((line) => `    ${line}`).join("\n")}\n\n`;
        }
        const codeElement = node.querySelector("code");
        const className = codeElement ? codeElement.className || "" : "";
        const languageMatch = className.match(/language-([\w-]+)/);
        const language = languageMatch ? languageMatch[1] : "";
        return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
      }

      if (tag === "A") {
        const text = inlineChildren() || normalizeUrl(node.getAttribute("href"));
        const href = normalizeUrl(node.getAttribute("href"));
        if (!href) {
          return text;
        }
        return `[${text}](${href})`;
      }

      if (tag === "IMG") {
        const src = normalizeUrl(node.getAttribute("src"));
        if (!src) {
          return "";
        }
        const alt = escapeMarkdown(node.getAttribute("alt") || "");
        return `![${alt}](${src})`;
      }

      if (tag === "BLOCKQUOTE") {
        const text = trimBlankLines(children());
        if (!text) {
          return "";
        }
        return `\n\n${text.split("\n").map((line) => `> ${line}`.trimEnd()).join("\n")}\n\n`;
      }

      if (tag === "UL" || tag === "OL") {
        childContext.listDepth = (context.listDepth || 0) + 1;
        childContext.orderedList = tag === "OL";
        const text = trimBlankLines(this.convertChildren(node, childContext));
        return text ? `\n${text}\n` : "";
      }

      if (tag === "LI") {
        const marker = context.orderedList ? "1." : this.options.bulletListMarker;
        const indent = "  ".repeat(Math.max(0, (context.listDepth || 1) - 1));
        const text = trimBlankLines(children()).replace(/\n/g, `\n${indent}  `);
        return text ? `${indent}${marker} ${text}\n` : "";
      }

      if (tag === "TABLE") {
        return this.convertTable(node);
      }

      if (tag === "TR" || tag === "TBODY" || tag === "THEAD" || tag === "TFOOT") {
        return children();
      }

      if (tag === "TH" || tag === "TD") {
        return inlineChildren();
      }

      const text = children();
      if (BLOCK_TAGS.has(tag)) {
        return trimBlankLines(text) ? `\n\n${trimBlankLines(text)}\n\n` : "";
      }
      return text;
    }

    convertTable(table) {
      const rows = Array.from(table.querySelectorAll("tr"))
        .map((row) => Array.from(row.children)
          .filter((cell) => cell.tagName === "TH" || cell.tagName === "TD")
          .map((cell) => trimBlankLines(this.convertChildren(cell, {})).replace(/\|/g, "\\|").replace(/\n+/g, " ")))
        .filter((row) => row.length);

      if (!rows.length) {
        return "";
      }

      const width = Math.max(...rows.map((row) => row.length));
      const normalized = rows.map((row) => {
        const copy = row.slice();
        while (copy.length < width) {
          copy.push("");
        }
        return copy;
      });
      const header = normalized[0];
      const separator = header.map(() => "---");
      const body = normalized.slice(1);
      const lines = [header, separator, ...body].map((row) => `| ${row.join(" | ")} |`);
      return `\n\n${lines.join("\n")}\n\n`;
    }
  }

  window.TurndownService = TurndownService;
})();
