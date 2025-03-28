import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Load environment variables with proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testOpenRouterDirectly() {
  try {
    console.log('🚀 Testing OpenRouter API directly...');
    
    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found in environment variables');
    
    const model = 'microsoft/phi-3-medium-128k-instruct:free';
    console.log(`Using model: ${model}`);
    
    // Make the API request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/pr-checker-v2',
        'X-Title': 'PR Checker V2'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Say hello world'
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('\n✅ Raw API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Analyze the structure to see how to extract the message content
    if (data.choices && data.choices.length > 0) {
      console.log('\nChoices array structure:');
      console.log(JSON.stringify(data.choices[0], null, 2));
      
      if (data.choices[0].message) {
        console.log('\nExtracted message:');
        console.log(data.choices[0].message.content);
      }
    }
    
    console.log('\n✨ OpenRouter API direct test completed successfully!');
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

testOpenRouterDirectly();
