import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithFallbacks, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';
import { MODEL_FALLBACKS } from './models.js';

async function testOpenRouter() {
  try {
    console.log('🔍 Testing OpenRouter API with model fallback mechanism');
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Create output directory
    const outputDir = await createOutputDir();
    
    // Test with fallbacks
    console.log("Running code analysis with fallback mechanism...");
    console.log(`Primary model: ${MODEL_FALLBACKS.PRIMARY}`);
    console.log(`Fallback models: ${MODEL_FALLBACKS.FALLBACKS.join(', ')}`);
    
    const analysisResult = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.codeReview,
      USER_PROMPTS.codeReview
    );
    
    await saveResults('fallback-mechanism', 'code-analysis', analysisResult, outputDir);
    
    // Second prompt - schema generation
    console.log("Running schema generation with fallback mechanism...");
    console.log(`Primary model: ${MODEL_FALLBACKS.PRIMARY}`);
    console.log(`Fallback models: ${MODEL_FALLBACKS.FALLBACKS.join(', ')}`);
    
    const schemaResult = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    await saveResults('fallback-mechanism', 'schema', schemaResult, outputDir);
    
    console.log(`\n✨ Fallback mechanism test completed!`);
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testOpenRouter();
