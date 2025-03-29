const axios = require('axios');

/**
 * Makes a call to the OpenAI API
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} options - Additional options for the API call
 * @returns {Promise<string>} The AI response
 */
async function callOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key is not set');
  }
  
  // Default options
  const defaultOptions = {
    model: 'gpt-4',
    temperature: 0.2,
    max_tokens: 2000,
    system_message: 'You are a programming assistant analyzing code changes in a pull request. Be concise and technical.'
  };
  
  // Merge with provided options
  const settings = { ...defaultOptions, ...options };
  
  try {
    // Determine if we're using OpenRouter or OpenAI directly
    const isOpenRouter = apiKey.startsWith('sk-or-');
    
    const endpoint = isOpenRouter ? 
      'https://openrouter.ai/api/v1/chat/completions' : 
      'https://api.openai.com/v1/chat/completions';
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // Add OpenRouter specific headers if needed
    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'https://github.com/pr-checker';
      headers['X-Title'] = 'PR Checker';
    }
    
    // Prepare the messages for the chat API
    const messages = [
      {
        role: 'system',
        content: settings.system_message
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    const response = await axios.post(
      endpoint,
      {
        model: settings.model,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens
      },
      { headers }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API call failed:', error.response ? error.response.data : error.message);
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

module.exports = {
  callOpenAI
};
