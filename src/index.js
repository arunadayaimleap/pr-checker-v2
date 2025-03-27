require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

console.log('🧠 Starting Visual PR Checker v2.1');
console.log('-----------------------------------');

// Verify environment variables
console.log('🔍 Checking environment configuration...');
const requiredEnvVars = ['CHATGPT_API_KEY', 'GITHUB_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}
console.log('✅ Environment configuration verified');

// Get target project path (optional argument)
const targetProjectPath = process.argv[2] || path.resolve(process.cwd(), '..');
console.log(`📂 Target project path: ${targetProjectPath}`);

// Check if the target path exists
if (!fs.existsSync(targetProjectPath)) {
  console.error(`❌ Target project path does not exist: ${targetProjectPath}`);
  process.exit(1);
}

// Check if the target path is a directory
const targetStats = fs.statSync(targetProjectPath);
if (!targetStats.isDirectory()) {
  console.error(`❌ Target path is not a directory: ${targetProjectPath}`);
  process.exit(1);
}

// List files in the target directory (for demonstration purposes)
console.log('📄 Files in target directory:');
try {
  const files = fs.readdirSync(targetProjectPath);
  files.forEach(file => {
    const filePath = path.join(targetProjectPath, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
  });
} catch (error) {
  console.error(`❌ Error reading target directory: ${error.message}`);
}

// Main workflow
async function runPRChecker() {
  try {
    console.log('🔍 Analyzing code changes...');
    // Import and execute necessary modules
    
    // Import all required modules
    const diffFiles = require('./utils/diffFiles');
    const generateSummary = require('./ai/generateSummary');
    const generateSchema = require('./ai/generateSchema');
    const generateFlowchart = require('./ai/generateFlowchart');
    const suggestSubsystem = require('./ai/suggestSubsystem');
    const detectSmells = require('./ai/detectSmells');
    const dependencyScan = require('./review/dependencyScan');
    const securityCheck = require('./review/securityCheck');
    const renderMermaid = require('./visual/renderMermaid');
    const renderDiagrams = require('./visual/renderDrawio'); // We're keeping the filename for compatibility
    const postPRComment = require('./review/postPRComment');
    
    console.log('🔍 Analyzing file changes...');
    const changedFiles = await diffFiles.getChangedFiles(targetProjectPath);
    console.log(`Found ${changedFiles.length} changed files`);
    
    console.log('🧠 Generating AI summary...');
    const summary = await generateSummary.createSummary(changedFiles);
    
    console.log('🧩 Generating schema diagrams...');
    const schema = await generateSchema.createSchema(changedFiles);
    
    console.log('🔄 Extracting flowcharts...');
    const flowcharts = await generateFlowchart.createFlowcharts(changedFiles);
    
    console.log('🧠 Suggesting subsystems...');
    const subsystems = await suggestSubsystem.identifySubsystems(changedFiles);
    
    console.log('👃 Detecting code smells...');
    const smells = await detectSmells.findSmells(changedFiles);
    
    console.log('🔍 Scanning dependencies...');
    const dependencyIssues = await dependencyScan.scanDependencies(targetProjectPath);
    
    console.log('🔒 Performing security checks...');
    const securityIssues = await securityCheck.checkSecurity(changedFiles);
    
    console.log('🎨 Rendering diagrams...');
    const mermaidDiagrams = await renderMermaid.renderDiagrams({
      directory: targetProjectPath,
      changedFiles,
      subsystems
    });
    
    const schemaDiagrams = await renderDiagrams.renderDiagrams({
      schema,
      flowcharts
    });
    
    console.log('📝 Preparing PR comment...');
    const comment = await postPRComment.formatComment({
      summary,
      schema,
      flowcharts,
      subsystems,
      smells,
      dependencyIssues,
      securityIssues,
      mermaidDiagrams,
      schemaDiagrams,
      targetPath: targetProjectPath,
      changedFiles
    });
    
    // If in GitHub Actions environment, post the comment
    if (process.env.GITHUB_EVENT_PATH) {
      console.log('🚀 Posting comment to PR...');
      await postPRComment.postComment(comment);
    } else {
      console.log('💻 Running in local mode, displaying comment:');
      console.log(comment);
    }
    
    console.log('✅ PR Checker completed successfully!');
  } catch (error) {
    console.error('❌ Error running PR Checker:', error);
    process.exit(1);
  }
}

runPRChecker();
