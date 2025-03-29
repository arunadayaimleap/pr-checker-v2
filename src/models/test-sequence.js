import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithFallbacks, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';
import { MODEL_FALLBACKS } from './models.js';
import { 
  extractMermaidFromMarkdown,
  renderMermaidToImage
} from '../utils/mermaid-renderer.js';
import fs from 'fs-extra';
import path from 'path';

async function testSequenceDiagram() {
  try {
    console.log('🔍 Testing Sequence Diagram generation with model fallback mechanism');
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Create output directory
    const outputDir = await createOutputDir();
    
    // Test with fallbacks for Sequence diagram generation
    console.log("Running Sequence diagram generation...");
    console.log(`Primary model: ${MODEL_FALLBACKS.PRIMARY}`);
    console.log(`Fallback models: ${MODEL_FALLBACKS.FALLBACKS.join(', ')}`);
    
    const sequenceResult = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.sequenceDiagram,
      USER_PROMPTS.sequenceDiagram
    );
    
    // Save original Sequence result
    const saveResult = await saveResults('fallback-mechanism', 'sequence-diagram', sequenceResult, outputDir);
    
    // Extract and save Mermaid diagram separately
    if (sequenceResult.success) {
      const diagrams = extractMermaidFromMarkdown(sequenceResult.content);
      if (diagrams.length > 0) {
        console.log(`Found ${diagrams.length} sequence diagrams in the response`);
        
        // Save each Mermaid diagram and render it
        for (let i = 0; i < diagrams.length; i++) {
          const diagramCode = diagrams[i];
          const diagramPath = path.join(outputDir, `sequence-${i+1}.mmd`);
          await fs.writeFile(diagramPath, diagramCode);
          
          // Render the diagram
          const renderResult = await renderMermaidToImage(
            diagramCode, 
            outputDir, 
            `sequence-${i+1}`
          );
          
          if (renderResult.success) {
            console.log(`✅ Successfully rendered sequence diagram ${i+1} to: ${renderResult.pngPath}`);
          } else {
            console.error(`❌ Failed to render sequence diagram ${i+1}: ${renderResult.error}`);
          }
        }
      } else {
        console.log('⚠️ No Mermaid sequence diagrams found in the response');
      }
    }
    
    console.log(`\n✨ Sequence diagram generation test completed!`);
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Sequence diagram generation test failed:');
    console.error(error);
    process.exit(1);
  }
}

testSequenceDiagram();
