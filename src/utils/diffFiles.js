const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Detect changed files based on Git status
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Array<Object>>} - Array of changed file objects with path and content
 */
async function getChangedFiles(targetPath) {
  try {
    // Check if the target directory is a git repository
    const isGitRepo = fs.existsSync(path.join(targetPath, '.git'));
    
    if (isGitRepo) {
      return await getChangedFilesFromGit(targetPath);
    } else {
      return await getAllProjectFiles(targetPath);
    }
  } catch (error) {
    console.error('Error getting changed files:', error);
    throw error;
  }
}

/**
 * Get changed files from Git
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Array<Object>>} - Array of changed file objects
 */
async function getChangedFilesFromGit(targetPath) {
  try {
    // Get files changed in the latest commit or in the working directory
    const gitCmd = 'git diff --name-only HEAD';
    let changedFilePaths = [];
    
    try {
      // Execute in the target repository
      process.chdir(targetPath);
      const output = execSync(gitCmd).toString().trim();
      changedFilePaths = output.split('\n').filter(Boolean);
      
      // If no files were changed in the last commit, check unstaged changes
      if (changedFilePaths.length === 0) {
        const unstagedOutput = execSync('git diff --name-only').toString().trim();
        changedFilePaths = unstagedOutput.split('\n').filter(Boolean);
      }
      
      // If still no changes, check staged changes
      if (changedFilePaths.length === 0) {
        const stagedOutput = execSync('git diff --name-only --staged').toString().trim();
        changedFilePaths = stagedOutput.split('\n').filter(Boolean);
      }
    } catch (error) {
      console.warn('Could not get git diff, falling back to all files:', error.message);
      return await getAllProjectFiles(targetPath);
    }
    
    // Process each changed file
    const changedFiles = [];
    for (const filePath of changedFilePaths) {
      const fullPath = path.join(targetPath, filePath);
      if (fs.existsSync(fullPath) && isRelevantFile(filePath)) {
        try {
          // Read previous version if possible
          let previousContent = '';
          try {
            previousContent = execSync(`git show HEAD:${filePath}`, {
              cwd: targetPath
            }).toString();
          } catch (e) {
            // File might be new, so there's no previous version
            previousContent = '';
          }
          
          const currentContent = await fs.readFile(fullPath, 'utf8');
          const extension = path.extname(filePath).slice(1);
          const fileSize = (await fs.stat(fullPath)).size;
          
          changedFiles.push({
            path: filePath,
            fullPath,
            content: currentContent,
            previousContent,
            extension,
            fileSize,
            isNew: previousContent === ''
          });
        } catch (err) {
          console.warn(`Could not process file ${filePath}:`, err.message);
        }
      }
    }
    
    return changedFiles;
  } catch (error) {
    console.error('Error getting changed files from git:', error);
    throw error;
  }
}

/**
 * Get all files in the project (fallback if not a git repo)
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Array<Object>>} - Array of file objects
 */
async function getAllProjectFiles(targetPath) {
  const result = [];
  
  async function processDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(targetPath, fullPath);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!shouldIgnoreDirectory(entry.name)) {
          await processDirectory(fullPath);
        }
      } else if (isRelevantFile(relativePath)) {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const extension = path.extname(entry.name).slice(1);
          const fileSize = (await fs.stat(fullPath)).size;
          
          result.push({
            path: relativePath,
            fullPath,
            content,
            previousContent: '', // No previous content in non-git mode
            extension,
            fileSize,
            isNew: true
          });
        } catch (err) {
          console.warn(`Could not process file ${relativePath}:`, err.message);
        }
      }
    }
  }
  
  await processDirectory(targetPath);
  return result;
}

/**
 * Check if a directory should be ignored
 * @param {string} dirName - Directory name
 * @returns {boolean} - True if directory should be ignored
 */
function shouldIgnoreDirectory(dirName) {
  const ignoreDirs = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    '.cache'
  ];
  return ignoreDirs.includes(dirName);
}

/**
 * Check if file is relevant for analysis
 * @param {string} filePath - File path
 * @returns {boolean} - True if file is relevant
 */
function isRelevantFile(filePath) {
  // Skip binary, lock files, etc.
  const ignoreExtensions = [
    'lock', 'log', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 
    'woff2', 'ttf', 'eot', 'mp4', 'webm', 'mp3', 'wav', 'pdf'
  ];
  
  const extension = path.extname(filePath).slice(1).toLowerCase();
  
  // Skip binary files and certain extensions
  if (ignoreExtensions.includes(extension)) {
    return false;
  }
  
  // Skip files in ignored directories
  const pathParts = filePath.split(path.sep);
  for (const part of pathParts) {
    if (shouldIgnoreDirectory(part)) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  getChangedFiles
};
