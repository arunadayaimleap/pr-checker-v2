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
  await postComment(formattedComment);
}
