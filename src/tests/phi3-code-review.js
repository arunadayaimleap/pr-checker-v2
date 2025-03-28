import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs-extra';

// Load environment variables with proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Sample code to analyze - a simple Express.js API endpoint with security issues
const SAMPLE_CODE = `
const express = require('express');
const mysql = require('mysql');
const app = express();
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'userdb'
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Query database for user
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (results.length > 0) {
      // Create session
      req.session.user = username;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// Get user profile
app.get('/api/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const username = req.session.user;
  
  // Get user data
  const query = "SELECT * FROM users WHERE username = '" + username + "'";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (results.length > 0) {
      res.json({ 
        success: true, 
        user: results[0]  // Includes password hash
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`;

async function testPhiCodeReview() {
  try {
    console.log('🧪 Testing Phi-3 Code Review Capabilities');
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found in environment variables');
    
    // Create a temporary file with the sample code
    const tempFilePath = path.join(__dirname, 'temp-express-api.js');
    await fs.writeFile(tempFilePath, SAMPLE_CODE);
    console.log(`📂 Created temporary file: ${tempFilePath}`);
    console.log('📄 Sample code content (Express.js API with security issues):');
    console.log('-----------------');
    console.log(SAMPLE_CODE);
    console.log('-----------------');
    
    const model = 'microsoft/phi-3-medium-128k-instruct:free';
    console.log(`Using model: ${model}`);
    
    // Make the API request
    console.log('🚀 Sending Express.js code to Phi-3 for security review...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/pr-checker-v2',
        'X-Title': 'PR Checker V2 - Phi-3 Code Review Test'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a senior security engineer reviewing code for critical security vulnerabilities. Focus on identifying SQL injection, authentication flaws, improper error handling, sensitive data exposure, and other OWASP Top 10 issues.'
          },
          {
            role: 'user',
            content: `Review this Express.js API code and identify all security vulnerabilities and best practice violations:\n\n${SAMPLE_CODE}\n\nProvide specific recommendations for fixing each issue you find.`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('\n📊 Phi-3 Response Details:');
    console.log(`Model used: ${data.model}`);
    if (data.usage) {
      console.log(`Prompt tokens: ${data.usage.prompt_tokens}`);
      console.log(`Completion tokens: ${data.usage.completion_tokens}`);
      console.log(`Total tokens: ${data.usage.total_tokens}`);
    }
    
    // Extract the security analysis
    const analysis = data.choices[0].message.content;
    
    console.log('\n🔒 Security Review Results from Phi-3:');
    console.log('-----------------');
    console.log(analysis);
    console.log('-----------------');
    
    // Save the analysis to a file
    const outputFilePath = path.join(__dirname, '../security-review-output.md');
    await fs.writeFile(outputFilePath, `# Security Review Results\n\n${analysis}`);
    console.log(`\n✅ Security analysis saved to: ${outputFilePath}`);
    
  } catch (error) {
    console.error('❌ Phi-3 Code Review Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up the temporary file
    const tempFilePath = path.join(__dirname, 'temp-express-api.js');
    if (await fs.pathExists(tempFilePath)) {
      await fs.remove(tempFilePath);
      console.log('🧹 Temporary file removed');
    }
  }
}

// Run the test
testPhiCodeReview();
