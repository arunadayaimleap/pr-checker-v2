import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';

async function testClaude() {
  try {
    console.log('🔍 Testing OpenRouter API with Claude 3 Haiku');
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
    console.log("Running code analysis with Claude...");
    const analysisResult = await callModelWithPrompt(
      'anthropic/claude-3-haiku-20240307',
      SYSTEM_PROMPTS.codeReview,
      USER_PROMPTS.codeReview
    );
    
    await saveResults('anthropic/claude-3-haiku-20240307', 'code-analysis', analysisResult, outputDir);
    
    // Second prompt - schema generation
    console.log("Running schema generation with Claude...");
    const schemaResult = await callModelWithPrompt(
      'anthropic/claude-3-haiku-20240307',
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    await saveResults('anthropic/claude-3-haiku-20240307', 'schema', schemaResult, outputDir);
    
    console.log('\n✨ Claude 3 Haiku test completed!');
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testClaude();
