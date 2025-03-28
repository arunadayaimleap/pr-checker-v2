// Simple test to verify ES modules are working
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 ES Modules test running!');
console.log(`Current file: ${__filename}`);
console.log(`Current directory: ${__dirname}`);

// Load dotenv
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('Environment loaded');

// Check if API key exists
if (process.env.OPENROUTER_API_KEY) {
  console.log('✅ OPENROUTER_API_KEY found in environment');
} else {
  console.log('❌ OPENROUTER_API_KEY not found in environment');
}

console.log('✨ ES Modules test completed successfully');
