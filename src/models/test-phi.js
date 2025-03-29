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
    
    // Second prompt - schema generation with a more explicit prompt for Phi-3
    console.log("Running schema generation with Phi-3...");
    
    // Create a more explicit schema design prompt specifically for Phi
    const phiSchemaPrompt = `Create a simple text-based diagram showing the relationships between these files:

- **src/models/UserProfile.js** (modified): Added caching to user profile operations
- **src/controllers/profileController.js** (modified): Updated to use the new caching methods from UserProfile
- **src/utils/cache.js** (new): Utility functions for cache management
- **src/database/userRepository.js** (modified): Optimized database queries for user profiles

Please show:
1. Each file as a box with its name
2. Arrows between boxes showing dependencies (which file uses which)
3. Short labels on the arrows explaining the relationship

Use simple ASCII characters. For example:

File1 --uses--> File2 --implements--> File3

Or boxes like:

+----------+       +----------+
| File1    |------>| File2    |
+----------+ uses  +----------+

After the diagram, explain the relationships in 2-3 sentences.`;
    
    const schemaResult = await callModelWithPrompt(
      'microsoft/phi-3-medium-128k-instruct:free',
      'You are a software architect who creates clear, simple ASCII diagrams to show relationships between components.',
      phiSchemaPrompt
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
