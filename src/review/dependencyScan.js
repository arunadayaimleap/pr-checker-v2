const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

/**
 * Scans project dependencies for vulnerabilities and outdated packages
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Object>} Dependency scan results
 */
async function scanDependencies(targetPath) {
  try {
    // Find dependency files
    const dependencyFiles = await findDependencyFiles(targetPath);
    
    if (dependencyFiles.length === 0) {
      return {
        detected: false,
        dependencyFiles: [],
        vulnerabilities: [],
        outdatedPackages: [],
        summary: "No dependency files found in the project."
      };
    }
    
    // Process each dependency file
    const results = await Promise.all(
      dependencyFiles.map(file => analyzeFile(file, targetPath))
    );
    
    // Combine results
    const combinedResults = {
      detected: true,
      dependencyFiles: dependencyFiles.map(f => f.path),
      vulnerabilities: [],
      outdatedPackages: [],
      summary: ""
    };
    
    // Merge all results
    results.forEach(result => {
      if (result.vulnerabilities) {
        combinedResults.vulnerabilities.push(...result.vulnerabilities);
      }
      if (result.outdatedPackages) {
        combinedResults.outdatedPackages.push(...result.outdatedPackages);
      }
    });
    
    // Create summary
    const vulnCount = combinedResults.vulnerabilities.length;
    const outdatedCount = combinedResults.outdatedPackages.length;
    
    combinedResults.summary = 
      `Found ${dependencyFiles.length} dependency file(s). ` +
      `Detected ${vulnCount} potential vulnerabilit${vulnCount === 1 ? 'y' : 'ies'} and ` +
      `${outdatedCount} outdated package${outdatedCount === 1 ? '' : 's'}.`;
    
    return combinedResults;
  } catch (error) {
    console.error('Error scanning dependencies:', error);
    return {
      detected: false,
      error: error.message,
      summary: "Failed to scan dependencies due to an error."
    };
  }
}

/**
 * Find dependency files in the project
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Array<Object>>} Array of dependency file objects
 */
async function findDependencyFiles(targetPath) {
  const dependencyFiles = [];
  
  // Common dependency file patterns
  const patterns = [
    { name: 'package.json', type: 'npm' },
    { name: 'package-lock.json', type: 'npm-lock' },
    { name: 'yarn.lock', type: 'yarn-lock' },
    { name: 'requirements.txt', type: 'python' },
    { name: 'Pipfile', type: 'python-pipfile' },
    { name: 'pom.xml', type: 'maven' },
    { name: 'build.gradle', type: 'gradle' },
    { name: 'Gemfile', type: 'ruby' },
    { name: 'Cargo.toml', type: 'rust' }
  ];
  
  // Check for each pattern at the root level
  for (const pattern of patterns) {
    const filePath = path.join(targetPath, pattern.name);
    if (await fs.pathExists(filePath)) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        dependencyFiles.push({
          path: filePath,
          relativePath: pattern.name,
          type: pattern.type,
          content
        });
      } catch (error) {
        console.warn(`Could not read ${filePath}: ${error.message}`);
      }
    }
  }
  
  return dependencyFiles;
}

