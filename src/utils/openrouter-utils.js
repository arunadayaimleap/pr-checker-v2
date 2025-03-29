import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs-extra';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Sample code to analyze
export const SAMPLE_CODE = `
// User profile handler
class UserProfile {
  constructor(database) {
    this.db = database;
    this.cache = new Map();
  }

  async getProfile(userId) {
    // Check cache first
    if (this.cache.has(userId)) {
      console.log('Cache hit for user', userId);
      return this.cache.get(userId);
    }
    
    // Get from database
    const user = await this.db.findUserById(userId);
    if (user) {
      // Store in cache for future requests
      this.cache.set(userId, user);
      return user;
    }
    
    return null;
  }

  async updateProfile(userId, data) {
    // Update in database first
    const success = await this.db.updateUser(userId, data);
    
    if (success) {
      // Update cache as well
      const updatedUser = await this.db.findUserById(userId);
      this.cache.set(userId, updatedUser);
      return true;
    }
    
    return false;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Related file: profileController.js
// Exports controller functions that use UserProfile

// Related file: database.js
// Provides the database interface used by UserProfile
`;

// Define file changes for the schema generation example
export const CHANGED_FILES = [
  {
    name: 'src/models/UserProfile.js',
    type: 'modified',
    description: 'Added caching to user profile operations'
  },
  {
    name: 'src/controllers/profileController.js',
    type: 'modified',
    description: 'Updated to use the new caching methods from UserProfile'
  },
  {
    name: 'src/utils/cache.js',
    type: 'new',
    description: 'Utility functions for cache management'
  },
  {
    name: 'src/database/userRepository.js',
    type: 'modified',
    description: 'Optimized database queries for user profiles'
  }
];

// The system prompts
export const SYSTEM_PROMPTS = {
  codeReview: 'You are a senior software developer who specializes in code review. Provide a detailed, well-formatted markdown response with headings, bullet points, and code examples where appropriate.',
  schemaDesign: 'You are a software architect who specializes in visualizing system components. Generate a clear, well-structured text-based schema in markdown format. Focus on creating simple, effective ASCII diagrams with arrows showing relationships between components.'
};

// The user prompts
export const USER_PROMPTS = {
  codeReview: `Review this JavaScript code and provide a detailed analysis in markdown format:

\`\`\`javascript
${SAMPLE_CODE}
\`\`\`

Please include:
1. A summary of what the code does
2. Strengths of the implementation
3. Potential issues or bugs
4. Suggestions for improvement
5. Best practices that are followed or violated

Your response must be well-formatted markdown with appropriate headings, bullet points, and code blocks.`,

  schemaDesign: `Based on these changed files in a pull request, create a text-based schema diagram in markdown that shows how these files are related to each other:

${CHANGED_FILES.map(file => `- **${file.name}** (${file.type}): ${file.description}`).join('\n')}

Your response should:
1. Use simple ASCII/markdown to create a visualization showing the files as boxes or nodes
2. Connect the boxes with arrows (-> or =>) to show dependencies 
3. Add brief labels to the arrows to explain the relationships
4. Provide a short explanation of the schema below the diagram

Example of the type of ASCII diagram I'm looking for:
\`\`\`
┌───────────────┐           ┌───────────────┐
│  ComponentA   │──────────>│  ComponentB   │
└───────────────┘   uses    └───────────────┘
        │                           │
        │ extends                   │ implements
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│  ComponentC   │<─────────┤  ComponentD   │
└───────────────┘  calls    └───────────────┘
\`\`\`

Keep it simple but make sure to show all important relationships between the files.`
};

