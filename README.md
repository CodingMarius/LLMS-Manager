# LLMS Manager

Ultra high quality Node.js library for managing:

- `sitemap.xml` fetching and parsing (supports `http`, `https`, `file://`)
- `llms.txt` generation, validation, and auto-correction (Markdown)
- Parsing `llms.txt` to structured JSON (from file or remote URL)

> Designed for **robustness**, **strict validation**, and **enterprise integration** — using only native Node.js modules.

---

## 🚀 Features

- ✅ Robust `sitemap.xml` loading via HTTP(S) or local file system
- ✅ Smart HTTP ↔ HTTPS fallback logic
- ✅ Auto-generates clean `llms.txt` from structured data
- ✅ Validates and auto-corrects invalid Markdown input
- ✅ Parses `llms.txt` back to JSON format
- ✅ Built-in title extraction and priority filtering from sitemap
- ✅ Zero dependencies (uses native Node.js modules only)

---

## 📦 Installation

```bash
npm install llms-manager
```
---

## 🧱 Basic Usage

```js
import LLMSManager from "llms-manager";

(async () => {
  try {
    // 1. Create instance with sitemap URL
    const manager = new LLMSManager({
      sitemapUrl: "https://example.com/sitemap-pages.xml",
    });

    // 2. Load and parse the sitemap
    await manager.loadSitemap();
    console.log("Sitemap URLs:", manager.getSitemapEntries());

    // 3. Set title and description for llms.txt
    manager.setMetadata("My Site", "The best site ever");

    // 4. Automatically generate core content from sitemap (threshold 0.4)
    const coreContent = manager.autoGenerateCoreContent(0.4);
    manager.addCoreContent(coreContent);

    // 5. Add optional content manually
    manager.addOptionalContent([
      { title: "Extra Link", url: "https://example.com/extra" },
    ]);

    // 6. Generate llms.txt markdown (including validation & correction)
    const llmsText = manager.generateLLMSTxt();
    console.log("Generated llms.txt content:\n", llmsText);

    // 7. Save file
    await manager.saveToFile("./llms.txt");
    console.log("llms.txt saved successfully.");
  } catch (e) {
    console.error("Error:", e);
  }
})();
```

---

## 🧪 API Documentation

### Constructor

```ts
new LLMSManager({ sitemapUrl: string });
```

* `sitemapUrl`: Required. Must begin with `http://`, `https://`, or `file://`.

---

### Instance Methods

#### `loadSitemap(): Promise<void>`

Fetch and parse the sitemap to internal entries.

---

#### `getSitemapEntries(): Array<{ loc: string, priority: number }>`

Returns all parsed entries from the sitemap.

---

#### `setMetadata(title: string, description: string): void`

Set the title and description block for the generated `llms.txt`.

---

#### `addCoreContent(items: Array<{ title: string, url: string }>): void`

Add core content entries.

---

#### `addOptionalContent(items: Array<{ title: string, url: string }>): void`

Add optional content entries.

---

#### `generateLLMSTxt(): string`

Returns the final `llms.txt` markdown content as a string.

---

#### `saveToFile(filepath: string): Promise<void>`

Saves the generated `llms.txt` to a file.

---

#### `autoGenerateCoreContent(threshold: number = 0.5): Array<{ title: string, url: string }>`

Filters sitemap entries by `priority` and auto-generates a title from the URL.

---

### Static Methods

#### `LLMSManager.parseLLMSTxt(content: string): ParsedData`

Parses `llms.txt` markdown into structured JSON:

```ts
{
  title: string;
  description: string;
  coreContent: Array<{ title: string, url: string }>;
  optionalContent: Array<{ title: string, url: string }>;
}
```

---

#### `LLMSManager.parseLLMSTxtFromFile(filepath: string): Promise<ParsedData>`

Loads and parses a local `llms.txt` file.

---

#### `LLMSManager.parseLLMSTxtFromUrl(url: string): Promise<ParsedData>`

Loads and parses a remote `llms.txt` file via HTTP/HTTPS.

---

## 📘 Example `llms.txt` Output

```markdown
# My Project
> A curated list of intelligent content.

## Core Content
- [Home](https://example.com/)
- [Blog](https://example.com/blog)

## Optional
- [About](https://example.com/about)
```

---

## 💡 Tip

Use `autoGenerateCoreContent()` after loading the sitemap to quickly fill out relevant content based on `priority`.

---

## 🧩 Requirements

* Node.js v18+ (uses `fs/promises` and `URL` API)
* No external dependencies

---

## 🛠 Native Modules Used

* `https`, `http`
* `fs/promises`, `fs`
* `url`

---

## 🙋‍♂️ Contributing

Pull requests welcome! Please ensure your code is:

* Fully documented
* Tested
* Dependency-free

## 🔒 License

MIT — © 2025 [Marius Heinrich](https://github.com/CodingMarius)
