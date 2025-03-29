# 🧠 Visual PR Checker v2.1

AI-powered GitHub pull request reviewer that:
- Summarizes all PR changes
- Generates schema diagrams, flowcharts, and directory trees
- Flags smells and subsystem structure
- Posts AI review comments on your PR

---

## 🎯 Objective

Build a GitHub-integrated PR reviewer that uses AI to:

- 🔍 Analyze PRs file-by-file and as a whole
- 🧠 Generate AI-powered summaries of changes
- 🧱 Merge code structure into a unified schema diagram
- 🔁 Show visual before/after diffs
- 🧬 Extract procedural flowcharts
- 📂 Render a directory tree of changed files
- 🧠 Classify subsystems (e.g., "Auth Layer")
- 🚨 Flag code smells (e.g., god objects, circular deps)
- 🧰 Scan dependencies for vulnerabilities
- 🧠 Post markdown + visual feedback directly on the PR

---

## 📦 Functional Features

| Feature                     | Description                                                                 |
|----------------------------|-----------------------------------------------------------------------------|
| 🧠 AI Summary               | Natural-language summary of all PR changes                                  |
| 🧱 Merged Schema Diagram    | Combined class/module diagram for all changed files                         |
| 🔁 File-by-File Diff        | Show old vs new structure for each file                                     |
| 🔃 Flowchart Extraction     | Extract flowcharts for procedural code                                      |
| 📂 Directory Tree           | Mermaid-based folder/file view                                              |
| 🧠 Subsystem Suggestions    | Classify files into architectural zones (e.g., "Data Layer")                |
| 🚨 Code Smell Detection     | Detect issues like too many responsibilities, excessive nesting             |
| 🧰 Dependency Scanner       | Warn about deprecated or vulnerable packages in `package.json`, etc.        |
| 🛡️ Security Risk Detection  | Flag risky code patterns or secrets                                         |
| 💬 PR Comment Formatter     | Posts AI-powered review + diagrams to the pull request                      |

---

## 🧰 Technical Requirements

| Component      | Technology                 |
|----------------|----------------------------|
| GitHub Actions | Trigger on PR events       |
| AI Model       | OpenAI GPT-4 / Claude / OpenRouter |
| Diagrams       | Mermaid.js for GitHub-compatible diagrams |
| Rendering      | Puppeteer for image generation |
| Language       | Node.js + npm              |
| Auth           | GitHub token + ChatGPT/OpenRouter API key |

---

## 📁 Project Structure

```
github-pr-checker-v2/
├── src/
│   ├── index.js
│   ├── ai/
│   │   ├── generateSchema.js
│   │   ├── generateFlowchart.js
│   │   ├── suggestSubsystem.js
│   │   ├── detectSmells.js
│   │   └── generateSummary.js
│   ├── utils/
│   │   └── diffFiles.js
│   ├── visual/
│   │   ├── renderMermaid.js
│   │   └── renderDrawio.js
│   └── review/
│       ├── postPRComment.js
│       ├── dependencyScan.js
│       └── securityCheck.js
├── .github/workflows/pr-review.yml
├── .env.example
├── package.json
├── README.md
└── README-PR-Checker-V2.md
```

---

## 🚀 Setup Guide

### 1️⃣ Install Dependencies

```bash
npm install
```

---

### 2️⃣ Environment Setup

Copy `.env.example` to `.env` and add your keys:

```env
CHATGPT_API_KEY=your_openai_or_openrouter_key
GITHUB_TOKEN=your_github_token
```

---

### 3️⃣ GitHub Action Integration

Create `.github/workflows/pr-review.yml`:

```yaml
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm install
      - run: node src/index.js
```

---

### 4️⃣ Add Required GitHub Secrets

- `CHATGPT_API_KEY`
- `GITHUB_TOKEN` (use default from GitHub)

---

## 🧪 Testing Guide

### ✅ Unit Tests

| Module                 | Test Goal                                  |
|------------------------|--------------------------------------------|
| `generateSchema.js`    | Correctly extract/merge structure          |
| `generateSummary.js`   | Summarize PR diffs logically               |
| `renderMermaid.js`     | Diagram rendered with no error             |
| `detectSmells.js`      | Flags god objects, deep nesting, etc.      |
| `dependencyScan.js`    | Detects outdated or vulnerable packages    |
| `postPRComment.js`     | Markdown structure + image links formatted |

