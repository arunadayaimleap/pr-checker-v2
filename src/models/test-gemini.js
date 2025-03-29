import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  saveResults, 
  createOutputDir,
  sleep
} from '../utils/openrouter-utils.js';

async function testGemini() {
  try {
    // Use a different Gemini model that might not have the same rate limits
    const MODEL = 'google/gemini-2.0-pro-exp-02-05:free';
    
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
    
    // Check if we hit rate limits and need to retry
    if (!analysisResult.success && analysisResult.retryAfter) {
      console.log(`⏱️ Waiting ${analysisResult.retryAfter} seconds due to rate limit...`);
      await sleep(analysisResult.retryAfter * 1000);
      console.log("Retrying code analysis...");
      // Try alternative model on retry
      const retryModel = 'qwen/qwen-2.5-72b-instruct:free';
      console.log(`Using alternative model for retry: ${retryModel}`);
      const retryResult = await callModelWithPrompt(
        retryModel,
        SYSTEM_PROMPTS.codeReview,
        USER_PROMPTS.codeReview
      );
      await saveResults(retryModel, 'code-analysis', retryResult, outputDir);
    } else {
      await saveResults(MODEL, 'code-analysis', analysisResult, outputDir);
    }
    
    // Wait a longer time before making another request
    console.log("Waiting 20 seconds before next request to avoid rate limits...");
    await sleep(20000);
    
    // Second prompt - schema generation
    console.log("Running schema generation...");
    const schemaResult = await callModelWithPrompt(
      MODEL,
      SYSTEM_PROMPTS.schemaDesign,
      USER_PROMPTS.schemaDesign
    );
    
    // Check if we hit rate limits and need to retry
    if (!schemaResult.success && schemaResult.retryAfter) {
      console.log(`⏱️ Waiting ${schemaResult.retryAfter} seconds due to rate limit...`);
      await sleep(schemaResult.retryAfter * 1000);
      console.log("Retrying schema generation...");
      // Try alternative model on retry
      const retryModel = 'qwen/qwen-2.5-72b-instruct:free';
      console.log(`Using alternative model for retry: ${retryModel}`);
      const retryResult = await callModelWithPrompt(
        retryModel,
        SYSTEM_PROMPTS.schemaDesign,
        USER_PROMPTS.schemaDesign
      );
      await saveResults(retryModel, 'schema', retryResult, outputDir);
    } else {
      await saveResults(MODEL, 'schema', schemaResult, outputDir);
    }
    
    console.log(`\n✨ Gemini test completed!`);
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testGemini();
