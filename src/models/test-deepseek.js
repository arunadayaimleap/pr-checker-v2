import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';

async function testDeepSeek() {
  try {
    // Use the DeepSeek model from the free list
    const MODEL = 'deepseek/deepseek-chat-v3-0324:free';
    
    console.log(`🔍 Testing OpenRouter API with ${MODEL}`);
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Create output directory
    const outputDir = await createOutputDir();
    
    // First prompt - code analysis
    console.log("Running code analysis with DeepSeek...");
    const analysisResult = await callModelWithPrompt(
      MODEL,
      SYSTEM_PROMPTS.codeReview,
      USER_PROMPTS.codeReview
    );
    
    await saveResults(MODEL, 'code-analysis', analysisResult, outputDir);
    
    // Second prompt - schema generation
    console.log("Running schema generation with DeepSeek...");
    const schemaResult = await callModelWithPrompt(
      MODEL,
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    await saveResults(MODEL, 'schema', schemaResult, outputDir);
    
    console.log(`\n✨ DeepSeek test completed!`);
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testDeepSeek();
