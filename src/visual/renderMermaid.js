const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const puppeteer = require('puppeteer');

/**
 * Renders Mermaid diagrams as images
 * @param {Object} options - Options for rendering
 * @returns {Promise<Array<Object>>} Array of rendered diagram objects
 */
async function renderDiagrams(options) {
  const { directory, changedFiles, subsystems } = options;
  
  // Create Mermaid diagrams
  const diagrams = [
    await createDirectoryTree(directory, changedFiles),
    ...await createSubsystemDiagrams(subsystems, changedFiles)
  ].filter(Boolean);
  
  // Render each Mermaid diagram
  const renderedDiagrams = await Promise.all(
    diagrams.map(diagram => renderMermaidDiagram(diagram))
  );
  
  return renderedDiagrams.filter(Boolean);
}

/**
 * Creates a directory tree diagram
 * @param {string} directory - Target directory
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Object>} Directory tree diagram object
 */
async function createDirectoryTree(directory, changedFiles) {
  // Create a set of all directories that contain changed files
  const dirSet = new Set();
  
  changedFiles.forEach(file => {
    let currentDir = path.dirname(file.path);
    while (currentDir && currentDir !== '.') {
      dirSet.add(currentDir);
      currentDir = path.dirname(currentDir);
    }
  });
  
  // Convert to array and sort
  const allDirs = Array.from(dirSet).sort();
  
  // Create tree structure
  const tree = {};
  
  allDirs.forEach(dir => {
    const parts = dir.split(/[\/\\]/);
    let current = tree;
    
    parts.forEach(part => {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    });
  });
  
  // Generate Mermaid code for the directory tree
  let mermaidCode = 'graph TD\n';
  
  // Function to recursively process the tree
  function processNode(node, parentId = 'root') {
    Object.keys(node).forEach((name, i) => {
      const nodeId = `${parentId}_${name.replace(/\W/g, '_')}`;
      mermaidCode += `  ${parentId}(${parentId === 'root' ? 'Root' : parentId}) --> ${nodeId}[${name}]\n`;
      processNode(node[name], nodeId);
    });
  }
  
  // Add changed files
  changedFiles.forEach(file => {
    const fileId = `file_${file.path.replace(/\W/g, '_')}`;
    const dirId = `root_${path.dirname(file.path).replace(/\W/g, '_')}`;
    mermaidCode += `  ${dirId} --> ${fileId}([${path.basename(file.path)}])\n`;
  });
  
  // Start with root node
  mermaidCode += '  root((Project Root))\n';
  processNode(tree);
  
  return {
    title: 'Directory Structure',
    type: 'directory-tree',
    mermaidCode
  };
}

/**
 * Creates subsystem diagrams
 * @param {Object} subsystemData - Subsystem classification data
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Array<Object>>} Array of subsystem diagram objects
 */
async function createSubsystemDiagrams(subsystemData, changedFiles) {
  if (!subsystemData || !subsystemData.subsystems || subsystemData.subsystems.length === 0) {
    return [];
  }
  
  // Create a diagram showing subsystem relationships
  let mermaidCode = 'graph TD\n';
  
  // Add subsystems as nodes
  subsystemData.subsystems.forEach(subsystem => {
    const subsystemId = `subsystem_${subsystem.name.replace(/\W/g, '_')}`;
    mermaidCode += `  ${subsystemId}[${subsystem.name}]\n`;
  });
  
  // Group files by subsystem
  const filesBySubsystem = {};
  
  if (subsystemData.fileClassifications) {
    subsystemData.fileClassifications.forEach(classification => {
      const subsystemName = classification.subsystem;
      if (!filesBySubsystem[subsystemName]) {
        filesBySubsystem[subsystemName] = [];
      }
      filesBySubsystem[subsystemName].push(classification.filePath);
    });
  }
  
  // Add files to their subsystems
  Object.entries(filesBySubsystem).forEach(([subsystemName, filePaths]) => {
    const subsystemId = `subsystem_${subsystemName.replace(/\W/g, '_')}`;
    
    filePaths.slice(0, 5).forEach(filePath => {
      const fileId = `file_${filePath.replace(/\W/g, '_')}`;
      mermaidCode += `  ${subsystemId} --> ${fileId}([${path.basename(filePath)}])\n`;
    });
    
    if (filePaths.length > 5) {
      mermaidCode += `  ${subsystemId} --> ${subsystemId}_more[...${filePaths.length - 5} more files]\n`;
    }
  });
  
  // Add relationships between subsystems based on typical dependencies
  const relationships = [
    ['UI/Presentation Layer', 'Business Logic Layer'],
    ['Business Logic Layer', 'Data Access Layer'],
    ['API Layer', 'Business Logic Layer'],
    ['Authentication Layer', 'Business Logic Layer']
  ];
  
  relationships.forEach(([from, to]) => {
    if (subsystemData.subsystems.some(s => s.name === from) && 
        subsystemData.subsystems.some(s => s.name === to)) {
      const fromId = `subsystem_${from.replace(/\W/g, '_')}`;
      const toId = `subsystem_${to.replace(/\W/g, '_')}`;
      mermaidCode += `  ${fromId} -.-> ${toId}\n`;
    }
  });
  
  return [{
    title: 'Subsystem Analysis',
    type: 'subsystem-diagram',
    mermaidCode
  }];
}

/**
 * Renders a Mermaid diagram
 * @param {Object} diagram - Diagram object with Mermaid code
 * @returns {Promise<Object>} Rendered diagram object with image data
 */
async function renderMermaidDiagram(diagram) {
  try {
    const tempDir = path.join(os.tmpdir(), 'pr-checker-mermaid');
    await fs.ensureDir(tempDir);
    
    const htmlPath = path.join(tempDir, `${diagram.type}-${Date.now()}.html`);
    const pngPath = path.join(tempDir, `${diagram.type}-${Date.now()}.png`);
    
    // Create HTML with Mermaid
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <script>
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: { useMaxWidth: false }
          });
        </script>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
          .mermaid { max-width: 100%; }
        </style>
      </head>
      <body>
        <h2>${diagram.title}</h2>
        <div class="mermaid">
${diagram.mermaidCode}
        </div>
      </body>
      </html>
    `;
    
    await fs.writeFile(htmlPath, html);
    
    // Use Puppeteer to render the HTML to PNG
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`);
    
    // Wait for Mermaid to render
    await page.waitForFunction(() => {
      return document.querySelector('.mermaid svg') !== null;
    }, { timeout: 10000 });
    
    // Wait a bit more to ensure rendering is complete
    await page.waitForTimeout(1000);
    
    // Get the element for taking screenshot
    const element = await page.$('body');
    await element.screenshot({ path: pngPath });
    
    await browser.close();
    
    // Read the image file and convert to base64
    const imageBuffer = await fs.readFile(pngPath);
    const base64Image = imageBuffer.toString('base64');
    
    return {
      ...diagram,
      imagePath: pngPath,
      imageData: base64Image
    };
  } catch (error) {
    console.error(`Error rendering Mermaid diagram:`, error);
    return {
      ...diagram,
      error: error.message
    };
  }
}

module.exports = {
  renderDiagrams
};
