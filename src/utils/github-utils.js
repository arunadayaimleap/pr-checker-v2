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
