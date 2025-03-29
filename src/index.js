import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import processPR from './pr-checker.js';

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
    // Get PR content
    // This would normally come from the GitHub API in a real workflow
    // For now, we'll use a sample PR content
    const formattedPRContent = 'Sample PR content'; // Replace with actual PR content
    
    // Process the PR
    await processPR(formattedPRContent);
    
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
