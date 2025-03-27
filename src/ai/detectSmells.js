const { callOpenAI } = require('./openAIClient');

/**
 * Detects code smells in changed files
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Array<Object>>} Array of detected code smells
 */
async function findSmells(changedFiles) {
  if (!changedFiles || changedFiles.length === 0) {
    return [];
  }
  
  // Process each file to find code smells
  const allSmellPromises = changedFiles.map(file => 
    detectSmellsInFile(file)
  );
  
  // Wait for all smell detection to complete
  const allSmells = await Promise.all(allSmellPromises);
  
  // Filter out null results and flatten the array
  return allSmells
    .filter(Boolean)
    .flat()
    .filter(smell => smell && smell.name && smell.description);
}

/**
 * Detect code smells in a single file
 * @param {Object} file - File object
 * @returns {Promise<Array<Object>>} Array of code smell objects for the file
 */
async function detectSmellsInFile(file) {
  // Skip very large files
  if (file.fileSize > 50000) {
    return [{
      filePath: file.path,
      name: "Large File",
      description: "This file is very large (>50KB), which may indicate it has too many responsibilities.",
      severity: "medium",
      lineNumbers: [],
      suggestions: ["Consider breaking the file into smaller, more focused modules."]
    }];
  }
  
  // Skip binary or non-code files
  const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cs', 'go', 'php', 'rb', 'c', 'cpp', 'h', 'hpp'];
  if (!codeExtensions.includes(file.extension)) {
    return [];
  }
  
  const prompt = `
    Analyze this code file and identify any code smells or anti-patterns:
    File path: ${file.path}
    
    \`\`\`${file.extension}
    ${file.content}
    \`\`\`
    
    Focus on identifying these common code smells:
    1. Long methods/functions (more than 30-50 lines)
    2. Large classes/modules with too many responsibilities
    3. Duplicated code
    4. Deeply nested conditionals (more than 3 levels)
    5. Too many parameters (more than 4-5)
    6. Global state/variables
    7. Excessive comments (might indicate unclear code)
    8. Poor naming (unclear variable/function names)
    9. Magic numbers or strings
    10. Unnecessary complexity
    
    Return a JSON array of code smell objects with this structure:
    [
      {
        "name": "smell name (e.g., 'Long Method')",
        "description": "concise description of the issue",
        "severity": "high|medium|low",
        "lineNumbers": [line numbers where the smell occurs],
        "suggestions": ["suggestion for improvement"]
      }
    ]
    
    Only include genuine code smells, not minor stylistic issues. If no significant smells are found, return an empty array.
  `;
  
  try {
    const response = await callOpenAI(prompt, {
      system_message: 'You are a code quality expert analyzing code to identify potential issues and anti-patterns.',
      temperature: 0.1 // Lower temperature for more consistent analysis
    });
    
    try {
      const smells = JSON.parse(response);
      
      // Add file path information to each smell
      return smells.map(smell => ({
        ...smell,
        filePath: file.path
      }));
    } catch (parseError) {
      console.warn(`Failed to parse code smell response: ${parseError.message}`);
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const smells = JSON.parse(jsonMatch[0]);
        return smells.map(smell => ({
          ...smell,
          filePath: file.path
        }));
      }
      
      return [];
    }
  } catch (error) {
    console.error(`Error detecting code smells in ${file.path}:`, error);
    return [];
  }
}

module.exports = {
  findSmells
};
