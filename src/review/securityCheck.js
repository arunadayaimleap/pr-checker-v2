const { callOpenAI } = require('../ai/openAIClient');
const path = require('path');

/**
 * Performs security checks on changed files
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Object>} Security check results
 */
async function checkSecurity(changedFiles) {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      issues: [],
      summary: "No files to check for security issues."
    };
  }
  
  // Filter files to only include those that might contain security concerns
  const securityRelevantFiles = changedFiles.filter(file => {
    // Files that typically contain security-sensitive code
    const sensitiveExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'php', 'rb', 'java', 'cs', 'go', 'rs'];
    const sensitivePathPatterns = ['auth', 'security', 'login', 'password', 'crypt', 'user', 'admin', 'permission'];
    
    const isRelevantExtension = sensitiveExtensions.includes(file.extension);
    const isRelevantPath = sensitivePathPatterns.some(pattern => file.path.toLowerCase().includes(pattern));
    
    return isRelevantExtension || isRelevantPath;
  });
  
  if (securityRelevantFiles.length === 0) {
    return {
      issues: [],
      summary: "No security-sensitive files found in the changes."
    };
  }
  
  // Perform basic pattern-based checks
  const patternResults = await performPatternBasedChecks(securityRelevantFiles);
  
  // Perform AI-based security analysis
  const aiResults = await performAISecurityAnalysis(securityRelevantFiles);
  
  // Combine results
  const allIssues = [...patternResults, ...aiResults];
  
  // Create summary
  const summary = allIssues.length > 0
    ? `Found ${allIssues.length} potential security issue${allIssues.length === 1 ? '' : 's'}.`
    : "No security issues detected.";
  
  return {
    issues: allIssues,
    summary
  };
}

/**
 * Performs pattern-based security checks
 * @param {Array<Object>} files - Array of file objects
 * @returns {Promise<Array<Object>>} Array of security issues
 */
async function performPatternBasedChecks(files) {
  const issues = [];
  
  // Common security patterns to check
  const patterns = [
    {
      pattern: /password\s*=\s*["'`][^"'`]*["'`]/i,
      name: "Hardcoded Password",
      description: "Hardcoded passwords can be extracted from source code and present a security risk.",
      severity: "high",
      recommendation: "Store passwords in environment variables or a secure secret management system."
    },
    {
      pattern: /api[_-]?key\s*=\s*["'`][^"'`]{10,}["'`]/i,
      name: "Hardcoded API Key",
      description: "API keys should not be committed to the repository.",
      severity: "high",
      recommendation: "Store API keys in environment variables or a secure secret management system."
    },
    {
      pattern: /eval\s*\(/,
      name: "Eval Usage",
      description: "The use of eval() can lead to code injection vulnerabilities.",
      severity: "medium",
      recommendation: "Avoid using eval(). Use safer alternatives specific to your use case."
    },
    {
      pattern: /exec\s*\(\s*["'`]?[^"'`]*\$\{/,
      name: "Command Injection Risk",
      description: "Possible command injection vulnerability with template literals in exec calls.",
      severity: "high",
      recommendation: "Use safer alternatives like child_process.execFile or validate and sanitize inputs."
    },
    {
      pattern: /\.innerHTML\s*=\s*/,
      name: "DOM-based XSS Risk",
      description: "Setting innerHTML directly can lead to XSS vulnerabilities.",
      severity: "medium",
      recommendation: "Use safer alternatives like textContent or DOM methods, or sanitize HTML inputs."
    },
    {
      pattern: /mongoose\.connect\(.*\)\s*;/,
      name: "Database Connection Credentials",
      description: "Database connection strings might contain hardcoded credentials.",
      severity: "medium",
      recommendation: "Store database credentials in environment variables."
    }
  ];
  
  // Check each file
  for (const file of files) {
    // Skip large files to avoid excessive processing
    if (file.fileSize > 200000) {
      issues.push({
        filePath: file.path,
        name: "Large File Skipped",
        description: "This file is too large for pattern-based security scanning.",
        severity: "info",
        lineNumbers: [],
        recommendation: "Consider breaking the file into smaller modules if possible."
      });
      continue;
    }
    
    const lines = file.content.split('\n');
    
    // Check each pattern
    for (const { pattern, name, description, severity, recommendation } of patterns) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          issues.push({
            filePath: file.path,
            name,
            description,
            severity,
            lineNumbers: [i + 1], // 1-based line numbers
            code: line.trim(),
            recommendation
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * Performs AI-based security analysis
 * @param {Array<Object>} files - Array of file objects
 * @returns {Promise<Array<Object>>} Array of security issues
 */
async function performAISecurityAnalysis(files) {
  // Select the most relevant files for in-depth analysis to avoid excessive API calls
  const prioritizedFiles = files.slice(0, 3); // Limit to 3 most relevant files
  
  const allIssues = [];
  
  for (const file of prioritizedFiles) {
    // Skip very large files
    if (file.fileSize > 50000) {
      continue;
    }
    
    const prompt = `
      Analyze this code file for security vulnerabilities:
      File path: ${file.path}
      
      \`\`\`${file.extension}
      ${file.content}
      \`\`\`
      
      Focus on identifying these common security issues:
      1. Injection vulnerabilities (SQL, NoSQL, command, etc.)
      2. Broken authentication
      3. Sensitive data exposure
      4. XML External Entities (XXE)
      5. Broken access control
      6. Security misconfiguration
      7. Cross-Site Scripting (XSS)
      8. Insecure deserialization
      9. Using components with known vulnerabilities
      10. Insufficient logging & monitoring
      
      Return a JSON array of security issues with this structure:
      [
        {
          "name": "issue name (e.g., 'SQL Injection Risk')",
          "description": "concise description of the security issue",
          "severity": "high|medium|low",
          "lineNumbers": [lines where the issue occurs],
          "code": "problematic code snippet",
          "recommendation": "suggestion for fixing"
        }
      ]
      
      Only include genuine security issues, not code quality concerns. If no security issues are found, return an empty array.
    `;
    
    try {
      const response = await callOpenAI(prompt, {
        system_message: 'You are a security expert analyzing code for security vulnerabilities. Be precise and focus only on actual security risks, not general code quality issues.',
        temperature: 0.1 // Lower temperature for more consistent analysis
      });
      
      try {
        const issues = JSON.parse(response);
        
        // Add file path to each issue
        const fileIssues = issues.map(issue => ({
          ...issue,
          filePath: file.path
        }));
        
        allIssues.push(...fileIssues);
      } catch (parseError) {
        console.warn(`Failed to parse security check response: ${parseError.message}`);
        
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const issues = JSON.parse(jsonMatch[0]);
            const fileIssues = issues.map(issue => ({
              ...issue,
              filePath: file.path
            }));
            allIssues.push(...fileIssues);
          } catch (e) {
            console.error(`Error extracting JSON from security check response: ${e.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error performing AI security analysis on ${file.path}:`, error);
    }
  }
  
  return allIssues;
}

module.exports = {
  checkSecurity
};
