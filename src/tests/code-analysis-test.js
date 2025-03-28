import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs-extra';

// Load environment variables with proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Sample code file to analyze
const SAMPLE_CODE = `
// User authentication module
class UserAuth {
  constructor(database) {
    this.db = database;
  }

  async login(username, password) {
    // Get user from database
    const user = await this.db.findUser(username);
    
    // Check if user exists and password matches
    if (user && user.password == password) {
      return { 
        success: true, 
        token: this.generateToken(user.id),
        user: user
      };
    }
    
    return { success: false };
  }

  generateToken(userId) {
    // Simple token generation - not secure!
    return "token_" + userId + "_" + Date.now();
  }

  validatePassword(password) {
    // Check if password is at least 8 characters
    return password.length >= 8;
  }
}

module.exports = UserAuth;
`;

async function testCodeAnalysis() {
  try {
    console.log('🧪 Starting Code Analysis Test with OpenRouter');
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found in environment variables');
    
    // Create a temporary file with the sample code
    const tempFilePath = path.join(__dirname, 'temp-sample-code.js');
    await fs.writeFile(tempFilePath, SAMPLE_CODE);
    console.log(`📂 Created temporary file: ${tempFilePath}`);
    console.log('📄 Sample code content:');
    console.log('-----------------');
    console.log(SAMPLE_CODE);
    console.log('-----------------');
    
    const model = 'microsoft/phi-3-medium-128k-instruct:free';
    console.log(`Using model: ${model}`);
    
    // Make the API request
    console.log('🚀 Sending code to OpenRouter API for analysis...');
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
            content: 'You are a senior software developer who specializes in code review. You focus on security issues, bugs, and best practices. Be concise but thorough in your analysis.'
          },
          {
            role: 'user',
            content: `Review this JavaScript code and provide a detailed analysis of security vulnerabilities, potential bugs, and code improvement suggestions:\n\n${SAMPLE_CODE}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('\n📊 API Response Details:');
    console.log(`Model used: ${data.model}`);
    if (data.usage) {
      console.log(`Prompt tokens: ${data.usage.prompt_tokens}`);
      console.log(`Completion tokens: ${data.usage.completion_tokens}`);
      console.log(`Total tokens: ${data.usage.total_tokens}`);
    }
    
    // Extract the analysis
    const analysis = data.choices[0].message.content;
    
    console.log('\n📝 Code Analysis Results:');
    console.log('-----------------');
    console.log(analysis);
    console.log('-----------------');
    
    // Save the analysis to a file
    const outputFilePath = path.join(__dirname, '../code-analysis-output.md');
    await fs.writeFile(outputFilePath, `# Code Analysis Results\n\n${analysis}`);
    console.log(`\n✅ Analysis saved to: ${outputFilePath}`);
    
    // Output more API details for debugging
    console.log('\n🔍 Full API response structure:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Code Analysis Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up the temporary file
    const tempFilePath = path.join(__dirname, 'temp-sample-code.js');
    if (await fs.pathExists(tempFilePath)) {
      await fs.remove(tempFilePath);
      console.log('🧹 Temporary file removed');
    }
  }
}

testCodeAnalysis();
