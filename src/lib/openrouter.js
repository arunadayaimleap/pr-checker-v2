import fetch from 'node-fetch';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// List of models to try in order of preference
const MODEL_FALLBACKS = [
  'microsoft/phi-3-medium-128k-instruct:free',  // Primary model
  'google/gemini-2.5-pro-exp-03-25:free',
  'openai/gpt-3.5-turbo:free',
  'anthropic/claude-3-haiku:free', 
  'meta-llama/llama-3-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
];

export async function analyzeWithOpenRouter(content, options = {}) {
  const { model = MODEL_FALLBACKS[0] } = options;
  
  // If a specific model was requested, try just that one
  const modelsToTry = options.model ? [model] : MODEL_FALLBACKS;
  
  let lastError = null;
  
  // Try each model in sequence until one works
  for (const currentModel of modelsToTry) {
    try {
      console.log(`Trying model: ${currentModel}`);
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/pr-checker-v2',
          'X-Title': 'PR Checker V2'
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            {
              role: 'system',
              content: 'You are an expert code reviewer analyzing Pull Request changes. Provide concise, professional feedback on the changes. Focus on potential issues, best practices, and improvements.'
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        // If this is a rate limit error, try the next model
        if (response.status === 429) {
          console.log(`Model ${currentModel} rate limited, trying next model...`);
          lastError = new Error(`Rate limit exceeded for ${currentModel}`);
          continue;
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log(`Success with model: ${currentModel}`);
      
      // Handle different response formats
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else if (data.message) {
        return data.message;
      } else if (data.content) {
        return data.content;
      } else if (data.choices && data.choices[0] && data.choices[0].content) {
        return data.choices[0].content;
      } else {
        console.log('Response structure:', JSON.stringify(data, null, 2));
        return 'Could not extract content from API response. See logs for details.';
      }
    } catch (error) {
      console.error(`Error with model ${currentModel}:`, error.message);
      lastError = error;
      // Continue to the next model
    }
  }
  
  // If we've tried all models and none worked, throw the last error
  console.error('All models failed, last error:', lastError);
  throw lastError || new Error('All available models failed without specific error');
}

export async function analyzeChangedFiles(changedFiles) {
  // Format the changed files for analysis
  const content = `Please analyze the following changed files in a pull request:
  
${changedFiles.map(file => `
File: ${file.filename}
Changes:
\`\`\`${file.language || ''}
${file.content}
\`\`\`
`).join('\n')}

Provide a concise analysis focusing on:
1. Overall assessment of changes
2. Potential bugs or issues
3. Code quality observations
4. Best practices recommendations
5. Performance considerations`;

  return analyzeWithOpenRouter(content);
}
