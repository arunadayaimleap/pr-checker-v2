import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs-extra';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Sample code to analyze
const SAMPLE_CODE = `
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
const CHANGED_FILES = [
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

// Models to test - using more reliable models with proper fallback strategy
const MODELS = [
  'openai/gpt-3.5-turbo', // More widely available
  'anthropic/claude-3-haiku-20240307',
  'meta-llama/llama-3-8b-instruct', // Smaller model that's more likely to be available
  'microsoft/phi-3-mini-128k-instruct' // Smaller Phi model
];

async function callModelWithPrompt(model, systemPrompt, userPrompt) {
  console.log(`\n🚀 Testing model: ${model}`);
  
  try {
    // Create a proper request with fallback options
    const requestBody = {
      model: model,
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
      max_tokens: 2000
    };
    
    console.log(`📤 Sending request to OpenRouter API with model: ${model}`);
    console.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/pr-checker-v2',
        'X-Title': 'PR Checker V2 - Model Comparison Test'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Log the raw response for debugging
    const responseText = await response.text();
    console.log(`📥 Raw API response for ${model}:`);
    console.log(responseText);
    
    if (!response.ok) {
      console.error(`❌ API error with model ${model}: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: `${response.status} ${response.statusText}: ${responseText}`
      };
    }
    
    // Parse the response text (we already consumed it above)
    const data = JSON.parse(responseText);
    
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
      usage: data.usage
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

