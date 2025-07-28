import LLMSManager from "../src/llms-manager.js";

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
