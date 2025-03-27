const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const AdmZip = require('adm-zip');

/**
 * Renders diagrams using draw.io CLI
 * @param {Object} options - Options including schema and flowchart data
 * @returns {Promise<Array<Object>>} Array of rendered diagram objects
 */
async function renderDiagrams(options) {
  const { schema, flowcharts } = options;
  const results = [];
  
  // Render schema diagram if available
  if (schema && schema.drawio && schema.drawio.content) {
    const schemaDiagram = await renderDrawioDiagram(schema.drawio.content, 'schema-diagram');
    if (schemaDiagram) {
      results.push({
        title: 'Schema Diagram',
        type: 'schema',
        ...schemaDiagram
      });
    }
  }
  
  // Render flowcharts if available
  if (flowcharts && flowcharts.length > 0) {
    // Convert each Mermaid flowchart to draw.io format and render
    for (const flowchart of flowcharts) {
      if (flowchart.mermaidCode) {
        // Convert Mermaid to draw.io format
        const drawioXML = await convertMermaidToDrawio(flowchart.mermaidCode, flowchart.name);
        
        if (drawioXML) {
          const flowDiagram = await renderDrawioDiagram(drawioXML, `flowchart-${sanitizeFilename(flowchart.name)}`);
          if (flowDiagram) {
            results.push({
              title: `Flowchart: ${flowchart.name}`,
              type: 'flowchart',
              description: flowchart.description,
              filePath: flowchart.filePath,
              ...flowDiagram
            });
          }
        }
      }
    }
  }
  
  return results;
}

/**
 * Renders a draw.io diagram to PNG
 * @param {string} xmlContent - draw.io XML content
 * @param {string} diagramName - Name of the diagram
 * @returns {Promise<Object>} Rendered diagram object with image data
 */
async function renderDrawioDiagram(xmlContent, diagramName) {
  try {
    const tempDir = path.join(os.tmpdir(), 'pr-checker-drawio');
    await fs.ensureDir(tempDir);
    
    const xmlPath = path.join(tempDir, `${diagramName}-${Date.now()}.xml`);
    const pngPath = path.join(tempDir, `${diagramName}-${Date.now()}.png`);
    
    // Write the XML content to a file
    await fs.writeFile(xmlPath, xmlContent);
    
    // Use draw.io CLI to convert XML to PNG
    const drawioPath = process.env.DRAWIO_PATH;
    const command = `"${drawioPath}" --export --format png --output "${pngPath}" "${xmlPath}"`;
    
    try {
      execSync(command, { stdio: 'pipe' });
      
      // Read the image file and convert to base64
      const imageBuffer = await fs.readFile(pngPath);
      const base64Image = imageBuffer.toString('base64');
      
      return {
        xmlPath,
        imagePath: pngPath,
        imageData: base64Image
      };
    } catch (execError) {
      console.error(`Error executing draw.io CLI: ${execError.message}`);
      // Fallback to simplified rendering if CLI fails
      return {
        xmlPath,
        error: `Failed to render diagram: ${execError.message}`,
        imageData: null
      };
    }
  } catch (error) {
    console.error(`Error rendering draw.io diagram: ${error.message}`);
    return {
      error: error.message
    };
  }
}

/**
 * Converts Mermaid code to draw.io XML format
 * @param {string} mermaidCode - Mermaid diagram code
 * @param {string} diagramName - Name of the diagram
 * @returns {Promise<string>} draw.io XML content
 */
async function convertMermaidToDrawio(mermaidCode, diagramName) {
  // Since there's no direct conversion from Mermaid to draw.io,
  // we'll use a basic template and embed information about the Mermaid diagram
  
  // Simple draw.io XML template with a note about the Mermaid content
  const xmlTemplate = `
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="PR Checker" etag="mermaid-${Date.now()}" version="21.1.8">
  <diagram id="mermaid-${diagramName.replace(/\W/g, '_')}" name="${escapeXml(diagramName)}">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="${escapeXml(`This diagram was originally created in Mermaid format.\nOriginal Mermaid code:\n\n${mermaidCode}`)}" style="shape=note;strokeWidth=2;fontSize=14;size=20;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontColor=#666600;align=left;spacing=8;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="760" height="280" as="geometry" />
        </mxCell>
        <mxCell id="3" value="${escapeXml(`View this diagram in the PR comment as a Mermaid rendering.\nDraw.io direct conversion is not available.`)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontColor=#333333;" vertex="1" parent="1">
          <mxGeometry x="40" y="330" width="760" height="40" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
  `;
  
  return xmlTemplate;
}

/**
 * Escape special characters in XML
 * @param {string} str - Input string
 * @returns {string} XML-escaped string
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitize a string for use as a filename
 * @param {string} name - Input name
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
}

module.exports = {
  renderDiagrams
};
