import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  saveResults, 
  createOutputDir 
} from '../utils/openrouter-utils.js';

async function testPhi() {
  try {
    console.log('🔍 Testing OpenRouter API with Phi-3 Medium');
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
    console.log("Running code analysis with Phi-3...");
    
    // Use the exact model ID that was working before
    const analysisResult = await callModelWithPrompt(
      'microsoft/phi-3-medium-128k-instruct:free',
      SYSTEM_PROMPTS.codeReview,
      USER_PROMPTS.codeReview
    );
    
    await saveResults('microsoft/phi-3-medium-128k-instruct:free', 'code-analysis', analysisResult, outputDir);
    
    // Second prompt - schema generation
    console.log("Running schema generation with Phi-3...");
    const schemaResult = await callModelWithPrompt(
      'microsoft/phi-3-medium-128k-instruct:free',
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    await saveResults('microsoft/phi-3-medium-128k-instruct:free', 'schema', schemaResult, outputDir);
    
    console.log('\n✨ Phi-3 Medium test completed!');
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testPhi();
