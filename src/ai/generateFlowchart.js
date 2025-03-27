const { callOpenAI } = require('./openAIClient');

/**
 * Creates flowcharts for procedural code in changed files
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Array<Object>>} Array of flowchart objects
 */
async function createFlowcharts(changedFiles) {
  if (!changedFiles || changedFiles.length === 0) {
    return [];
  }
  
  // Filter files to only include those with procedural code
  const proceduralCodeFiles = changedFiles.filter(file => {
    // Include files that are likely to contain procedural code
    const proceduralExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cs', 'go', 'php', 'rb'];
    return proceduralExtensions.includes(file.extension) && file.fileSize < 20000;
  });
  
  if (proceduralCodeFiles.length === 0) {
    return [];
  }
  
  // Process each file to extract flowcharts
  const flowchartPromises = proceduralCodeFiles.map(file => 
    extractFlowchartsFromFile(file)
  );
  
  // Wait for all flowcharts to be processed
  const allFlowcharts = await Promise.all(flowchartPromises);
  
  // Filter out null results and flatten the array
  return allFlowcharts
    .filter(Boolean)
    .flat()
    .filter(flowchart => flowchart && flowchart.mermaidCode);
}

/**
 * Extract flowcharts from a single file
 * @param {Object} file - File object
 * @returns {Promise<Array<Object>>} Array of flowchart objects for the file
 */
async function extractFlowchartsFromFile(file) {
  // For larger files, focus on extracting main functions or methods
  const content = file.fileSize > 10000 
    ? extractMainFunctions(file.content, file.extension)
    : file.content;
  
  const prompt = `
    Analyze this ${file.extension} file and extract flowcharts for procedural code:
    File path: ${file.path}
    
    \`\`\`${file.extension}
    ${content}
    \`\`\`
    
    Identify the main functions, methods, or procedural workflows and create flowcharts for them.
    
    Return a JSON array of flowchart objects with this structure:
    [
      {
        "name": "function or procedure name",
        "description": "brief description of what it does",
        "mermaidCode": "flowchart TD\\n  A[Start] --> B[Process]\\n  B --> C[End]"
      }
    ]
    
    Use Mermaid.js flowchart syntax. Include only meaningful procedures that have branching logic or multiple steps.
    Limit to max 2-3 most important functions, preferably those that were changed.
  `;
  
  try {
    const response = await callOpenAI(prompt, {
      system_message: 'You are a flowchart generator analyzing code to create visual representations of procedural logic.'
    });
    
    try {
      const flowcharts = JSON.parse(response);
      
      // Add file path information to each flowchart
      return flowcharts.map(flowchart => ({
        ...flowchart,
        filePath: file.path
      }));
    } catch (parseError) {
      console.warn(`Failed to parse flowchart response: ${parseError.message}`);
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const flowcharts = JSON.parse(jsonMatch[0]);
        return flowcharts.map(flowchart => ({
          ...flowchart,
          filePath: file.path
        }));
      }
      
      // If no JSON can be extracted, check for mermaid code
      const mermaidMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/);
      if (mermaidMatch) {
        return [{
          name: `Main flow in ${path.basename(file.path)}`,
          description: "Extracted flowchart",
          mermaidCode: mermaidMatch[1],
          filePath: file.path
        }];
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error extracting flowcharts from ${file.path}:`, error);
    return null;
  }
}

/**
 * Extract main functions from a large code file
 * @param {string} content - File content
 * @param {string} extension - File extension
 * @returns {string} Extracted main functions
 */
function extractMainFunctions(content, extension) {
  // This is a simplified implementation - a real one would use language-specific parsing
  const lines = content.split('\n');
  let extractedContent = [];
  let inFunction = false;
  let bracketCount = 0;
  let functionHeader = '';
  
  // Different regex patterns for different languages
  let functionPattern;
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      functionPattern = /^\s*(async\s+)?(function\s+\w+\s*\(|const\s+\w+\s*=\s*(\async\s*)?\(|class\s+\w+|[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*{)/;
      break;
    case 'py':
      functionPattern = /^\s*def\s+\w+\s*\(|^\s*class\s+\w+/;
      break;
    case 'java':
    case 'cs':
      functionPattern = /^\s*(public|private|protected)?\s*(static)?\s*\w+(\s*<[^>]*>)?\s+\w+\s*\([^)]*\)\s*({|throws)/;
      break;
    default:
      functionPattern = /^\s*function|^\s*def|^\s*class|^\s*(public|private|protected)/;
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inFunction && functionPattern.test(line)) {
      // Start of a function found
      inFunction = true;
      bracketCount = 0;
      functionHeader = line;
      extractedContent.push(line);
      
      // Count opening brackets
      bracketCount += (line.match(/{/g) || []).length;
      bracketCount -= (line.match(/}/g) || []).length;
      
      // For Python (no brackets)
      if (extension === 'py' && !bracketCount) {
        bracketCount = 1; // Use indentation instead
      }
    } else if (inFunction) {
      extractedContent.push(line);
      
      if (extension === 'py') {
        // For Python, track indentation
        if (/^\s*def\s+\w+|^\s*class\s+\w+/.test(line)) {
          // Another function/class at same level, end previous
          inFunction = false;
          extractedContent.push('\n'); // Add separator
        }
      } else {
        // Count brackets to track function scope
        bracketCount += (line.match(/{/g) || []).length;
        bracketCount -= (line.match(/}/g) || []).length;
        
        if (bracketCount === 0) {
          // End of function
          inFunction = false;
          extractedContent.push('\n'); // Add separator
        }
      }
    }
    
    // Limit to reasonable size (5 functions or 300 lines)
    if (extractedContent.length > 300 || extractedContent.filter(l => l === '\n').length >= 5) {
      break;
    }
  }
  
  return extractedContent.join('\n');
}

module.exports = {
  createFlowcharts
};
