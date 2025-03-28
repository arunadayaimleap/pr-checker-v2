import { analyzeChangedFiles } from './openrouter';

export async function analyzeChanges(files) {
  try {
    // Extract the necessary information from the files
    const formattedFiles = files.map(file => ({
      filename: file.filename,
      content: file.patch || file.content,
      language: detectLanguage(file.filename)
    }));
    
    // Use OpenRouter to analyze the changes
    const analysis = await analyzeChangedFiles(formattedFiles);
    
    return {
      summary: analysis,
      success: true
    };
  } catch (error) {
    console.error('Error analyzing changes:', error);
    return {
      summary: "Failed to analyze changes due to an error with the OpenRouter API.",
      success: false,
      error: error.message
    };
  }
}

// Simple function to detect language based on file extension
function detectLanguage(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'java': 'java',
    'php': 'php',
    'cs': 'csharp',
    'css': 'css',
    'html': 'html',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
    'sh': 'bash',
    'sql': 'sql'
  };
  
  return languageMap[extension] || '';
}
