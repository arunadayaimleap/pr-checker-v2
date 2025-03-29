import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';

async function testGpt() {
  try {
    console.log('🔍 Testing OpenRouter API with GPT-3.5 Turbo');
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
    console.log("Running code analysis with GPT-3.5...");
    const analysisResult = await callModelWithPrompt(
      'openai/gpt-3.5-turbo',
      SYSTEM_PROMPTS.codeReview,
      USER_PROMPTS.codeReview
    );
    
    await saveResults('openai/gpt-3.5-turbo', 'code-analysis', analysisResult, outputDir);
    
    // Second prompt - schema generation
    console.log("Running schema generation with GPT-3.5...");
    const schemaResult = await callModelWithPrompt(
      'openai/gpt-3.5-turbo',
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    await saveResults('openai/gpt-3.5-turbo', 'schema', schemaResult, outputDir);
    
    console.log('\n✨ GPT-3.5 Turbo test completed!');
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testGpt();
