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
- 🧠 Classify subsystems (e.g., “Auth Layer”)
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
| 📂 Directory Tree           | Mermaid-based or Markdown folder/file view                                 |
| 🧠 Subsystem Suggestions    | Classify files into architectural zones (e.g., "Data Layer")                |
| 🚨 Code Smell Detection     | Detect issues like too many responsibilities, excessive nesting             |
| 🧰 Dependency Scanner       | Warn about deprecated or vulnerable packages in `package.json`, etc.        |
| 🛡️ Security Risk Detection  | Flag risky code patterns or secrets                                           |
| 💬 PR Comment Formatter     | Posts AI-powered review + diagrams to the pull request                      |

---

## 🧰 Technical Requirements

| Component      | Technology                 |
|----------------|----------------------------|
| GitHub Actions | Trigger on PR events       |
| AI Model       | OpenAI GPT-4 / Claude / OpenRouter |
| Diagrams       | Mermaid + draw.io XML      |
| Rendering      | Puppeteer (Mermaid), draw.io CLI |
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
└── README.md
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
DRAWIO_PATH=draw.io
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
      - run: |
          git clone https://github.com/YOUR-ORG/github-pr-checker-v2-full pr-checker
          cd pr-checker
          npm install
          node src/index.js
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
   - ✅ Merged schema image
   - ✅ Subsystem tags
   - ✅ Smell flags
   - ✅ Directory structure
   - ✅ Flowcharts
   - ✅ Dependency issues (if applicable)

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