Use `jest` or `mocha` with mocks and test file fixtures.

---

### 🧪 Manual End-to-End Test

1. Fork a repo or create a test project.
2. Make changes to 2–3 files across different modules.
3. Create a pull request.
4. Watch workflow trigger under **Actions**.
5. Confirm PR comment includes:
   - ✅ Summary
   - ✅ Merged schema diagram
   - ✅ Subsystem tags
   - ✅ Smell flags
   - ✅ Directory structure
   - ✅ Flowcharts
   - ✅ Dependency issues (if applicable)

---

## 🧪 Local Testing

You can test the PR Checker locally without GitHub Actions:

1. Copy `.env.example` to `.env` and add your API keys
2. Run the local test script:

```bash
# Install dependencies
npm install

# Run local test on a target project
npm run test-local /path/to/your/target/project
```

This will:
- Analyze the target project files
- Generate a PR review comment
- Save the output to `pr-review-output.md`

Note: When running locally, the PR comment won't be posted to GitHub, but you'll see a preview of what would be posted.

---

## AI Model

This PR Checker uses a robust model fallback system:

1. **DeepSeek Chat v3** (Primary model) - A powerful open-source model for code analysis
2. **Meta Llama 3** (First fallback) - Solid open-source model for code review
3. **Mistral Small** (Second fallback) - Efficient model with good code comprehension

This approach ensures reliable code analysis even when specific models have rate limits or availability issues.

## Testing Different Models

PR Checker includes several scripts to test different LLM models:

```bash
# Test the model fallback mechanism
npm run test-openrouter

# Test specific models
npm run test-deepseek
npm run test-llama
npm run model:mistral

# List all available models from OpenRouter
npm run list-models
```

---

## Supported Models

The system automatically tries multiple models in sequence, so you don't need to specify which model to use. All models are accessed through the OpenRouter API.

## Environment Variables

| Variable           | Description                                      |
|--------------------|--------------------------------------------------|
| GITHUB_TOKEN       | GitHub token for API access                      |
| OPENAI_API_KEY     | OpenAI API key (optional)                        |
| ANTHROPIC_API_KEY  | Anthropic API key (optional)                     |
| OPENROUTER_API_KEY | OpenRouter API key (required)                    |
| COMMENT_ON_PR      | Set to 'true' to post comments on PRs            |
| USE_GPT4           | Set to 'true' to use GPT-4 for extra-large PRs   |

---

## 💬 Example PR Comment

```md
## 🤖 AI Summary
- `auth.js`: Added token refresh
- `userService.js`: Removed password encoder
- `db.js`: Added index support

### 🔧 Impact
- Security improved with token handler
- Risk: removal of deprecated method

---

## 🧩 Merged Schema
![schema.png](https://...)

## 🔁 Diff Breakdown
- `auth.js`: +1 function
- `userService.js`: -1 method
- `db.js`: modified structure

## 🔃 Flowchart
![flow-userService.png](https://...)

## 📂 Tree View
```
src/
├── auth.js
├── db.js
└── userService.js
```

## 🚨 Code Smells
- `userService.js` → ❗ God Object
- `db.js` → ✅ Clean

## 🧠 Subsystems
- `auth.js` → Authentication Layer
- `db.js` → Persistence Layer
```

---

## 🚧 Future Enhancements

- Inline GitHub review comments
- AI-suggested test coverage
- Public diagram hosting
- Slack/Discord notifications
- CLI dev mode + offline model support

---

# PR Checker V2

A tool for analyzing GitHub Pull Requests using AI.

## Setup

1. Clone the repository
2. Create a `.env` file with the following variables:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key
   GITHUB_TOKEN=your_github_token
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Testing OpenRouter API

To verify that the OpenRouter API is working correctly, run:

```
npm run test-openrouter
```

This will send a test request to the OpenRouter API and display the response.

## Usage

To start the PR checker:

```
npm start
```

For local testing:

```
npm run test-local
```

## API Keys

- OpenRouter API: Get your key from [OpenRouter](https://openrouter.ai/)
- GitHub Token: Generate a token from [GitHub Settings](https://github.com/settings/tokens)
