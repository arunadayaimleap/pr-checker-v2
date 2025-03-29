// This new file will properly set up the PR analysis

// Import required modules
import { getPRDetails } from './utils/github-utils.js';
import processPR from './pr-checker.js';
import path from 'path';

// Main function to run the PR checker
async function main() {
  try {
    console.log('🚀 Starting PR Checker...');
    
    // Get required environment variables
    const prNumber = process.env.PR_NUMBER;
    const repoName = process.env.REPO_NAME;
    const githubToken = process.env.GITHUB_TOKEN;
    
    console.log(`PR_NUMBER: ${prNumber}`);
    console.log(`REPO_NAME: ${repoName}`);
    console.log(`GITHUB_TOKEN exists: ${Boolean(githubToken)}`);
    
    if (!prNumber || !repoName || !githubToken) {
      console.error('❌ Missing required environment variables:');
      console.error(`PR_NUMBER: ${Boolean(prNumber)}`);
      console.error(`REPO_NAME: ${Boolean(repoName)}`);
      console.error(`GITHUB_TOKEN: ${Boolean(githubToken)}`);
      process.exit(1);
    }
    
    // Get workspace path (passed as parameter from workflow)
    const workspacePath = process.argv[2];
    console.log(`Using workspace path: ${workspacePath || 'not provided'}`);
    console.log(`All command-line arguments: ${JSON.stringify(process.argv)}`);
    
    // Get PR details including diff files
    console.log(`Fetching PR #${prNumber} details for repo ${repoName}...`);
    const prDetails = await getPRDetails(prNumber, repoName, workspacePath);
    
    console.log(`✅ Found ${prDetails.changedFiles.length} changed files in PR #${prNumber}`);
    console.log(`Changed files: ${prDetails.changedFiles.map(f => f.path).join(', ')}`);
    
    // If there are no changed files, exit
    if (prDetails.changedFiles.length === 0) {
      console.error('❌ No changed files found in the PR');
      process.exit(1);
    }
    
    // Format PR content for processing
    const formattedPRContent = `
# PR #${prNumber}: ${prDetails.title}

${prDetails.description}

## Changed Files:
${prDetails.changedFiles.map(file => `- ${file.path} (${file.status})`).join('\n')}

## File Changes:
${prDetails.changedFiles.map(file => `
### ${file.path} (${file.status})
\`\`\`${file.extension || 'diff'}
${file.diff || file.content || 'No content available'}
\`\`\`
`).join('\n')}
`;
    
    console.log('📝 Formatted PR content for analysis');
    console.log('Content begins with:');
    console.log(formattedPRContent.substring(0, 500) + '...');
    
    // Process the PR
    await processPR(formattedPRContent, prNumber);
    
  } catch (error) {
    console.error('❌ Error running PR Checker:');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();
