const { callOpenAI } = require('./openAIClient');

/**
 * Creates a summary of all the changes in the PR
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Object>} Summary of changes and their impact
 */
async function createSummary(changedFiles) {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      summary: "No files have been changed.",
      impact: "No impact detected."
    };
  }
  
  // Prepare information about each file to summarize
  const fileChanges = changedFiles.map(file => {
    const fileInfo = {
      path: file.path,
      isNew: file.isNew,
      extension: file.extension
    };
    
    // Add diff summary for non-new files
    if (!file.isNew) {
      // Get a summary of the diff (simplified for brevity)
      const addedLines = file.content.split('\n').length;
      const removedLines = file.previousContent.split('\n').length;
      fileInfo.changes = {
        added: addedLines,
        removed: removedLines,
        net: addedLines - removedLines
      };
    }
    
    return fileInfo;
  });
  
  // Select up to 5 files to provide detailed content for
  const filesToDetail = changedFiles
    .filter(file => file.fileSize < 10000) // Skip large files
    .slice(0, 5);
  
  const fileDetails = filesToDetail.map(file => ({
    path: file.path,
    content: file.content.length > 2000 ? file.content.substring(0, 2000) + '...' : file.content,
    previousContent: !file.isNew && file.previousContent.length > 2000 ? 
      file.previousContent.substring(0, 2000) + '...' : file.previousContent
  }));
  
  // Construct the prompt for OpenAI
  const prompt = `
    Please analyze these file changes and provide a concise summary of what has changed and its potential impact.
    
    File changes overview:
    ${JSON.stringify(fileChanges, null, 2)}
    
    Detailed content for key files:
    ${JSON.stringify(fileDetails, null, 2)}
    
    Please respond with a JSON object containing:
    1. "summary": A bullet-point list of the main changes (what was added, modified, or removed)
    2. "impact": The potential impact of these changes (e.g., security improvements, performance changes, etc.)
  `;
  
  try {
    // Call the AI to generate the summary
    const response = await callOpenAI(prompt);
    
    // Try to parse the response as JSON
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // If parsing fails, try to extract the JSON part
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If that also fails, create a simple structure
      return {
        summary: response.split('\n').filter(line => line.trim().startsWith('-')).join('\n'),
        impact: "Impact analysis not available in structured format."
      };
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      summary: "Failed to generate summary due to an error.",
      impact: "Unknown impact due to summary generation failure."
    };
  }
}

module.exports = {
  createSummary
};
