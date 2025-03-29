// Legacy entry point for backward compatibility
import processPR from './pr-checker.js';

// Demo PR data for testing
const demoData = {
  title: 'Sample PR for testing',
  description: 'This is a sample PR to test the PR checker functionality',
  changedFiles: [
    {
      path: 'src/models/UserProfile.js',
      status: 'modified',
      additions: 20,
      deletions: 5,
      changes: 25, 
      diff: `@@ -10,7 +10,7 @@ class UserProfile {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('UserProfile');
-   // No caching yet
+   this.cache = new Map(); // Add in-memory cache
  }

  // Get user profile by ID`
    }
  ]
};

// Format sample PR content
const formattedPRContent = `
# PR #123: ${demoData.title}

${demoData.description}

## Changed Files:
${demoData.changedFiles.map(file => `- ${file.path} (${file.status})`).join('\n')}

## File Changes:
${demoData.changedFiles.map(file => `
### ${file.path} (${file.status})
\`\`\`diff
${file.diff || 'No diff available'}
\`\`\`
`).join('\n')}
`;

// Run the PR checker with sample data
processPR(formattedPRContent, 123)
  .then(() => console.log('✅ Sample PR processing completed'))
  .catch(err => {
    console.error('❌ Error processing sample PR:', err);
    process.exit(1);
  });
