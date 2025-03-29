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
import {
  extractMermaidFromMarkdown,
  renderMermaidToImage,
  processMermaidInMarkdown
} from './utils/mermaid-renderer.js';
import fs from 'fs-extra';
import path from 'path';

async function processPR(formattedPRContent, prNumber) {
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
        reviewResponse.content,
        prNumber
      );
    }
    
    // Mermaid schema generation
    console.log('🗂️ Generating Mermaid schema...');
    const mermaidResponse = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.mermaidSchema,
      USER_PROMPTS.mermaidSchema
    );
    
    // Save schema results
    await saveResults(
      'primary-with-fallbacks', 
      'mermaid-schema', 
      mermaidResponse, 
      outputDir
    );
    
    // Extract and render Mermaid diagrams
    if (mermaidResponse.success) {
      console.log('🎨 Extracting and rendering Mermaid diagrams...');
      
      // Extract Mermaid code blocks
      const mermaidDiagrams = extractMermaidFromMarkdown(mermaidResponse.content);
      
      if (mermaidDiagrams.length > 0) {
        console.log(`Found ${mermaidDiagrams.length} Mermaid diagrams in the response`);
        
        // Save each Mermaid diagram and render it
        for (let i = 0; i < mermaidDiagrams.length; i++) {
          const diagramCode = mermaidDiagrams[i];
          const diagramPath = path.join(outputDir, `diagram-${i+1}.mmd`);
          await fs.writeFile(diagramPath, diagramCode);
          
          // Render the diagram
          const renderResult = await renderMermaidToImage(
            diagramCode, 
            outputDir, 
            `diagram-${i+1}`
          );
          
          if (renderResult.success) {
            console.log(`✅ Successfully rendered diagram ${i+1} to: ${renderResult.pngPath}`);
          } else {
            console.error(`❌ Failed to render diagram ${i+1}: ${renderResult.error}`);
          }
        }
        
        // Process markdown to include rendered diagrams
        const processedMarkdown = await processMermaidInMarkdown(mermaidResponse.content, outputDir);
        const processedPath = path.join(outputDir, 'processed-schema.md');
        await fs.writeFile(processedPath, processedMarkdown);
        
        // Add comment with processed Mermaid diagrams
        if (process.env.GITHUB_TOKEN && process.env.COMMENT_ON_PR === 'true') {
          await addCommentToPR(
            'AI Schema Visualization',
            processedMarkdown,
            prNumber
          );
        }
      } else {
        console.log('⚠️ No Mermaid diagrams found in the schema response');
        
        // Still post the original response
        if (process.env.GITHUB_TOKEN && process.env.COMMENT_ON_PR === 'true') {
          await addCommentToPR(
            'AI Schema Design Suggestions',
            mermaidResponse.content,
            prNumber
          );
        }
      }
    } else {
      console.log('❌ Failed to generate Mermaid schema');
    }
    
    console.log('✅ PR processing completed successfully');
    
  } catch (error) {
    console.error('❌ PR processing failed:');
    console.error(error);
    process.exit(1);
  }
}

export default processPR;