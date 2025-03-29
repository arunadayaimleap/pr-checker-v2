export const AVAILABLE_MODELS = {
  // OpenAI models
  GPT_3_5: 'openai/gpt-3.5-turbo',
  GPT_4: 'openai/gpt-4',
  
  // Anthropic models
  CLAUDE_V1: 'anthropic/claude-v1',
  CLAUDE_V2: 'anthropic/claude-v2',
  
  // DeepSeek model 
  DEEPSEEK: 'deepseek/deepseek-chat-v3-0324:free',
  
  // Microsoft model
  PHI_3: 'microsoft/phi-3-medium-128k-instruct:free',
  
  // Meta Llama model
  LLAMA_3: 'meta-llama/llama-3-8b-instruct:free',
  
  // Google models
  GEMINI_2_0_PRO: 'google/gemini-2.0-pro-exp-02-05:free',
  GEMINI_2_5_PRO: 'google/gemini-2.5-pro-exp-03-25:free',
  
  // Mistral model
  MISTRAL_SMALL: 'mistralai/mistral-small-3.1-24b-instruct:free',
  
  // Qwen model (used as fallback in test-gemini.js)
  QWEN: 'qwen/qwen-2.5-72b-instruct:free'
};

// Define fallback order for models
export const MODEL_FALLBACKS = {
  PRIMARY: AVAILABLE_MODELS.DEEPSEEK,
  FALLBACKS: [
    AVAILABLE_MODELS.PHI_3,
    AVAILABLE_MODELS.GEMINI_2_5_PRO,
    AVAILABLE_MODELS.LLAMA_3,
    AVAILABLE_MODELS.MISTRAL_SMALL,
    AVAILABLE_MODELS.GPT_3_5,
    AVAILABLE_MODELS.QWEN,
  ]
};

// Model groups for specific tasks
export const MODEL_GROUPS = {
  CODE_REVIEW: [
    AVAILABLE_MODELS.DEEPSEEK,
    AVAILABLE_MODELS.PHI_3,
    AVAILABLE_MODELS.GEMINI_2_5_PRO
  ],
  SCHEMA_DESIGN: [
    AVAILABLE_MODELS.DEEPSEEK,
    AVAILABLE_MODELS.PHI_3,
    AVAILABLE_MODELS.GEMINI_2_5_PRO
  ],
  FALLBACK_GROUP: [
    AVAILABLE_MODELS.LLAMA_3,
    AVAILABLE_MODELS.MISTRAL_SMALL,
    AVAILABLE_MODELS.QWEN
  ]
};