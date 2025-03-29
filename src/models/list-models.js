import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs-extra';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listAvailableModels() {
  try {
    console.log('🔍 Fetching available models from OpenRouter API');
    console.log('-----------------------------------');
    
    // Verify environment variable
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔑 API Key found');
    
    // Create timestamp for output file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(path.resolve(__dirname, '../../'), `results/${timestamp}`);
    await fs.ensureDir(outputDir);
    console.log(`📁 Created output directory: ${outputDir}`);
    
    // Fetch models from OpenRouter API
    console.log('📤 Sending request to OpenRouter API to list available models...');
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/pr-checker-v2',
        'X-Title': 'PR Checker V2 - Model List Test'
      }
    });
    
    // Get the raw response text
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${responseText}`);
      process.exit(1);
    }
    
    // Parse the response text
    const data = JSON.parse(responseText);
    console.log('✅ Successfully retrieved models list');
    
    // Process models data
    const models = data.data || [];
    
    // Fixed: Check if a model is free by safely checking if ID contains ":free" 
    const freeModels = models.filter(model => {
      const modelId = model.id || '';
      const contextLength = String(model.context_length || '');
      return modelId.includes(':free') || contextLength.includes('free');
    });
    
    console.log(`📊 Found ${models.length} total models, ${freeModels.length} are free models`);
    
    // Create a formatted markdown table for all models
    let markdownContent = `# OpenRouter Available Models\n\n`;
    markdownContent += `Retrieved at: ${new Date().toLocaleString()}\n\n`;
    
    // Free models section
    markdownContent += `## Free Models\n\n`;
    markdownContent += `| Model ID | Context Length | Created By | Description |\n`;
    markdownContent += `|----------|---------------|------------|-------------|\n`;
    
    for (const model of freeModels) {
      markdownContent += `| \`${model.id || ''}\` | ${model.context_length || 'N/A'} | ${model.created_by || 'N/A'} | ${model.description || 'No description'} |\n`;
    }
    
    // All models section
    markdownContent += `\n## All Models\n\n`;
    markdownContent += `| Model ID | Context Length | Created By | Free? | Description |\n`;
    markdownContent += `|----------|---------------|------------|-------|-------------|\n`;
    
    for (const model of models) {
      // Fixed: Use safer string checks for free models
      const modelId = model.id || '';
      const contextLength = String(model.context_length || '');
      const isFree = modelId.includes(':free') || contextLength.includes('free');
      
      markdownContent += `| \`${model.id || ''}\` | ${model.context_length || 'N/A'} | ${model.created_by || 'N/A'} | ${isFree ? '✅' : '❌'} | ${model.description || 'No description'} |\n`;
    }
    
    // Save to file
    const filePath = path.join(outputDir, 'available-models.md');
    await fs.writeFile(filePath, markdownContent);
    console.log(`📝 Saved models list to ${filePath}`);
    
    // Also save the raw JSON response
    const jsonFilePath = path.join(outputDir, 'models-raw-response.json');
    await fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2));
    console.log(`📝 Saved raw response to ${jsonFilePath}`);
    
    // Print summary of free models to console
    console.log('\n🔍 Available Free Models:');
    console.log('-----------------------------------');
    
    for (const model of freeModels) {
      console.log(`- ${model.id}`);
    }
    
    console.log('\n✨ OpenRouter models list retrieved successfully!');
    
  } catch (error) {
    console.error('❌ Error fetching models:');
    console.error(error);
    process.exit(1);
  }
}

listAvailableModels();
