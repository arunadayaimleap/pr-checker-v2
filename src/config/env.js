const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'GITHUB_TOKEN'
];

// Verify required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Error: ${envVar} not found in environment variables`);
    console.error('Please set up your .env file with all required environment variables');
    process.exit(1);
  }
}

export default requiredEnvVars;