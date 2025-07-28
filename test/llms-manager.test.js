import assert from "assert";
import { existsSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import LLMSManager from "../src/llms-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_SITEMAP_PATH = path.join(__dirname, "test-sitemap.xml");
const TEST_LLMS_FILE = path.join(__dirname, "test-llms.txt");

const SAMPLE_SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page-one</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/page-two</loc>
    <priority>0.4</priority>
  </url>
</urlset>`;

async function runTest() {
  console.log("🧪 Starting LLMSManager test...");

  // Cleanup before test
  if (existsSync(TEST_SITEMAP_PATH)) unlinkSync(TEST_SITEMAP_PATH);
  if (existsSync(TEST_LLMS_FILE)) unlinkSync(TEST_LLMS_FILE);

  // Write test sitemap file
  await assert.doesNotReject(async () => {
    await import("fs/promises").then(({ writeFile }) =>
      writeFile(TEST_SITEMAP_PATH, SAMPLE_SITEMAP_XML, "utf-8")
    );
  }, "Failed to write test sitemap file");

  // Init with file:// URL to local sitemap
  const sitemapFileUrl = `file://${TEST_SITEMAP_PATH.replace(/\\/g, "/")}`;
  const manager = new LLMSManager({ sitemapUrl: sitemapFileUrl });

  // Load sitemap
  await assert.doesNotReject(async () => {
    await manager.loadSitemap();
  }, "Failed to load sitemap");

  const entries = manager.getSitemapEntries();
  assert.strictEqual(entries.length, 2, "Sitemap entries count");

  // Validate first entry correctness
  assert.strictEqual(entries[0].loc, "https://example.com/page-one");
  assert.strictEqual(entries[0].priority, 0.8);

  // Set metadata
  manager.setMetadata("Test Site", "A test description");

  // Auto generate core content (threshold 0.5 -> only one entry)
  const core = manager.autoGenerateCoreContent(0.5);
  assert.strictEqual(core.length, 1);
  assert.strictEqual(core[0].url, "https://example.com/page-one");
  assert.strictEqual(core[0].title, "Page One");

  // Add core content
  manager.addCoreContent(core);

  // Add optional content
  manager.addOptionalContent([
    { title: "Optional Link", url: "https://example.com/optional" },
  ]);

  // Generate llms.txt content
  const llmsText = manager.generateLLMSTxt();
  assert.ok(llmsText.includes("# Test Site"));
  assert.ok(llmsText.includes("> A test description"));
  assert.ok(llmsText.includes("- [Page One](https://example.com/page-one)"));
  assert.ok(
    llmsText.includes("- [Optional Link](https://example.com/optional)")
  );

  // Save to file
  await manager.saveToFile(TEST_LLMS_FILE);
  assert.ok(existsSync(TEST_LLMS_FILE), "llms.txt file saved");

  // Parse back llms.txt file to JSON
  const parsed = await LLMSManager.parseLLMSTxtFromFile(TEST_LLMS_FILE);
  assert.strictEqual(parsed.title, "Test Site");
  assert.strictEqual(parsed.description, "A test description");
  assert.strictEqual(parsed.coreContent.length, 1);
  assert.strictEqual(parsed.optionalContent.length, 1);

  console.log("✅ All LLMSManager tests passed successfully!");
}

runTest().catch((e) => {
  console.error("❌ LLMSManager test failed:", e);
  process.exit(1);
});
