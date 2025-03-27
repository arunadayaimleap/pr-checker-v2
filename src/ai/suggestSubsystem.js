const { callOpenAI } = require('./openAIClient');
const path = require('path');

/**
 * Analyzes files to identify architectural subsystems
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Object>} Subsystem classifications
 */
async function identifySubsystems(changedFiles) {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      subsystems: [],
      fileClassifications: []
    };
  }
  
  // Prepare file info for classification
  const fileInfo = changedFiles.map(file => ({
    path: file.path,
    extension: file.extension,
    dirPath: path.dirname(file.path),
    content: file.content.length > 1000 ? file.content.substring(0, 1000) + '...' : file.content
  }));
  
  // Analyze file paths to infer project structure
  const projectStructure = analyzeProjectStructure(fileInfo);
  
  // Use AI to classify files into subsystems
  const classifications = await classifyFiles(fileInfo, projectStructure);
  
  // Extract unique subsystems
  const uniqueSubsystems = [...new Set(classifications.map(c => c.subsystem))];
  
  return {
    subsystems: uniqueSubsystems.map(name => ({
      name,
      description: getSubsystemDescription(name)
    })),
    fileClassifications: classifications
  };
}

/**
 * Analyze project structure based on file paths
 * @param {Array<Object>} fileInfo - Array of file info objects
 * @returns {Object} Project structure information
 */
function analyzeProjectStructure(fileInfo) {
  // Count directories to find common patterns
  const dirCounts = {};
  
  fileInfo.forEach(file => {
    const dirPath = file.dirPath;
    dirCounts[dirPath] = (dirCounts[dirPath] || 0) + 1;
    
    // Also count parent directories
    let parent = dirPath;
    while (parent !== '.' && parent !== '') {
      parent = path.dirname(parent);
      dirCounts[parent] = (dirCounts[parent] || 0) + 1;
    }
  });
  
  // Identify common directories
  const commonDirs = Object.entries(dirCounts)
    .filter(([dir, count]) => count > 1 && dir !== '.' && dir !== '')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dir]) => dir);
  
  // Look for typical subsystem directories
  const typicalSubsystems = [
    'api', 'controllers', 'models', 'views', 'components', 'services', 
    'utils', 'helpers', 'lib', 'core', 'auth', 'db', 'database',
    'config', 'data', 'tests', 'docs', 'scripts', 'middleware'
  ];
  
  const detectedSubsystemDirs = commonDirs.filter(dir => {
    const basename = path.basename(dir).toLowerCase();
    return typicalSubsystems.includes(basename);
  });
  
  return {
    commonDirectories: commonDirs,
    detectedSubsystemDirs,
    fileExtensionGroups: groupFilesByExtension(fileInfo)
  };
}

/**
 * Group files by extension
 * @param {Array<Object>} fileInfo - Array of file info objects
 * @returns {Object} Grouped files by extension
 */
function groupFilesByExtension(fileInfo) {
  const groups = {};
  
  fileInfo.forEach(file => {
    const ext = file.extension || 'unknown';
    if (!groups[ext]) {
      groups[ext] = [];
    }
    groups[ext].push(file.path);
  });
  
  return groups;
}

/**
 * Use AI to classify files into subsystems
 * @param {Array<Object>} fileInfo - Array of file info objects
 * @param {Object} projectStructure - Project structure information
 * @returns {Promise<Array<Object>>} Array of file classifications
 */
async function classifyFiles(fileInfo, projectStructure) {
  const prompt = `
    Analyze these files and classify them into architectural subsystems based on their content, path, and naming.
    
    File information:
    ${JSON.stringify(fileInfo, null, 2)}
    
    Project structure analysis:
    ${JSON.stringify(projectStructure, null, 2)}
    
    Classify each file into one of these common architectural subsystems:
    - UI/Presentation Layer
    - Business Logic Layer
    - Data Access Layer
    - Authentication Layer
    - API Layer
    - Configuration Layer
    - Utility/Helper
    - Testing
    - Documentation
    - Build/Deploy
    - Unknown/Other
    
    You can also suggest more specific subsystems based on what you see in the code.
    
    Return a JSON array with this structure:
    [
      {
        "filePath": "path/to/file",
        "subsystem": "subsystem name",
        "confidence": "high|medium|low",
        "reason": "brief reason for classification"
      }
    ]
  `;
  
  try {
    const response = await callOpenAI(prompt, {
      system_message: 'You are a software architecture expert analyzing code to identify subsystems and architectural layers.'
    });
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.warn(`Failed to parse subsystem response: ${parseError.message}`);
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    }
  } catch (error) {
    console.error('Error classifying files into subsystems:', error);
    return [];
  }
}

/**
 * Get description for a subsystem based on its name
 * @param {string} subsystemName - Name of the subsystem
 * @returns {string} Description of the subsystem
 */
function getSubsystemDescription(subsystemName) {
  const descriptions = {
    'UI/Presentation Layer': 'Components that handle user interface and presentation logic',
    'Business Logic Layer': 'Core business rules and application logic',
    'Data Access Layer': 'Database interactions and data persistence',
    'Authentication Layer': 'User authentication and authorization',
    'API Layer': 'API endpoints and external interfaces',
    'Configuration Layer': 'Application configuration and settings',
    'Utility/Helper': 'Reusable utility functions and helper code',
    'Testing': 'Test suites and testing utilities',
    'Documentation': 'Documentation and informational content',
    'Build/Deploy': 'Build configuration and deployment scripts',
    'Unknown/Other': 'Unclassified or miscellaneous components'
  };
  
  return descriptions[subsystemName] || 'Custom subsystem component';
}

module.exports = {
  identifySubsystems
};
