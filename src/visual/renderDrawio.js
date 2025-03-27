const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const puppeteer = require('puppeteer');

/**
 * Renders diagrams using Mermaid.js (with draw.io fallback if available)
 * @param {Object} options - Options including schema and flowchart data
 * @returns {Promise<Array<Object>>} Array of rendered diagram objects
 */
async function renderDiagrams(options) {
  const { schema, flowcharts } = options;
  const results = [];
  
  // Process schema diagram if available
  if (schema && schema.mermaid && schema.mermaid.content) {
    const schemaDiagram = await renderMermaidToImage(
      schema.mermaid.content, 
      'schema-diagram', 
      'Schema Diagram'
    );
    
    if (schemaDiagram) {
      results.push({
        title: 'Schema Diagram',
        type: 'schema',
        mermaidCode: schema.mermaid.content,
        ...schemaDiagram
      });
    }
  }
  
  // Process flowcharts if available
  if (flowcharts && flowcharts.length > 0) {
    for (const flowchart of flowcharts) {
      if (flowchart.mermaidCode) {
        const flowDiagram = await renderMermaidToImage(
          flowchart.mermaidCode,
          `flowchart-${sanitizeFilename(flowchart.name)}`,
          flowchart.name
        );
        
        if (flowDiagram) {
          results.push({
            title: `Flowchart: ${flowchart.name}`,
            type: 'flowchart',
            description: flowchart.description,
            filePath: flowchart.filePath,
            mermaidCode: flowchart.mermaidCode,
            ...flowDiagram
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * Renders a Mermaid diagram to an image
 * @param {string} mermaidCode - Mermaid diagram code
 * @param {string} diagramId - Unique identifier for the diagram
 * @param {string} title - Title of the diagram
 * @returns {Promise<Object>} Rendered diagram object with image data
 */
async function renderMermaidToImage(mermaidCode, diagramId, title) {
  try {
    const tempDir = path.join(os.tmpdir(), 'pr-checker-diagrams');
    await fs.ensureDir(tempDir);
    
    const htmlPath = path.join(tempDir, `${diagramId}-${Date.now()}.html`);
    const pngPath = path.join(tempDir, `${diagramId}-${Date.now()}.png`);
    
    // Create HTML with Mermaid
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <script>
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: { useMaxWidth: false }
          });
        </script>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
          .mermaid { max-width: 100%; }
          h2 { color: #333; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <div class="mermaid">
${mermaidCode}
        </div>
      </body>
      </html>
    `;
    
    await fs.writeFile(htmlPath, html);
    
    try {
      // Use Puppeteer to render the HTML to PNG
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`);
      
      // Wait for Mermaid to render
      await page.waitForFunction(() => {
        return document.querySelector('.mermaid svg') !== null;
      }, { timeout: 10000 });
      
      // Wait a bit more to ensure rendering is complete
      await page.waitForTimeout(1000);
      
      // Get the element for taking screenshot
      const element = await page.$('body');
      await element.screenshot({ path: pngPath });
      
      await browser.close();
      
      // Read the image file and convert to base64
      const imageBuffer = await fs.readFile(pngPath);
      const base64Image = imageBuffer.toString('base64');
      
      return {
        imagePath: pngPath,
        imageData: base64Image
      };
    } catch (puppeteerError) {
      console.error(`Error rendering diagram with Puppeteer: ${puppeteerError.message}`);
      return {
        error: puppeteerError.message,
        fallbackMermaid: true // Indicate that we should fall back to raw Mermaid code
      };
    }
  } catch (error) {
    console.error(`Error in renderMermaidToImage: ${error.message}`);
    return {
      error: error.message,
      fallbackMermaid: true
    };
  }
}

/**
 * Sanitize a string for use as a filename
 * @param {string} name - Input name
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
}

module.exports = {
  renderDiagrams
};
