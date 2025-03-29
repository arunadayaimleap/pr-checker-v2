export const AVAILABLE_MODELS = {
  // Primary model
  DEEPSEEK: 'deepseek/deepseek-chat-v3-0324:free',
  
  // Fallback models
  LLAMA_3: 'meta-llama/llama-3-8b-instruct:free',
  MISTRAL_SMALL: 'mistralai/mistral-small-3.1-24b-instruct:free',
};

// Define fallback order for models
export const MODEL_FALLBACKS = {
  PRIMARY: AVAILABLE_MODELS.DEEPSEEK,
  FALLBACKS: [
    AVAILABLE_MODELS.LLAMA_3,
    AVAILABLE_MODELS.MISTRAL_SMALL,
  ]
};

// Model groups for specific tasks
export const MODEL_GROUPS = {
  CODE_REVIEW: [
    AVAILABLE_MODELS.DEEPSEEK,
    AVAILABLE_MODELS.LLAMA_3,
    AVAILABLE_MODELS.MISTRAL_SMALL
  ],
  SCHEMA_DESIGN: [
    AVAILABLE_MODELS.DEEPSEEK,
    AVAILABLE_MODELS.LLAMA_3,
    AVAILABLE_MODELS.MISTRAL_SMALL
  ]
};