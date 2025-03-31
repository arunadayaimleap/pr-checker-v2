import { AVAILABLE_MODELS, MODEL_FALLBACKS } from './models/models.js';
import { 
  SYSTEM_PROMPTS, 
  USER_PROMPTS, 
  callModelWithPrompt, 
  callModelWithFallbacks,
  saveResults, 
  createOutputDir
} from './utils/openrouter-utils.js';
import {
  extractMermaidFromMarkdown,
  renderMermaidToImage,
  processMermaidInMarkdown
} from './utils/mermaid-renderer.js';
import { uploadImageToImgBB } from './utils/imgbb-utils.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateDailyReport() {
  try {
    console.log('🔍 Starting daily code analysis report...');
    
    // Create timestamp-based output directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '../reports', timestamp);
    await fs.ensureDir(outputDir);
    
    console.log(`📁 Created output directory: ${outputDir}`);
    console.log('🧠 Using DeepSeek as primary model with Llama 3 and Mistral Small as fallbacks...');
    console.log(`Primary model: ${MODEL_FALLBACKS.PRIMARY}`);
    console.log(`Fallback models: ${MODEL_FALLBACKS.FALLBACKS.join(', ')}`);
    
    // Get repository root
    const repoRoot = path.resolve(__dirname, '..');
    console.log(`📂 Analyzing repository at: ${repoRoot}`);
    
    // Collect code files for analysis
    const codeFiles = await collectCodeFiles(repoRoot);
    
    // Format code files for analysis
    const formattedContent = await formatCodeFilesForAnalysis(codeFiles);
    
    // Step 1: Code review with models
    console.log('📝 Generating code review...');
    const reviewResponse = await callModelWithFallbacks(
      MODEL_FALLBACKS.PRIMARY,
      MODEL_FALLBACKS.FALLBACKS,
      SYSTEM_PROMPTS.codeReview,
      formattedContent
    );
    
    // Save results
    await saveResults(
      'primary-with-fallbacks', 
      'code-review', 
      reviewResponse, 
      outputDir,
      false
    );
    
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
          formattedContent,
          false
        );
        
        await saveResults(
          'primary-with-fallbacks', 
          'mermaid-schema', 
          response, 
          outputDir,
          false
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
          formattedContent,
          false
        );
        
        await saveResults(
          'primary-with-fallbacks', 
          'sequence-diagram', 
          response, 
          outputDir,
          false
        );
        
        return response;
      })()
    ]);
    
    // Step 3: Process and render diagrams
    const diagramsDir = path.join(outputDir, 'diagrams');
    await fs.ensureDir(diagramsDir);
    
    // Process schema diagram
    console.log('🎨 Processing Schema diagram...');
    const schemaResult = await processAndRenderDiagrams(
      schemaResponse, 
      'Schema', 
      diagramsDir, 
      'daily'
    );
    
    // Process sequence diagram
    console.log('🎨 Processing Sequence diagram...');
    const sequenceResult = await processAndRenderDiagrams(
      sequenceResponse, 
      'Sequence', 
      diagramsDir, 
      'daily'
    );
    
    // Generate summary report
    await generateSummaryReport(
      outputDir,
      reviewResponse.content,
      schemaResult.processedMarkdown,
      sequenceResult.processedMarkdown,
      timestamp
    );
    
    console.log('✅ Daily report generated successfully!');
    console.log(`📂 Report saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Daily report generation failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

async function collectCodeFiles(rootDir) {
  // Extensions to include
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'];
  // Directories to exclude
  const excludeDirs = ['node_modules', '.git', 'reports'];
  
  let codeFiles = [];
  
  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip excluded directories
      if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
        await scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (codeExtensions.includes(ext)) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            codeFiles.push({
              path: fullPath,
              content,
              extension: ext.substring(1) // Remove the dot
            });
          } catch (error) {
            console.warn(`⚠️ Could not read file: ${fullPath}`, error.message);
          }
        }
      }
    }
  }
  
  await scanDir(rootDir);
  console.log(`📄 Found ${codeFiles.length} code files for analysis`);
  
  return codeFiles;
}

async function formatCodeFilesForAnalysis(files) {
  // Limit number of files to analyze to avoid token limits
  const maxFiles = 20;
  const selectedFiles = files.length > maxFiles 
    ? files.slice(0, maxFiles) 
    : files;
  
  if (files.length > maxFiles) {
    console.log(`⚠️ Limiting analysis to ${maxFiles} files out of ${files.length} total files`);
  }
  
  const formattedContent = `# Daily Code Analysis

## Files being analyzed:
${selectedFiles.map(file => `- ${file.path}`).join('\n')}

## File Contents:
${selectedFiles.map(file => `
### ${file.path}
\`\`\`${file.extension}
${file.content.length > 5000 ? file.content.substring(0, 5000) + '...(truncated)' : file.content}
\`\`\`
`).join('\n')}
`;

  return formattedContent;
}

// Helper function to process and render diagrams (reused from pr-checker.js)
async function processAndRenderDiagrams(response, diagramType, outputDir, reportId) {
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
    result.processedMarkdown = response.content;
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
        `${reportId}-${diagramType.toLowerCase()}-${i+1}`
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

// Helper function to generate summary report
async function generateSummaryReport(outputDir, codeReview, schemaAnalysis, sequenceAnalysis, timestamp) {
  const reportContent = `# 🧠 Daily Code Analysis Report - ${timestamp}

## 📝 Code Review Analysis

${codeReview || 'No code review generated.'}

---

## 🗂️ Schema Analysis

${schemaAnalysis || 'No schema analysis generated.'}

---

## 🔄 Sequence Analysis

${sequenceAnalysis || 'No sequence analysis generated.'}

---

*Daily report generated at: ${new Date().toISOString()}*
`;

  const summaryPath = path.join(outputDir, 'daily-report-summary.md');
  await fs.writeFile(summaryPath, reportContent);
  console.log(`📄 Summary report saved to: ${summaryPath}`);
}

// Extract text after a mermaid code block (reused from pr-checker.js)
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

// Run the report generation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDailyReport();
}

export default generateDailyReport;
