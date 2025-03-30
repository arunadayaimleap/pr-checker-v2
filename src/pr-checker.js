import { AVAILABLE_MODELS, MODEL_FALLBACKS } from './models/models.js';
import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  callModelWithFallbacks,
  saveResults, 
  createOutputDir
} from './utils/openrouter-utils.js';
import { addCommentToPR } from './utils/github-utils.js';
import {
  extractMermaidFromMarkdown,
  renderMermaidToImage,
  processMermaidInMarkdown
} from './utils/mermaid-renderer.js';
import { uploadImageToImgBB } from './utils/imgbb-utils.js';
import fs from 'fs-extra';
import path from 'path';

async function processPR(formattedPRContent, prNumber) {
  try {
    // Log the first part of the PR content to verify it's using the correct data
    console.log(`Processing PR #${prNumber} with content:`);
    console.log(formattedPRContent.substring(0, 500) + '...');
    
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
    
    // Save results but don't log raw API response
    await saveResults(
      'primary-with-fallbacks', 
      'code-review', 
      reviewResponse, 
      outputDir,
      false // Set to false to avoid logging raw API response
    );
    
    // Add comment for code review - always post if GITHUB_TOKEN exists
    if (process.env.GITHUB_TOKEN) {
      await addCommentToPR(
        'AI Code Review Analysis',
        reviewResponse.content,
        prNumber
      );
    }
    
    // Step 2: Generate combined diagram analysis with the same PR content
    console.log('🔄 Generating combined schema and sequence diagrams...');
    const diagramsResponse = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.combinedDiagrams,
      formattedPRContent,
      false // Avoid logging raw API response
    );
    
    await saveResults(
      'primary-with-fallbacks', 
      'combined-diagrams', 
      diagramsResponse, 
      outputDir,
      false // Set to false to avoid logging raw API response
    );
    
    // Step 3: Process and render diagrams
    // We'll create a directory specifically for rendered diagrams
    const diagramsDir = path.join(outputDir, 'diagrams');
    await fs.ensureDir(diagramsDir);
    
    // Process combined diagrams
    console.log('🎨 Processing combined diagrams...');
    const diagramsResult = await processAndRenderDiagrams(
      diagramsResponse, 
      'Diagrams', 
      diagramsDir, 
      prNumber
    );
    
    // Step 4: Generate combined diagrams comment - always post when GitHub token exists
    if (process.env.GITHUB_TOKEN && diagramsResult.hasDiagrams) {
      console.log('📊 Posting combined diagram analysis...');
      await addCommentToPR(
        'AI Diagram Analysis',
        diagramsResult.processedMarkdown || 'No diagrams could be generated.',
        prNumber
      );
    }
    
    console.log('✅ PR processing completed successfully');
    
  } catch (error) {
    console.error('❌ PR processing failed:');
    console.error(error.message || error); // Only log error message, not full stack trace
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
    return result;
  }
  
  console.log(`Found ${mermaidDiagrams.length} ${diagramType} diagrams in the response`);
  
  // Set diagrams found flag
  result.hasDiagrams = true;
  result.diagramCount = mermaidDiagrams.length;
  
  // Process each Mermaid diagram
  let processedMarkdown = response.content;
  for (let i = 0; i < mermaidDiagrams.length; i++) {
    const mermaidBlock = mermaidDiagrams[i];
    const diagramPath = path.join(outputDir, `${diagramType.toLowerCase()}-${i+1}.png`);
    
    // Render the diagram
    console.log(`Rendering ${diagramType} diagram ${i+1} to: ${diagramPath}`);
    const renderResult = await renderMermaidToImage(mermaidBlock, diagramPath);
    
    if (renderResult.success) {
      console.log(`✅ Successfully rendered ${diagramType} diagram ${i+1} to: ${diagramPath}`);
      
      // Upload to ImgBB
      console.log(`📤 Uploading ${diagramType} diagram ${i+1} to ImgBB...`);
      const uploadResult = await uploadImageToImgBB(
        renderResult.path, 
        `pr-${prNumber}-${diagramType.toLowerCase()}-${i+1}`
      );
      
      if (uploadResult.success) {
        console.log(`✅ Successfully uploaded to ImgBB: ${uploadResult.url}`);
        renderResult.imgbbUrl = uploadResult.url;
        
        // Save the first diagram section for the combined comment
        if (i === 0) {
          const textAfterDiagram = extractTextAfterMermaid(processedMarkdown, mermaidBlock);
          result.firstDiagramSection = `![${diagramType.toLowerCase()}-diagram](${renderResult.imgbbUrl})\n${textAfterDiagram}`;
        }
        
        // Replace the Mermaid block with the image in the markdown
        const imageMarkdown = `![${diagramType.toLowerCase()}-diagram-${i+1}](${renderResult.imgbbUrl})`;
        processedMarkdown = processedMarkdown.replace(mermaidBlock, imageMarkdown);
      }
    }
  }
  
  const processedPath = path.join(outputDir, `processed-${diagramType.toLowerCase()}.md`);
  await fs.writeFile(processedPath, processedMarkdown);
  
  result.processedMarkdown = processedMarkdown;
  
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