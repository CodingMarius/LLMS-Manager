/**
 * @module LLMSManager
 * @version 1.0.0
 * @author Marius Heinrich
 * @license MIT
 *
 * @description
 * Ultra high quality Node.js library to manage
 * - sitemap.xml fetching/parsing (http & https fallback, file:// support)
 * - generation + validation + auto-correction of llms.txt (markdown)
 * - parsing llms.txt back to JSON (from URL or file)
 *
 * Uses only native Node.js modules:
 * - https, http
 * - fs/promises
 * - url
 *
 * Designed for robustness, strict validation, and enterprise integration.
 */

import { request as httpsRequest } from "https";
import { request as httpRequest } from "http";
import { URL, fileURLToPath } from "url";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

class LLMSManager {
  /** @type {string} */
  #sitemapUrl;

  /** @type {Array<{loc:string,priority:number}>} */
  #urls = [];

  /** @type {string} */
  #title = "";

  /** @type {string} */
  #description = "";

  /** @type {Array<{title:string,url:string}>} */
  #coreContent = [];

  /** @type {Array<{title:string,url:string}>} */
  #optionalContent = [];

  /** @type {Array<{loc:string,priority:number}>} */
  #sitemapEntries = [];

  /**
   * Create LLMSManager instance.
   * @param {object} options
   * @param {string} options.sitemapUrl - Absolute URL or local file URL to sitemap.xml
   */
  constructor({ sitemapUrl }) {
    if (typeof sitemapUrl !== "string" || sitemapUrl.trim() === "") {
      throw new TypeError("sitemapUrl must be a non-empty string");
    }
    const trimmed = sitemapUrl.trim();
    if (
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("file://")
    ) {
      throw new TypeError(
        "sitemapUrl must start with http://, https:// or file://"
      );
    }
    this.#sitemapUrl = trimmed;
  }

  /**
   * Load sitemap XML from URL or local file and parse to URLs array.
   * @returns {Promise<void>}
   * @throws Throws if XML invalid or no URLs found.
   */
  async loadSitemap() {
    const xml = await this.#fetchWithFallback(this.#sitemapUrl);
    const entries = this.#parseSitemapXml(xml);
    this.#sitemapEntries = entries;
    this.#urls = entries; // Alias for convenience
  }

  /**
   * Get loaded sitemap entries.
   * @returns {Array<{loc:string,priority:number}>}
   */
  getSitemapEntries() {
    return this.#sitemapEntries.slice();
  }

  /**
   * Internal method: Fetch content from URL or local file, with HTTP/HTTPS fallback.
   * @param {string} urlString
   * @returns {Promise<string>} Resolves raw response or file content text.
   * @throws Throws on fetch/read failure.
   */
  async #fetchWithFallback(urlString) {
    if (urlString.startsWith("file://")) {
      // Read local file
      try {
        const filePath = fileURLToPath(urlString);
        if (!existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        return await readFile(filePath, "utf-8");
      } catch (err) {
        throw new Error(`Failed to read local file: ${err.message}`);
      }
    }

    // Network fetch with fallback http <-> https
    const tryRequest = (urlObj) =>
      new Promise((resolve, reject) => {
        const lib = urlObj.protocol === "https:" ? httpsRequest : httpRequest;
        const req = lib(urlObj, (res) => {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `Failed to fetch ${urlObj.href} (Status: ${res.statusCode})`
              )
            );
            return;
          }
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.end();
      });

