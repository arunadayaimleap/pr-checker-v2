/**
 * Provides mock PR data for local testing
 */
function createMockPREvent() {
  return {
    repository: {
      full_name: 'local/testing-repo'
    },
    pull_request: {
      number: 123,
      title: 'Test PR for local development',
      body: 'This is a test PR for local development',
      user: {
        login: 'local-user'
      },
      head: {
        ref: 'feature-branch'
      },
      base: {
        ref: 'main'
      }
    }
  };
}

module.exports = {
  createMockPREvent
};