// Utility function to introduce a delay
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to call the model with the given prompts
export async function callModelWithPrompt(model, systemPrompt, userPrompt) {
  console.log(`\n🚀 Testing model: ${model}`);
  
  try {
    // Add route: "fallback" option to use a different model if the requested one has payment issues
    const requestBody = {
      model: model,
      route: "fallback",  // Enable fallback to help with payment-related errors
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500  // Reduced from 2000 to avoid token limit errors
    };
    
    console.log(`📤 Sending request to OpenRouter API with model: ${model}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/pr-checker-v2',
        'X-Title': 'PR Checker V2 - Model Test'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Get the raw response text
    const responseText = await response.text();
    console.log(`📥 Raw API response for ${model}:`);
    console.log(responseText);
    
    // Check for rate limit errors
    if (response.status === 429) {
      console.log(`⚠️ Rate limit exceeded for model ${model}. Waiting before retry...`);
      
      // Try to parse response to get retry-after info
      try {
        const errorData = JSON.parse(responseText);
        const retryDelay = errorData.error?.metadata?.raw ? 
          JSON.parse(errorData.error.metadata.raw)?.error?.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay : null;
        
        if (retryDelay) {
          const delaySeconds = parseInt(retryDelay.replace('s', '')) || 60;
          console.log(`⏱️ API suggests waiting ${delaySeconds} seconds before retry`);
          
          // Return error with retry info
          return {
            success: false,
            error: `Rate limit exceeded. Retry after ${delaySeconds} seconds.`,
            retryAfter: delaySeconds
          };
        }
      } catch (e) {
        console.error("Error parsing rate limit response:", e.message);
      }
      
      return {
        success: false,
        error: `Rate limit exceeded for ${model}. Try again later.`
      };
    }
    
    // Handle other errors
    if (!response.ok) {
      console.error(`❌ API error with model ${model}: ${response.status} ${response.statusText}`);
      
      // Check if it's a payment required error and suggest using :free suffix
      if (response.status === 402 && !model.includes(':free')) {
        console.error(`💰 This appears to be a paid model. Try adding ':free' to the model name or choose a different model.`);
        return {
          success: false,
          error: `Payment required for ${model}. Try adding ':free' to the model name or choose a different model.`
        };
      }
      
      return {
        success: false,
        error: `${response.status} ${response.statusText}: ${responseText}`
      };
    }
    
    // Parse the response text
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`Failed to parse JSON response: ${e.message}`);
      return {
        success: false,
        error: `Failed to parse response: ${e.message}`
      };
    }
    
    // Validate the response has choices
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`❌ Invalid response format from ${model}: Missing choices array or message`);
      return {
        success: false,
        error: `Invalid response format: Missing choices or message. Raw response: ${responseText}`
      };
    }
    
    // Check which model actually responded
    const actualModel = data.model || model;
    console.log(`✅ Successfully received response from model: ${actualModel}`);
    
    if (data.usage) {
      console.log(`Tokens: ${data.usage.total_tokens} (${data.usage.prompt_tokens} prompt, ${data.usage.completion_tokens} completion)`);
    }
    
    return {
      success: true,
      content: data.choices[0].message.content,
      model: actualModel,
      usage: data.usage,
      rawResponse: data
    };
  } catch (error) {
    console.error(`❌ Error calling ${model}:`, error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to save results to a file
export async function saveResults(model, task, result, outputDir) {
  const shortModelName = model.split('/').pop().replace(/:.*$/, '');
  const fileName = `${shortModelName}-${task}.md`;
  const filePath = path.join(outputDir, fileName);
  
  let content;
  if (result.success) {
    content = result.content;
    console.log(`✅ Saved ${task} from ${shortModelName} to ${filePath}`);
  } else {
    content = `# Error with ${shortModelName}\n\n${result.error}`;
    console.log(`❌ Failed to get ${task} from ${shortModelName}`);
  }
  
  await fs.ensureDir(outputDir);
  await fs.writeFile(filePath, content);
  
  return {
    fileName,
    success: result.success,
    model: result.model,
    usage: result.usage
  };
}

// Create output directory with timestamp
export async function createOutputDir() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(path.resolve(__dirname, '../../'), `results/${timestamp}`);
  await fs.ensureDir(outputDir);
  console.log(`📁 Created output directory: ${outputDir}`);
  return outputDir;
}