    try {
      const urlObj = new URL(urlString);
      return await tryRequest(urlObj);
    } catch (e) {
      try {
        // Fallback protocol switch
        const altUrl = urlString.startsWith("https://")
          ? urlString.replace(/^https:/, "http:")
          : urlString.replace(/^http:/, "https:");
        const altUrlObj = new URL(altUrl);
        return await tryRequest(altUrlObj);
      } catch (err) {
        throw new Error(
          `Failed to fetch URL with both protocols: ${e.message}; fallback error: ${err.message}`
        );
      }
    }
  }

  /**
   * Parse sitemap XML string extracting <url> blocks with <loc> and <priority>.
   * @param {string} xml Sitemap XML content.
   * @returns {Array<{loc: string, priority: number}>}
   * @throws Throws if no URLs found.
   */
  #parseSitemapXml(xml) {
    if (typeof xml !== "string") {
      throw new TypeError("XML must be string");
    }

    const urls = [];
    const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
    for (const block of urlBlocks) {
      const urlBlock = block[1];
      const locMatch = urlBlock.match(/<loc>([^<]+)<\/loc>/i);
      if (!locMatch) continue;
      const loc = locMatch[1].trim();

      const priorityMatch = urlBlock.match(/<priority>([\d.]+)<\/priority>/i);
      const priority = priorityMatch ? parseFloat(priorityMatch[1]) : 0.5;

      urls.push({ loc, priority });
    }

    if (urls.length === 0) {
      throw new Error("No URLs parsed from sitemap XML");
    }

    return urls;
  }

  /**
   * Set metadata for llms.txt header.
   * @param {string} title Main project/site title.
   * @param {string} description Short descriptive blockquote.
   */
  setMetadata(title, description) {
    if (typeof title !== "string" || title.trim() === "") {
      throw new TypeError("title must be non-empty string");
    }
    if (typeof description !== "string" || description.trim() === "") {
      throw new TypeError("description must be non-empty string");
    }
    this.#title = title.trim();
    this.#description = description.trim();
  }

  /**
   * Add core content items.
   * @param {Array<{title:string,url:string}>} items
   */
  addCoreContent(items) {
    this.#validateContentItems(items);
    this.#coreContent.push(...items);
  }

  /**
   * Add optional content items.
   * @param {Array<{title:string,url:string}>} items
   */
  addOptionalContent(items) {
    this.#validateContentItems(items);
    this.#optionalContent.push(...items);
  }

  /**
   * Validate content items array.
   * @param {Array<{title:string,url:string}>} items
   */
  #validateContentItems(items) {
    if (!Array.isArray(items)) {
      throw new TypeError("items must be array");
    }
    for (const i of items) {
      if (
        typeof i.title !== "string" ||
        i.title.trim() === "" ||
        typeof i.url !== "string" ||
        i.url.trim() === ""
      ) {
        throw new TypeError(
          "Each item must have non-empty string properties title and url"
        );
      }
    }
  }

  /**
   * Generates a clean, validated llms.txt markdown string.
   * - Exactly one H1 title
   * - Exactly one blockquote description
   * - Core Content section
   * - Optional section (if any)
   * - Deduplicated URLs
   *
   * @returns {string}
   */
  generateLLMSTxt() {
    // 1) Build raw lines
    const lines = [];

    // Title
    lines.push(`# ${this.#title}`);

    // Description blockquote
    lines.push(`> ${this.#description}`, ``);

    // Core Content header
    lines.push(`## Core Content`);
    for (const { title, url } of this.#coreContent) {
      lines.push(`- [${title}](${url})`);
    }
    lines.push(``); // blank line

    // Optional section
    if (this.#optionalContent.length) {
      lines.push(`## Optional`);
      for (const { title, url } of this.#optionalContent) {
        lines.push(`- [${title}](${url})`);
      }
      lines.push(``);
    }

    // 2) Deduplicate URLs while preserving order
    const seen = new Set();
    const finalLines = [];
    for (const line of lines) {
      if (line.startsWith(`- [`)) {
        const urlMatch = line.match(/\((.+)\)$/);
        if (urlMatch) {
          const url = urlMatch[1];
          if (seen.has(url)) continue;
          seen.add(url);
        }
      }
      finalLines.push(line);
    }

    // 3) Return joined content
    return finalLines.join("\n");
  }

  /**
   * Validates and autocorrects the llms.txt markdown content.
   * Ensures the structure meets the expected format:
   * - Exactly one H1 title at the start
   * - Exactly one blockquote immediately after the title with the description
   * - Proper sections "Core Content" and optional "Optional"
   * - Valid markdown link format with valid absolute URLs
   * - No duplicate URLs in content lists
   *
   * If any structural issues are found, this method will correct them automatically,
   * ensuring the output is consistent and valid.
   *
   * @param {string} text - The raw llms.txt markdown content to validate and correct.
   * @returns {string} - The validated and corrected markdown content.
   * @throws {Error} If critical sections are missing or malformed beyond correction.
   */
  #validateAndCorrectLLMSText(text) {
    // Split text by lines, trim trailing spaces only (preserve leading spaces)
    const lines = text.split("\n").map((line) => line.trimEnd());

    // --- 1. Fix H1 title line ---
    if (!lines[0] || !lines[0].startsWith("# ")) {
      lines.unshift(`# ${this.#title}`);
    } else if (lines[0] !== `# ${this.#title}`) {
      lines[0] = `# ${this.#title}`;
    }

    // --- 2. Fix blockquote description line directly below H1 ---
    if (!lines[1] || lines[1] !== `> ${this.#description}`) {
      // Remove all blockquote lines following the first line
      while (lines.length > 1 && lines[1].startsWith("> ")) {
        lines.splice(1, 1);
      }
      // Insert correct blockquote after H1
      lines.splice(1, 0, `> ${this.#description}`);
    }

    // --- 3. Find core and optional section indices ---
    const coreIndex = lines.findIndex((line) =>
      /^## Core Content$/i.test(line)
    );
    if (coreIndex === -1) {
      throw new Error("Missing '## Core Content' section");
    }
    const optionalIndex = lines.findIndex((line) =>
      /^## Optional$/i.test(line)
    );

    // --- 4. Validate lines in Core Content section ---
    const coreLines =
      optionalIndex === -1
        ? lines.slice(coreIndex + 1)
        : lines.slice(coreIndex + 1, optionalIndex);

    for (const line of coreLines) {
      if (line === "") continue;
      if (!/^- \[.+\]\(.+\)$/.test(line)) {
        throw new Error(`Invalid line in Core Content list: "${line}"`);
      }
      const urlMatch = line.match(/\((.+)\)/);
      if (urlMatch && !this.#isValidUrl(urlMatch[1])) {
        throw new Error(`Invalid URL in Core Content: "${urlMatch[1]}"`);
      }
    }

    // --- 5. Validate lines in Optional Content section ---
    if (optionalIndex !== -1) {
      const optionalLines = lines.slice(optionalIndex + 1);
      for (const line of optionalLines) {
        if (line === "") continue;
        if (!/^- \[.+\]\(.+\)$/.test(line)) {
          throw new Error(`Invalid line in Optional section: "${line}"`);
        }
        const urlMatch = line.match(/\((.+)\)/);
        if (urlMatch && !this.#isValidUrl(urlMatch[1])) {
          throw new Error(`Invalid URL in Optional section: "${urlMatch[1]}"`);
        }
      }
    }

    // --- 6. Remove duplicate URLs globally preserving order ---
    const seenUrls = new Set();
    const filteredLines = [];

    for (const line of lines) {
      if (line.startsWith("- [")) {
        const url = line.match(/\((.+)\)/)[1];
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }

    // --- 7. Return final corrected text ---
    return filteredLines.join("\n");
  }

  /**
   * Validate URL syntax.
   * @param {string} urlString
   * @returns {boolean}
   */
  #isValidUrl(urlString) {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save llms.txt content to file.
   * @param {string} filepath - Target file path
   * @returns {Promise<void>}
   */
  async saveToFile(filepath) {
    if (typeof filepath !== "string" || filepath.trim() === "") {
      throw new TypeError("filepath must be non-empty string");
    }
    const content = this.generateLLMSTxt();
    await writeFile(filepath, content, { encoding: "utf-8" });
  }

  /**
   * Parse llms.txt content (markdown) string to JSON representation.
   * @param {string} content - llms.txt markdown string.
   * @returns {object} Parsed JSON:
   * {
   *   title: string,
   *   description: string,
   *   coreContent: [{title:string,url:string}],
   *   optionalContent: [{title:string,url:string}]
   * }
   */
  static parseLLMSTxt(content) {
    if (typeof content !== "string") {
      throw new TypeError("content must be string");
    }
    const lines = content.split("\n").map((l) => l.trim());

    // Parse title (# line)
    const titleLine = lines.find((l) => l.startsWith("# "));
    if (!titleLine) throw new Error("Missing # Title line");
    const title = titleLine.replace(/^# /, "").trim();

    // Parse description (blockquote >)
    const descLine = lines.find((l) => l.startsWith("> "));
    if (!descLine) throw new Error("Missing > Description line");
    const description = descLine.replace(/^> /, "").trim();

    // Parse sections Core Content and Optional
    const coreContent = [];
    const optionalContent = [];

    let mode = null;
    for (const line of lines) {
      if (/^## Core Content$/i.test(line)) {
        mode = "core";
        continue;
      }
      if (/^## Optional$/i.test(line)) {
        mode = "optional";
        continue;
      }
      if (line.startsWith("- [") && mode) {
        const match = line.match(/^- \[(.+?)\]\((.+?)\)$/);
        if (!match) continue;
        const [, t, u] = match;
        if (mode === "core") coreContent.push({ title: t, url: u });
        else if (mode === "optional")
          optionalContent.push({ title: t, url: u });
      }
    }

    if (coreContent.length === 0) {
      throw new Error("No core content items found in llms.txt");
    }

    return { title, description, coreContent, optionalContent };
  }

  /**
   * Parse llms.txt from a file path.
   * @param {string} filepath
   * @returns {Promise<object>} Parsed JSON as per parseLLMSTxt
   */
  static async parseLLMSTxtFromFile(filepath) {
    if (typeof filepath !== "string" || filepath.trim() === "") {
      throw new TypeError("filepath must be non-empty string");
    }
    const content = await readFile(filepath, { encoding: "utf-8" });
    return LLMSManager.parseLLMSTxt(content);
  }

  /**
   * Parse llms.txt from a URL (http or https).
   * @param {string} url
   * @returns {Promise<object>} Parsed JSON as per parseLLMSTxt
   */
  static async parseLLMSTxtFromUrl(url) {
    if (typeof url !== "string" || url.trim() === "") {
      throw new TypeError("url must be non-empty string");
    }
    const text = await LLMSManager.#staticFetchUrl(url.trim());
    return LLMSManager.parseLLMSTxt(text);
  }

  /**
   * Static internal helper for fetching URL content (http/https with fallback).
   * @private
   * @param {string} urlString
   * @returns {Promise<string>}
   */
  static async #staticFetchUrl(urlString) {
    const tryRequest = (urlObj) =>
      new Promise((resolve, reject) => {
        const lib = urlObj.protocol === "https:" ? httpsRequest : httpRequest;
        const req = lib(urlObj, (res) => {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `Failed to fetch ${urlObj.href} (Status: ${res.statusCode})`
              )
            );
            return;
          }
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        });
        req.on("error", (e) => reject(e));
        req.end();
      });

    try {
      const urlObj = new URL(urlString);
      return await tryRequest(urlObj);
    } catch (e) {
      try {
        const altUrl = urlString.startsWith("https://")
          ? urlString.replace(/^https:/, "http:")
          : urlString.replace(/^http:/, "https:");
        const altUrlObj = new URL(altUrl);
        return await tryRequest(altUrlObj);
      } catch (err) {
        throw new Error(
          `Static fetch failed with both protocols: ${e.message}; fallback error: ${err.message}`
        );
      }
    }
  }

  /**
   * Automatically generate core content list from sitemap URLs filtered by priority.
   * @param {number} [threshold=0.5] Minimum priority
   * @returns {Array<{title:string, url:string}>}
   */
  autoGenerateCoreContent(threshold = 0.5) {
    if (!Array.isArray(this.#urls) || this.#urls.length === 0) {
      throw new Error("Sitemap URLs not loaded or empty");
    }
    return this.#urls
      .filter(({ priority }) => priority >= threshold)
      .map(({ loc }) => ({
        title: this.#extractTitleFromUrl(loc),
        url: loc,
      }));
  }

  /**
   * Extract human-readable title from URL path.
   * @param {string} url
   * @returns {string}
   */
  #extractTitleFromUrl(url) {
    try {
      const u = new URL(url);
      let p = u.pathname;
      if (!p || p === "/") return u.hostname;
      p = p.replace(/\/$/, "");
      const lastSeg = p.split("/").pop();
      return decodeURIComponent(lastSeg)
        .replace(/[-_]+/g, " ")
        .replace(/\.\w+$/, "")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return url;
    }
  }
}

export default LLMSManager;
