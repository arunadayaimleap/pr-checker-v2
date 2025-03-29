import { postComment } from '../review/postPRComment.js';

/**
 * Adds a comment to a PR
 * @param {string} title - Comment title
 * @param {string} body - Comment body
 * @param {number} prNumber - PR number
 * @returns {Promise<void>}
 */
export async function addCommentToPR(title, body, prNumber) {
  const formattedComment = `## ${title}\n\n${body}`;
  
  // The postComment function doesn't use prNumber directly
  // It gets this information from the GitHub event payload
  // So we can safely call it without passing prNumber
  await postComment(formattedComment);
  
  // Note: If we need to explicitly use prNumber in local testing,
  // we could modify postComment to accept it as an optional parameter
}

/**
 * Gets details about a PR including its diff
 * @param {string} prNumber - PR number
 * @param {string} repoName - Repository name in format owner/repo
 * @param {string} workspacePath - GitHub workspace path
 * @returns {Promise<Object>} PR details including changed files
 */
export async function getPRDetails(prNumber, repoName, workspacePath = null) {
  try {
    console.log(`🔍 Fetching PR #${prNumber} details from GitHub API...`);
    
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not found in environment variables');
    }
    
    // Get the PR details from GitHub API
    const [owner, repo] = repoName.split('/');
    const apiUrl = `https://api.github.com/repos/${repoName}/pulls/${prNumber}`;
    
    console.log(`Requesting PR data from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const prData = await response.json();
    console.log(`✅ Retrieved basic PR info. Title: "${prData.title}"`);
    
    // Get the list of files changed in the PR
    const filesUrl = `https://api.github.com/repos/${repoName}/pulls/${prNumber}/files`;
    console.log(`Requesting PR files from: ${filesUrl}`);
    
    const filesResponse = await fetch(filesUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!filesResponse.ok) {
      const errorText = await filesResponse.text();
      throw new Error(`GitHub API error (files): ${filesResponse.status} ${filesResponse.statusText} - ${errorText}`);
    }
    
    const filesData = await filesResponse.json();
    console.log(`✅ Retrieved ${filesData.length} changed files in PR`);
    
    // Process the changed files to get their diffs
    const changedFiles = await Promise.all(filesData.map(async file => {
      const fileExtension = file.filename.split('.').pop();
      
      return {
        path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        diff: file.patch || 'No diff available',
        extension: fileExtension,
        content: file.patch || 'No content available'
      };
    }));
    
    return {
      number: prNumber,
      title: prData.title,
      description: prData.body || '',
      authorLogin: prData.user.login,
      changedFiles
    };
  } catch (error) {
    console.error(`❌ Error fetching PR details: ${error.message}`);
    throw error;
  }
}
