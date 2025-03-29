import { 
  renderMermaidToImage, 
  extractMermaidFromMarkdown, 
  processMermaidInMarkdown 
} from '../utils/mermaid-renderer.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sample Mermaid sequence diagram
const sampleSequenceDiagram = `
sequenceDiagram
    participant User
    participant Controller as profileController.js
    participant Model as UserProfile.js
    participant Cache as cache.js
    participant DB as userRepository.js
    
    User->>Controller: getProfile(userId)
    Controller->>Model: getProfile(userId)
    Model->>Cache: get(userId)
    
    alt Cache Hit
        Cache-->>Model: cached user data
        Model-->>Controller: user data
        Controller-->>User: user profile
    else Cache Miss
        Cache-->>Model: null
        Model->>DB: findUserById(userId)
        DB-->>Model: user data
        Model->>Cache: set(userId, userData)
        Model-->>Controller: user data
        Controller-->>User: user profile
    end
`;

// Sample markdown with sequence diagram
const sampleMarkdown = `
# User Profile Flow

Here's the sequence diagram showing how the user profile data flows:

\`\`\`mermaid
${sampleSequenceDiagram}
\`\`\`

This diagram shows the caching mechanism for user profiles. When a user requests a profile:
1. The request goes through the controller to the UserProfile model
2. The model checks the cache first
3. If found in cache (cache hit), it returns immediately
4. If not in cache (cache miss), it queries the database and updates the cache before returning
`;

async function testSequenceRenderer() {
  try {
    console.log('🧪 Testing Sequence Diagram Renderer');
    console.log('-----------------------------------');
    
    // Create output directory
    const outputDir = path.resolve(__dirname, '../../results/sequence-test');
    await fs.ensureDir(outputDir);
    console.log(`📁 Created output directory: ${outputDir}`);
    
    // Test direct rendering
    console.log('\n🖼️ Testing direct sequence diagram rendering...');
    const renderResult = await renderMermaidToImage(sampleSequenceDiagram, outputDir, 'sequence-test');
    
    if (renderResult.success) {
      console.log(`✅ Successfully rendered sequence diagram to: ${renderResult.pngPath}`);
    } else {
      console.error(`❌ Failed to render sequence diagram: ${renderResult.error}`);
    }
    
    // Test extraction from markdown
    console.log('\n📋 Testing sequence diagram extraction from markdown...');
    const extractedDiagrams = extractMermaidFromMarkdown(sampleMarkdown);
    
    console.log(`Found ${extractedDiagrams.length} sequence diagrams in markdown`);
    if (extractedDiagrams.length > 0) {
      const extractedPath = path.join(outputDir, 'extracted-sequence.mmd');
      await fs.writeFile(extractedPath, extractedDiagrams[0]);
      console.log(`✅ Saved extracted sequence diagram to: ${extractedPath}`);
    }
    
    // Test processing markdown with embedded sequence diagram
    console.log('\n🔄 Testing markdown processing with sequence diagram...');
    const processedMarkdown = await processMermaidInMarkdown(sampleMarkdown, outputDir);
    
    const processedPath = path.join(outputDir, 'processed-sequence.md');
    await fs.writeFile(processedPath, processedMarkdown);
    console.log(`✅ Saved processed markdown to: ${processedPath}`);
    
    console.log('\n✨ Sequence diagram renderer tests completed!');
    
  } catch (error) {
    console.error('❌ Sequence diagram renderer test failed:');
    console.error(error);
    process.exit(1);
  }
}

testSequenceRenderer();
