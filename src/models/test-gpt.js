import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';

async function testGpt() {
  try {
    // Use Mistral Small as a replacement for GPT since it's a high-quality free model
    const MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free';
    
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
    console.log("Running code analysis...");
    const analysisResult = await callModelWithPrompt(
      MODEL,
      SYSTEM_PROMPTS.codeReview,
      USER_PROMPTS.codeReview
    );
    
    await saveResults(MODEL, 'code-analysis', analysisResult, outputDir);
    
    // Second prompt - schema generation
    console.log("Running schema generation...");
    const schemaResult = await callModelWithPrompt(
      MODEL,
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    await saveResults(MODEL, 'schema', schemaResult, outputDir);
    
    console.log(`\n✨ ${MODEL} test completed!`);
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testGpt();
