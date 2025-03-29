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
    
    // Step 1: Code review with models
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
    
    // Step 2: Run diagram generation in parallel
    console.log('🔄 Generating diagrams in parallel...');
    const [schemaResponse, sequenceResponse] = await Promise.all([
      // Schema diagram generation
      (async () => {
        console.log('🗂️ Generating Schema diagram...');
        const response = await callModelWithFallbacks(
          MODEL_FALLBACKS.PRIMARY,
          MODEL_FALLBACKS.FALLBACKS,
          SYSTEM_PROMPTS.mermaidSchema,
          USER_PROMPTS.mermaidSchema
        );
        
        await saveResults(
          'primary-with-fallbacks', 
          'mermaid-schema', 
          response, 
          outputDir
        );
        
        return response;
      })(),
      
      // Sequence diagram generation
      (async () => {
        console.log('🔄 Generating Sequence diagram...');
        const response = await callModelWithFallbacks(
          MODEL_FALLBACKS.PRIMARY,
          MODEL_FALLBACKS.FALLBACKS,
          SYSTEM_PROMPTS.sequenceDiagram,
          USER_PROMPTS.sequenceDiagram
        );
        
        await saveResults(
          'primary-with-fallbacks', 
          'sequence-diagram', 
          response, 
          outputDir
        );
        
        return response;
      })()
    ]);
    
    // Step 3: Process and render diagrams
    // We'll create a directory specifically for rendered diagrams
    const diagramsDir = path.join(outputDir, 'diagrams');
    await fs.ensureDir(diagramsDir);
    
    // Process schema diagram
    console.log('🎨 Processing Schema diagram...');
    const schemaResult = await processAndRenderDiagrams(
      schemaResponse, 
      'Schema', 
      diagramsDir, 
      prNumber
    );
    
    // Process sequence diagram
    console.log('🎨 Processing Sequence diagram...');
    const sequenceResult = await processAndRenderDiagrams(
      sequenceResponse, 
      'Sequence', 
      diagramsDir, 
      prNumber
    );
    
    // Step 4: Generate combined diagrams comment (optional)
    if (process.env.GITHUB_TOKEN && 
        process.env.COMMENT_ON_PR === 'true' && 
        process.env.COMBINED_DIAGRAM_COMMENT === 'true') {
      
      // Create a combined diagrams comment
      if (schemaResult.hasDiagrams && sequenceResult.hasDiagrams) {
        console.log('📊 Creating combined diagram comment...');
        
        const combinedComment = `# 📊 PR Diagram Analysis

## 🧩 Schema Diagram
${schemaResult.firstDiagramSection || '*No schema diagram could be generated.*'}

## ⏱️ Sequence Diagram
${sequenceResult.firstDiagramSection || '*No sequence diagram could be generated.*'}

---
*Generated by PR Checker v2.1 - [View all diagrams](${diagramsDir})*`;
        
        await addCommentToPR(
          'AI Diagram Analysis',
          combinedComment,
          prNumber
        );
      }
    }
    
    console.log('✅ PR processing completed successfully');
    
  } catch (error) {
    console.error('❌ PR processing failed:');
    console.error(error);
    process.exit(1);
  }
}

// Helper function to process and render diagrams
async function processAndRenderDiagrams(response, diagramType, outputDir, prNumber) {
  const result = {
    hasDiagrams: false,
    diagramCount: 0,
    firstDiagramSection: null,
    processedMarkdown: null
  };
  
  if (!response || !response.success) {
    console.log(`❌ Failed to generate ${diagramType} diagram`);
    return result;
  }
  
  console.log(`🎨 Extracting and rendering ${diagramType} diagrams...`);
  
  // Extract Mermaid code blocks
  const mermaidDiagrams = extractMermaidFromMarkdown(response.content);
  
  if (mermaidDiagrams.length === 0) {
    console.log(`⚠️ No Mermaid diagrams found in the ${diagramType} response`);
    
    // Still post the original response
    if (process.env.GITHUB_TOKEN && process.env.COMMENT_ON_PR === 'true') {
      await addCommentToPR(
        `AI ${diagramType} Analysis`,
        response.content,
        prNumber
      );
    }
    
    return result;
  }
  
  console.log(`Found ${mermaidDiagrams.length} ${diagramType} diagrams in the response`);
  result.hasDiagrams = true;
  result.diagramCount = mermaidDiagrams.length;
  
  // Save each Mermaid diagram and render it
  const renderResults = [];
  
  for (let i = 0; i < mermaidDiagrams.length; i++) {
    const diagramCode = mermaidDiagrams[i];
    const diagramFilename = `${diagramType.toLowerCase()}-${i+1}`;
    const diagramPath = path.join(outputDir, `${diagramFilename}.mmd`);
    await fs.writeFile(diagramPath, diagramCode);
    
    // Render the diagram
    const renderResult = await renderMermaidToImage(
      diagramCode, 
      outputDir, 
      diagramFilename
    );
    
    renderResults.push(renderResult);
    
    if (renderResult.success) {
      console.log(`✅ Successfully rendered ${diagramType} diagram ${i+1} to: ${renderResult.pngPath}`);
      
      // Save first diagram section for combined comment
      if (i === 0) {
        // Get diagram explanation text (look for text after the first mermaid block)
        const diagramText = extractTextAfterMermaid(response.content, diagramCode);
        
        result.firstDiagramSection = `![${diagramFilename}](${renderResult.pngPath})

${diagramText}`;
      }
    } else {
      console.error(`❌ Failed to render ${diagramType} diagram ${i+1}: ${renderResult.error}`);
    }
  }
  
  // Process markdown to include rendered diagrams
  const processedMarkdown = await processMermaidInMarkdown(response.content, outputDir);
  const processedPath = path.join(outputDir, `processed-${diagramType.toLowerCase()}.md`);
  await fs.writeFile(processedPath, processedMarkdown);
  
  result.processedMarkdown = processedMarkdown;
  
  // Add comment with processed Mermaid diagrams
  if (process.env.GITHUB_TOKEN && process.env.COMMENT_ON_PR === 'true' && 
      process.env.COMBINED_DIAGRAM_COMMENT !== 'true') {
    await addCommentToPR(
      `AI ${diagramType} Analysis`,
      processedMarkdown,
      prNumber
    );
  }
  
  return result;
}

// Helper function to extract text after a mermaid code block
function extractTextAfterMermaid(markdown, diagramCode) {
  const mermaidBlock = '```mermaid\n' + diagramCode + '\n```';
  const parts = markdown.split(mermaidBlock);
  
  if (parts.length < 2) return '';
  
  // Get text after the mermaid block until the next heading or code block
  const textAfter = parts[1].trim();
  const nextBlockMatch = textAfter.match(/^(#|```)/m);
  
  if (nextBlockMatch) {
    return textAfter.substring(0, nextBlockMatch.index).trim();
  }
  
  return textAfter;
}

export default processPR;