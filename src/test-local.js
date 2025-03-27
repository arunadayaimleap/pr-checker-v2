require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

console.log('🧪 Starting PR Checker in local test mode');
console.log('-----------------------------------');

// Verify environment variables
console.log('🔍 Checking environment configuration...');
const requiredEnvVars = ['CHATGPT_API_KEY', 'GITHUB_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}
console.log('✅ Environment configuration verified');

// Get target project path
const targetProjectPath = process.argv[2];

if (!targetProjectPath) {
  console.error('❌ Please provide a target project path');
  console.error('Usage: node src/test-local.js <path-to-project>');
  process.exit(1);
}

const resolvedPath = path.resolve(targetProjectPath);

// Check if the target path exists
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Target project path does not exist: ${resolvedPath}`);
  process.exit(1);
}

// Check if the target path is a directory
const targetStats = fs.statSync(resolvedPath);
if (!targetStats.isDirectory()) {
  console.error(`❌ Target path is not a directory: ${resolvedPath}`);
  process.exit(1);
}

console.log(`📂 Target project path: ${resolvedPath}`);
console.log('🚀 Running PR Checker...');

try {
  // Run the PR checker
  const result = execSync(`node src/index.js "${resolvedPath}"`, {
    stdio: 'inherit'
  });
  
  console.log('✅ PR Checker completed successfully in local test mode');
  console.log('📝 Check pr-review-output.md for the results');
} catch (error) {
  console.error('❌ PR Checker failed:', error.message);
  process.exit(1);
}
