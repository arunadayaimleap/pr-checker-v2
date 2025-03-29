import { 
  renderMermaidToImage, 
  extractMermaidFromMarkdown, 
  processMermaidInMarkdown 
} from '../utils/mermaid-renderer.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sample Mermaid diagram
const sampleMermaid = `
flowchart TD
    A[UserProfile.js] -->|uses| B[cache.js]
    C[profileController.js] -->|uses| A
    A -->|queries| D[userRepository.js]
    C -->|indirectly uses| B
    D -->|optimized for| A
`;

// Sample markdown with Mermaid
const sampleMarkdown = `
# Sample Architecture

Here's a diagram of our system:

\`\`\`mermaid
${sampleMermaid}
\`\`\`

And here's some additional text explaining the diagram.
`;

async function testMermaidRenderer() {
  try {
    console.log('🧪 Testing Mermaid Renderer');
    console.log('-----------------------------------');
    
    // Create output directory
    const outputDir = path.resolve(__dirname, '../../results/mermaid-test');
    await fs.ensureDir(outputDir);
    console.log(`📁 Created output directory: ${outputDir}`);
    
    // Test direct rendering
    console.log('\n🖼️ Testing direct Mermaid rendering...');
    const renderResult = await renderMermaidToImage(sampleMermaid, outputDir, 'direct-test');
    
    if (renderResult.success) {
      console.log(`✅ Successfully rendered Mermaid diagram to: ${renderResult.pngPath}`);
    } else {
      console.error(`❌ Failed to render Mermaid diagram: ${renderResult.error}`);
    }
    
    // Test extraction from markdown
    console.log('\n📋 Testing Mermaid extraction from markdown...');
    const extractedDiagrams = extractMermaidFromMarkdown(sampleMarkdown);
    
    console.log(`Found ${extractedDiagrams.length} Mermaid diagrams in markdown`);
    if (extractedDiagrams.length > 0) {
      const extractedPath = path.join(outputDir, 'extracted.mmd');
      await fs.writeFile(extractedPath, extractedDiagrams[0]);
      console.log(`✅ Saved extracted Mermaid to: ${extractedPath}`);
    }
    
    // Test processing markdown with embedded Mermaid
    console.log('\n🔄 Testing markdown processing with Mermaid...');
    const processedMarkdown = await processMermaidInMarkdown(sampleMarkdown, outputDir);
    
    const processedPath = path.join(outputDir, 'processed-markdown.md');
    await fs.writeFile(processedPath, processedMarkdown);
    console.log(`✅ Saved processed markdown to: ${processedPath}`);
    
    console.log('\n✨ Mermaid renderer tests completed!');
    
  } catch (error) {
    console.error('❌ Mermaid renderer test failed:');
    console.error(error);
    process.exit(1);
  }
}

testMermaidRenderer();
