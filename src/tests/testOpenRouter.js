import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeWithOpenRouter } from '../lib/openrouter.js';

// Load environment variables with proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testOpenRouter() {
  try {
    console.log('🚀 Testing OpenRouter API with Microsoft Phi-3 Medium and fallbacks...');
    
    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found in environment variables');
    
    // Test with sample code
    const testContent = 'Please analyze this simple JavaScript code: \n```javascript\nfunction add(a, b) {\n  return a + b;\n}\n```';
    
    console.log('📤 Sending request to OpenRouter API with model fallback...');
    const result = await analyzeWithOpenRouter(testContent);
    
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

testOpenRouter();
