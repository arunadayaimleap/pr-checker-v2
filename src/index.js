import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import processPR from './pr-checker.js';
import { CHANGED_FILES } from './utils/openrouter-utils.js';

// Load environment variables - try multiple paths to ensure we find the .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('Looking for .env file in multiple locations');

// First try the repository root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Then try the current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Also check if variables are already in process.env from direct setting
console.log('Environment variables status:');
console.log(`- OPENROUTER_API_KEY exists: ${Boolean(process.env.OPENROUTER_API_KEY)}`);
console.log(`- GITHUB_TOKEN exists: ${Boolean(process.env.GITHUB_TOKEN)}`);

// Main entry point for the PR Checker

// Check if we're being called directly from run.js
// If so, import the run.js file
if (process.argv.length > 2 && process.argv[2]) {
  console.log('🚀 Starting PR Checker with workspace path:', process.argv[2]);
  console.log(`Command-line arguments: ${JSON.stringify(process.argv)}`);
  
  // Call run.js directly instead of importing it
  import('./run.js')
    .then(module => {
      console.log('✅ Successfully imported run.js');
    })
    .catch(err => {
      console.error('❌ Error importing run.js:', err);
      console.error(err.stack);
      process.exit(1);
    });
} else {
  console.warn('⚠️ No workspace path provided, falling back to sample data');
  console.log(`Command-line arguments: ${JSON.stringify(process.argv)}`);
  
  // Original index.js code for backward compatibility
  import('./legacy-index.js')
    .then(module => {
      console.log('✅ Successfully imported legacy-index.js');
    })
    .catch(err => {
      console.error('❌ Error importing legacy-index.js:', err);
      console.error(err.stack);
      process.exit(1);
    });
}