async function main() {
  try {
    console.log('🔍 Testing OpenRouter API with multiple models');
    console.log('-----------------------------------');

    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Create timestamp folder for results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, `/test-results/${timestamp}`);
    await fs.ensureDir(outputDir);
    console.log(`📁 Created output directory: ${outputDir}`);
    
    // First prompt for code analysis (with explicit request for markdown)
    const systemPrompt1 = 'You are a senior software developer who specializes in code review. Provide a detailed, well-formatted markdown response with headings, bullet points, and code examples where appropriate.';
    
    const userPrompt1 = `Review this JavaScript code and provide a detailed analysis in markdown format:

\`\`\`javascript
${SAMPLE_CODE}
\`\`\`

Please include:
1. A summary of what the code does
2. Strengths of the implementation
3. Potential issues or bugs
4. Suggestions for improvement
5. Best practices that are followed or violated

Your response must be well-formatted markdown with appropriate headings, bullet points, and code blocks.`;

    // Second prompt for schema generation
    const systemPrompt2 = 'You are a software architect who specializes in visualizing system components. Generate a clear, well-structured text-based schema in markdown format.';
    
    const userPrompt2 = `Based on these changed files in a pull request, create a text-based schema diagram in markdown that shows how these files are related to each other:

${CHANGED_FILES.map(file => `- **${file.name}** (${file.type}): ${file.description}`).join('\n')}

Your response should:
1. Use markdown formatting to create a text-based visualization of the relationships
2. Show dependencies between files
3. Indicate the direction of dependencies with arrows or similar notation
4. Provide a brief explanation of the schema

Be creative with ASCII/markdown to represent the relationships visually.`;

    // Create summary file
    const summaryFilePath = path.join(outputDir, 'summary.md');
    let summaryContent = `# OpenRouter Model Comparison Results\n\nTest run at: ${new Date().toLocaleString()}\n\n## Models Tested\n\n`;
    summaryContent += `- openai/gpt-3.5-turbo\n- anthropic/claude-3-haiku-20240307\n- meta-llama/llama-3-8b-instruct\n- microsoft/phi-3-mini-128k-instruct\n`;
    summaryContent += '\n\n## Results\n\n';
    
    // ------------------------------
    // FIRST MODEL: GPT-3.5 Turbo
    // ------------------------------
    console.log("\n\n===============================================");
    console.log("🤖 TESTING MODEL 1: openai/gpt-3.5-turbo");
    console.log("===============================================\n");
    
    // First prompt - code analysis
    console.log("Running code analysis with GPT-3.5...");
    const gptAnalysisResult = await callModelWithPrompt('openai/gpt-3.5-turbo', systemPrompt1, userPrompt1);
    const gptAnalysisFilePath = path.join(outputDir, `gpt-3.5-turbo-code-analysis.md`);
    
    if (gptAnalysisResult.success) {
      await fs.writeFile(gptAnalysisFilePath, gptAnalysisResult.content);
      console.log(`✅ Saved code analysis from GPT-3.5 to ${gptAnalysisFilePath}`);
      summaryContent += `### GPT-3.5 Turbo - Code Analysis\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${gptAnalysisResult.model}\n`;
      
      if (gptAnalysisResult.usage) {
        summaryContent += `- Tokens: ${gptAnalysisResult.usage.total_tokens} (${gptAnalysisResult.usage.prompt_tokens} prompt, ${gptAnalysisResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](gpt-3.5-turbo-code-analysis.md)\n\n`;
    } else {
      console.log(`❌ Failed to get code analysis from GPT-3.5`);
      await fs.writeFile(gptAnalysisFilePath, `# Error with GPT-3.5 Turbo\n\n${gptAnalysisResult.error}`);
      summaryContent += `### GPT-3.5 Turbo - Code Analysis\n\n❌ Failed\n\n- Error: ${gptAnalysisResult.error}\n\n`;
    }
    
    // Wait before the next call
    console.log("Waiting 5 seconds before next API call...");
    await sleep(5000);
    
    // Second prompt - schema generation
    console.log("Running schema generation with GPT-3.5...");
    const gptSchemaResult = await callModelWithPrompt('openai/gpt-3.5-turbo', systemPrompt2, userPrompt2);
    const gptSchemaFilePath = path.join(outputDir, `gpt-3.5-turbo-schema.md`);
    
    if (gptSchemaResult.success) {
      await fs.writeFile(gptSchemaFilePath, gptSchemaResult.content);
      console.log(`✅ Saved schema from GPT-3.5 to ${gptSchemaFilePath}`);
      summaryContent += `### GPT-3.5 Turbo - Schema\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${gptSchemaResult.model}\n`;
      
      if (gptSchemaResult.usage) {
        summaryContent += `- Tokens: ${gptSchemaResult.usage.total_tokens} (${gptSchemaResult.usage.prompt_tokens} prompt, ${gptSchemaResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](gpt-3.5-turbo-schema.md)\n\n`;
    } else {
      console.log(`❌ Failed to get schema from GPT-3.5`);
      await fs.writeFile(gptSchemaFilePath, `# Error with GPT-3.5 Turbo\n\n${gptSchemaResult.error}`);
      summaryContent += `### GPT-3.5 Turbo - Schema\n\n❌ Failed\n\n- Error: ${gptSchemaResult.error}\n\n`;
    }
    
    // Wait longer before moving to next model
    console.log("Waiting 10 seconds before next model...");
    await sleep(10000);
    
    // ------------------------------
    // SECOND MODEL: Claude 3 Haiku
    // ------------------------------
    console.log("\n\n===============================================");
    console.log("🤖 TESTING MODEL 2: anthropic/claude-3-haiku-20240307");
    console.log("===============================================\n");
    
    // First prompt - code analysis
    console.log("Running code analysis with Claude...");
    const claudeAnalysisResult = await callModelWithPrompt('anthropic/claude-3-haiku-20240307', systemPrompt1, userPrompt1);
    const claudeAnalysisFilePath = path.join(outputDir, `claude-3-haiku-code-analysis.md`);
    
    if (claudeAnalysisResult.success) {
      await fs.writeFile(claudeAnalysisFilePath, claudeAnalysisResult.content);
      console.log(`✅ Saved code analysis from Claude to ${claudeAnalysisFilePath}`);
      summaryContent += `### Claude 3 Haiku - Code Analysis\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${claudeAnalysisResult.model}\n`;
      
      if (claudeAnalysisResult.usage) {
        summaryContent += `- Tokens: ${claudeAnalysisResult.usage.total_tokens} (${claudeAnalysisResult.usage.prompt_tokens} prompt, ${claudeAnalysisResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](claude-3-haiku-code-analysis.md)\n\n`;
    } else {
      console.log(`❌ Failed to get code analysis from Claude`);
      await fs.writeFile(claudeAnalysisFilePath, `# Error with Claude 3 Haiku\n\n${claudeAnalysisResult.error}`);
      summaryContent += `### Claude 3 Haiku - Code Analysis\n\n❌ Failed\n\n- Error: ${claudeAnalysisResult.error}\n\n`;
    }
    
    // Wait before the next call
    console.log("Waiting 5 seconds before next API call...");
    await sleep(5000);
    
    // Second prompt - schema generation
    console.log("Running schema generation with Claude...");
    const claudeSchemaResult = await callModelWithPrompt('anthropic/claude-3-haiku-20240307', systemPrompt2, userPrompt2);
    const claudeSchemaFilePath = path.join(outputDir, `claude-3-haiku-schema.md`);
    
    if (claudeSchemaResult.success) {
      await fs.writeFile(claudeSchemaFilePath, claudeSchemaResult.content);
      console.log(`✅ Saved schema from Claude to ${claudeSchemaFilePath}`);
      summaryContent += `### Claude 3 Haiku - Schema\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${claudeSchemaResult.model}\n`;
      
      if (claudeSchemaResult.usage) {
        summaryContent += `- Tokens: ${claudeSchemaResult.usage.total_tokens} (${claudeSchemaResult.usage.prompt_tokens} prompt, ${claudeSchemaResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](claude-3-haiku-schema.md)\n\n`;
    } else {
      console.log(`❌ Failed to get schema from Claude`);
      await fs.writeFile(claudeSchemaFilePath, `# Error with Claude 3 Haiku\n\n${claudeSchemaResult.error}`);
      summaryContent += `### Claude 3 Haiku - Schema\n\n❌ Failed\n\n- Error: ${claudeSchemaResult.error}\n\n`;
    }
    
    // Wait longer before moving to next model
    console.log("Waiting 10 seconds before next model...");
    await sleep(10000);
    
    // ------------------------------
    // THIRD MODEL: LLama 3
    // ------------------------------
    console.log("\n\n===============================================");
    console.log("🤖 TESTING MODEL 3: meta-llama/llama-3-8b-instruct");
    console.log("===============================================\n");
    
    // First prompt - code analysis
    console.log("Running code analysis with Llama 3...");
    const llamaAnalysisResult = await callModelWithPrompt('meta-llama/llama-3-8b-instruct', systemPrompt1, userPrompt1);
    const llamaAnalysisFilePath = path.join(outputDir, `llama-3-8b-instruct-code-analysis.md`);
    
    if (llamaAnalysisResult.success) {
      await fs.writeFile(llamaAnalysisFilePath, llamaAnalysisResult.content);
      console.log(`✅ Saved code analysis from Llama 3 to ${llamaAnalysisFilePath}`);
      summaryContent += `### Llama 3 - Code Analysis\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${llamaAnalysisResult.model}\n`;
      
      if (llamaAnalysisResult.usage) {
        summaryContent += `- Tokens: ${llamaAnalysisResult.usage.total_tokens} (${llamaAnalysisResult.usage.prompt_tokens} prompt, ${llamaAnalysisResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](llama-3-8b-instruct-code-analysis.md)\n\n`;
    } else {
      console.log(`❌ Failed to get code analysis from Llama 3`);
      await fs.writeFile(llamaAnalysisFilePath, `# Error with Llama 3\n\n${llamaAnalysisResult.error}`);
      summaryContent += `### Llama 3 - Code Analysis\n\n❌ Failed\n\n- Error: ${llamaAnalysisResult.error}\n\n`;
    }
    
    // Wait before the next call
    console.log("Waiting 5 seconds before next API call...");
    await sleep(5000);
    
    // Second prompt - schema generation
    console.log("Running schema generation with Llama 3...");
    const llamaSchemaResult = await callModelWithPrompt('meta-llama/llama-3-8b-instruct', systemPrompt2, userPrompt2);
    const llamaSchemaFilePath = path.join(outputDir, `llama-3-8b-instruct-schema.md`);
    
    if (llamaSchemaResult.success) {
      await fs.writeFile(llamaSchemaFilePath, llamaSchemaResult.content);
      console.log(`✅ Saved schema from Llama 3 to ${llamaSchemaFilePath}`);
      summaryContent += `### Llama 3 - Schema\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${llamaSchemaResult.model}\n`;
      
      if (llamaSchemaResult.usage) {
        summaryContent += `- Tokens: ${llamaSchemaResult.usage.total_tokens} (${llamaSchemaResult.usage.prompt_tokens} prompt, ${llamaSchemaResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](llama-3-8b-instruct-schema.md)\n\n`;
    } else {
      console.log(`❌ Failed to get schema from Llama 3`);
      await fs.writeFile(llamaSchemaFilePath, `# Error with Llama 3\n\n${llamaSchemaResult.error}`);
      summaryContent += `### Llama 3 - Schema\n\n❌ Failed\n\n- Error: ${llamaSchemaResult.error}\n\n`;
    }
    
    // Wait longer before moving to next model
    console.log("Waiting 10 seconds before next model...");
    await sleep(10000);
    
    // ------------------------------
    // FOURTH MODEL: Phi-3 Mini
    // ------------------------------
    console.log("\n\n===============================================");
    console.log("🤖 TESTING MODEL 4: microsoft/phi-3-mini-128k-instruct");
    console.log("===============================================\n");
    
    // First prompt - code analysis
    console.log("Running code analysis with Phi-3...");
    const phiAnalysisResult = await callModelWithPrompt('microsoft/phi-3-mini-128k-instruct', systemPrompt1, userPrompt1);
    const phiAnalysisFilePath = path.join(outputDir, `phi-3-mini-128k-instruct-code-analysis.md`);
    
    if (phiAnalysisResult.success) {
      await fs.writeFile(phiAnalysisFilePath, phiAnalysisResult.content);
      console.log(`✅ Saved code analysis from Phi-3 to ${phiAnalysisFilePath}`);
      summaryContent += `### Phi-3 Mini - Code Analysis\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${phiAnalysisResult.model}\n`;
      
      if (phiAnalysisResult.usage) {
        summaryContent += `- Tokens: ${phiAnalysisResult.usage.total_tokens} (${phiAnalysisResult.usage.prompt_tokens} prompt, ${phiAnalysisResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](phi-3-mini-128k-instruct-code-analysis.md)\n\n`;
    } else {
      console.log(`❌ Failed to get code analysis from Phi-3`);
      await fs.writeFile(phiAnalysisFilePath, `# Error with Phi-3 Mini\n\n${phiAnalysisResult.error}`);
      summaryContent += `### Phi-3 Mini - Code Analysis\n\n❌ Failed\n\n- Error: ${phiAnalysisResult.error}\n\n`;
    }
    
    // Wait before the next call
    console.log("Waiting 5 seconds before next API call...");
    await sleep(5000);
    
    // Second prompt - schema generation
    console.log("Running schema generation with Phi-3...");
    const phiSchemaResult = await callModelWithPrompt('microsoft/phi-3-mini-128k-instruct', systemPrompt2, userPrompt2);
    const phiSchemaFilePath = path.join(outputDir, `phi-3-mini-128k-instruct-schema.md`);
    
    if (phiSchemaResult.success) {
      await fs.writeFile(phiSchemaFilePath, phiSchemaResult.content);
      console.log(`✅ Saved schema from Phi-3 to ${phiSchemaFilePath}`);
      summaryContent += `### Phi-3 Mini - Schema\n\n✅ Success\n\n`;
      summaryContent += `- Actual model used: ${phiSchemaResult.model}\n`;
      
      if (phiSchemaResult.usage) {
        summaryContent += `- Tokens: ${phiSchemaResult.usage.total_tokens} (${phiSchemaResult.usage.prompt_tokens} prompt, ${phiSchemaResult.usage.completion_tokens} completion)\n`;
      }
      summaryContent += `- [View full response](phi-3-mini-128k-instruct-schema.md)\n\n`;
    } else {
      console.log(`❌ Failed to get schema from Phi-3`);
      await fs.writeFile(phiSchemaFilePath, `# Error with Phi-3 Mini\n\n${phiSchemaResult.error}`);
      summaryContent += `### Phi-3 Mini - Schema\n\n❌ Failed\n\n- Error: ${phiSchemaResult.error}\n\n`;
    }
    
    // Save summary file
    await fs.writeFile(summaryFilePath, summaryContent);
    console.log(`📝 Saved summary to ${summaryFilePath}`);
    
    console.log('\n✨ OpenRouter API multiple model test completed!');
    console.log(`📂 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ OpenRouter API test failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
