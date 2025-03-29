import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Renders a Mermaid diagram to an image
 * @param {string} mermaidCode - The Mermaid diagram code
 * @param {string} outputDir - Directory to save the rendered image
 * @param {string} filename - Name for the output file (without extension)
 * @returns {Promise<Object>} Object containing paths and success status
 */
export async function renderMermaidToImage(mermaidCode, outputDir, filename = 'diagram') {
  try {
    await fs.ensureDir(outputDir);
    
    const htmlPath = path.join(outputDir, `${filename}.html`);
    const pngPath = path.join(outputDir, `${filename}.png`);
    
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
            flowchart: { useMaxWidth: false },
            securityLevel: 'loose'
          });
        </script>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
          .mermaid { max-width: 100%; }
          h2 { color: #333; }
        </style>
      </head>
      <body>
        <h2>${filename}</h2>
        <div class="mermaid">
${mermaidCode}
        </div>
      </body>
      </html>
    `;
    
    await fs.writeFile(htmlPath, html);
    
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
      success: true,
      htmlPath,
      pngPath,
      base64Image
    };
  } catch (error) {
    console.error(`Error rendering Mermaid diagram: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extracts Mermaid code from markdown text
 * @param {string} markdown - Markdown text containing Mermaid code blocks
 * @returns {Array<string>} Array of extracted Mermaid code blocks
 */
export function extractMermaidFromMarkdown(markdown) {
  const mermaidRegex = /```mermaid\s+([\s\S]*?)\s+```/g;
  const diagrams = [];
  let match;
  
  while ((match = mermaidRegex.exec(markdown)) !== null) {
    diagrams.push(match[1].trim());
  }
  
  return diagrams;
}

/**
 * Process markdown to render any Mermaid diagrams as images
 * @param {string} markdown - Markdown text with Mermaid code blocks
 * @param {string} outputDir - Directory to save rendered images
 * @returns {Promise<string>} Markdown with image links replacing Mermaid code
 */
export async function processMermaidInMarkdown(markdown, outputDir) {
  const mermaidDiagrams = extractMermaidFromMarkdown(markdown);
  let processedMarkdown = markdown;
  
  for (let i = 0; i < mermaidDiagrams.length; i++) {
    const diagram = mermaidDiagrams[i];
    const filename = `diagram-${i + 1}`;
    
    const renderResult = await renderMermaidToImage(diagram, outputDir, filename);
    
    if (renderResult.success) {
      // Replace Mermaid code with image link in markdown
      const mermaidBlock = new RegExp(`\`\`\`mermaid\\s+${escapeRegExp(diagram)}\\s+\`\`\``, 'g');
      processedMarkdown = processedMarkdown.replace(
        mermaidBlock, 
        `![${filename}](${renderResult.pngPath})\n\n<details>\n<summary>View Mermaid Code</summary>\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n</details>`
      );
    }
  }
  
  return processedMarkdown;
}

// Helper function to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
