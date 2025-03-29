import { AVAILABLE_MODELS, MODEL_FALLBACKS } from './models/models.js';
import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  callModelWithFallbacks,
  saveResults, 
  createOutputDir, 
  addCommentToPR 
} from './utils/openrouter-utils.js';

async function processPR() {
  try {
    // Create output directory
    const outputDir = await createOutputDir();
    
    console.log('🧠 Using DeepSeek as primary model with Llama 3 and Mistral Small as fallbacks...');
    console.log(`Primary model: ${MODEL_FALLBACKS.PRIMARY}`);
    console.log(`Fallback models: ${MODEL_FALLBACKS.FALLBACKS.join(', ')}`);
    
    // Code review with models
    console.log('📝 Generating code review...');
    const reviewResponse = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.codeReview,
      formattedPRContent
    );
    
    // Save code review results
    await saveResults(
      'primary-with-fallbacks', 
      'code-review', 
      reviewResponse, 
      outputDir
    );
    
    // Add comment for code review
    if (process.env.GITHUB_TOKEN && process.env.COMMENT_ON_PR === 'true') {
      await addCommentToPR(
        'AI Code Review Analysis',
        reviewResponse,
        prNumber
      );
    }
    
    // Schema suggestion with models
    console.log('🗂️ Generating schema suggestions...');
    const schemaResponse = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.schemaDesign,
      formattedPRContent
    );
    
    // Save schema results
    await saveResults(
      'primary-with-fallbacks', 
      'schema-suggestions', 
      schemaResponse, 
      outputDir
    );
    
    // Add comment for schema suggestions
    if (process.env.GITHUB_TOKEN && process.env.COMMENT_ON_PR === 'true') {
      await addCommentToPR(
        'AI Schema Design Suggestions',
        schemaResponse,
        prNumber
      );
    }
    
    console.log('✅ PR processing completed successfully');
    
  } catch (error) {
    console.error('❌ PR processing failed:');
    console.error(error);
    process.exit(1);
  }
}

export default processPR;