import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithFallbacks, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';
import { MODEL_FALLBACKS } from './models.js';
import fs from 'fs-extra';
import path from 'path';

async function testMermaidGeneration() {
  try {
    console.log('🔍 Testing Mermaid diagram generation with model fallback mechanism');
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Create output directory
    const outputDir = await createOutputDir();
    
    // Test with fallbacks for Mermaid diagram generation
    console.log("Running Mermaid schema generation...");
    console.log(`Primary model: ${MODEL_FALLBACKS.PRIMARY}`);
    console.log(`Fallback models: ${MODEL_FALLBACKS.FALLBACKS.join(', ')}`);
    
    const mermaidResult = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.mermaidSchema,
      USER_PROMPTS.mermaidSchema
    );
    
    // Save original Mermaid result
    const saveResult = await saveResults('fallback-mechanism', 'mermaid-schema', mermaidResult, outputDir);
    
    // Extract and save Mermaid diagram separately
    if (mermaidResult.success) {
      const mermaidContent = extractMermaidCode(mermaidResult.content);
      if (mermaidContent) {
        const mermaidPath = path.join(outputDir, 'extracted-diagram.mmd');
        await fs.writeFile(mermaidPath, mermaidContent);
        console.log(`📝 Extracted Mermaid diagram saved to: ${mermaidPath}`);
      } else {
        console.log('⚠️ No Mermaid code block found in the response');
      }
    }
    
    console.log(`\n✨ Mermaid generation test completed!`);
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Mermaid generation test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Helper function to extract Mermaid code from markdown
function extractMermaidCode(markdown) {
  const mermaidRegex = /```mermaid\s+([\s\S]*?)\s+```/;
  const match = markdown.match(mermaidRegex);
  return match ? match[1].trim() : null;
}

testMermaidGeneration();
