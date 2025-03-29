import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import processPR from './pr-checker.js';
import { CHANGED_FILES } from './utils/openrouter-utils.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🚀 Starting PR Checker');
console.log('-----------------------------------');

// Verify required environment variables
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
  console.error('Please set up your .env file with your OpenRouter API key');
  process.exit(1);
}

// Main function to run the PR checker
async function main() {
  try {
    // Create a formatted PR content for testing
    const formattedPRContent = `This PR includes changes to the user profile system:

${CHANGED_FILES.map(file => `- **${file.name}** (${file.type}): ${file.description}`).join('\n')}

These changes are necessary to improve performance by adding caching to user profile operations.
Please review the changes and provide feedback.`;
    
    // Process the PR
    await processPR(formattedPRContent, 123); // Mock PR number for testing
    
  } catch (error) {
    console.error('❌ Error running PR Checker:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