/**
 * Analyze a dependency file
 * @param {Object} file - Dependency file object
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeFile(file, targetPath) {
  switch (file.type) {
    case 'npm':
      return analyzeNpmPackageJson(file, targetPath);
    case 'python':
      return analyzePythonRequirements(file);
    default:
      return {
        filePath: file.path,
        type: file.type,
        vulnerabilities: [],
        outdatedPackages: [],
        message: `Analysis for ${file.type} dependency files is not yet implemented.`
      };
  }
}

/**
 * Analyze NPM package.json
 * @param {Object} file - Dependency file object
 * @param {string} targetPath - Path to the target project
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeNpmPackageJson(file, targetPath) {
  try {
    const packageJson = JSON.parse(file.content);
    const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    
    if (Object.keys(dependencies).length === 0) {
      return {
        filePath: file.path,
        type: 'npm',
        vulnerabilities: [],
        outdatedPackages: [],
        message: "No dependencies found in package.json"
      };
    }
    
    // Check for known vulnerable packages (simplified - in a real implementation, you'd use a vulnerability database)
    const knownVulnerablePackages = [
      { name: 'lodash', versionsBelow: '4.17.20', severity: 'high', cve: 'CVE-2020-8203' },
      { name: 'axios', versionsBelow: '0.21.1', severity: 'medium', cve: 'CVE-2020-28168' },
      { name: 'minimist', versionsBelow: '1.2.6', severity: 'medium', cve: 'CVE-2021-44906' }
    ];
    
    const vulnerabilities = [];
    const outdatedPackages = [];
    
    // Check each dependency
    for (const [packageName, versionRange] of Object.entries(dependencies)) {
      // Clean the version range (remove ^, ~, etc.)
      const version = versionRange.replace(/[\^~>=<]/g, '');
      
      // Check if this package is in the known vulnerable list
      const vulnerablePackage = knownVulnerablePackages.find(pkg => pkg.name === packageName);
      if (vulnerablePackage && compareVersions(version, vulnerablePackage.versionsBelow) < 0) {
        vulnerabilities.push({
          package: packageName,
          currentVersion: version,
          recommendation: `Update to at least ${vulnerablePackage.versionsBelow}`,
          severity: vulnerablePackage.severity,
          cve: vulnerablePackage.cve
        });
      }
      
      // In a real implementation, you would also call npm outdated
      // Simplified here to avoid actually running npm commands
      if (Math.random() > 0.7) { // Randomly add some outdated packages for demonstration
        outdatedPackages.push({
          package: packageName,
          currentVersion: version,
          latestVersion: incrementVersion(version),
          updateType: 'minor'
        });
      }
    }
    
    return {
      filePath: file.path,
      type: 'npm',
      vulnerabilities,
      outdatedPackages,
      message: `Found ${vulnerabilities.length} vulnerabilities and ${outdatedPackages.length} outdated packages.`
    };
  } catch (error) {
    console.error(`Error analyzing package.json: ${error.message}`);
    return {
      filePath: file.path,
      type: 'npm',
      error: error.message,
      vulnerabilities: [],
      outdatedPackages: []
    };
  }
}

/**
 * Analyze Python requirements.txt
 * @param {Object} file - Dependency file object
 * @returns {Promise<Object>} Analysis results
 */
async function analyzePythonRequirements(file) {
  try {
    const lines = file.content.split('\n');
    const dependencies = lines
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const [name, version] = line.split('==');
        return { name, version: version || 'latest' };
      });
    
    if (dependencies.length === 0) {
      return {
        filePath: file.path,
        type: 'python',
        vulnerabilities: [],
        outdatedPackages: [],
        message: "No dependencies found in requirements.txt"
      };
    }
    
    // Known vulnerable Python packages (simplified)
    const knownVulnerablePackages = [
      { name: 'django', versionsBelow: '3.2.4', severity: 'high', cve: 'CVE-2021-33203' },
      { name: 'flask', versionsBelow: '2.0.1', severity: 'medium', cve: 'CVE-2021-26296' },
      { name: 'pillow', versionsBelow: '8.3.2', severity: 'high', cve: 'CVE-2021-34552' }
    ];
    
    const vulnerabilities = [];
    const outdatedPackages = [];
    
    // Check each dependency
    for (const { name, version } of dependencies) {
      if (version === 'latest') continue;
      
      // Check if this package is in the known vulnerable list
      const vulnerablePackage = knownVulnerablePackages.find(pkg => pkg.name === name.toLowerCase());
      if (vulnerablePackage && compareVersions(version, vulnerablePackage.versionsBelow) < 0) {
        vulnerabilities.push({
          package: name,
          currentVersion: version,
          recommendation: `Update to at least ${vulnerablePackage.versionsBelow}`,
          severity: vulnerablePackage.severity,
          cve: vulnerablePackage.cve
        });
      }
      
      // Simplified outdated check
      if (Math.random() > 0.7) { // Randomly add some outdated packages for demonstration
        outdatedPackages.push({
          package: name,
          currentVersion: version,
          latestVersion: incrementVersion(version),
          updateType: 'minor'
        });
      }
    }
    
    return {
      filePath: file.path,
      type: 'python',
      vulnerabilities,
      outdatedPackages,
      message: `Found ${vulnerabilities.length} vulnerabilities and ${outdatedPackages.length} outdated packages.`
    };
  } catch (error) {
    console.error(`Error analyzing requirements.txt: ${error.message}`);
    return {
      filePath: file.path,
      type: 'python',
      error: error.message,
      vulnerabilities: [],
      outdatedPackages: []
    };
  }
}

/**
 * Simple version comparison utility
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0; // Versions are equal
}

/**
 * Increment a version number for demonstration purposes
 * @param {string} version - Version string
 * @returns {string} Incremented version
 */
function incrementVersion(version) {
  const parts = version.split('.').map(Number);
  parts[parts.length - 1] += 1;
  return parts.join('.');
}

module.exports = {
  scanDependencies
};
