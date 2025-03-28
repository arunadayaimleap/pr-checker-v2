import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeWithOpenRouter } from '../lib/openrouter.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  try {
    console.log('🚀 Testing OpenRouter API with Microsoft Phi-3 Medium...');
    
    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Test with sample code
    const testContent = `Please analyze this simple JavaScript code:
\`\`\`javascript
function calculateSum(numbers) {
  return numbers.reduce((total, num) => total + num, 0);
}

function findMax(numbers) {
  return Math.max(...numbers);
}
\`\`\``;
    
    console.log('📤 Sending request to OpenRouter API (Microsoft Phi-3 Medium)...');
    const result = await analyzeWithOpenRouter(testContent, { model: 'microsoft/phi-3-medium-128k-instruct:free' });
    
    console.log('\n✅ API Response:');
    console.log('====================');
    console.log(result);
    console.log('====================');
    console.log('\n✨ OpenRouter API test completed successfully!');
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
