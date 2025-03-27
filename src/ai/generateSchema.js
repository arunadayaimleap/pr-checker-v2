const { callOpenAI } = require('./openAIClient');
const fs = require('fs-extra');
const path = require('path');

/**
 * Creates a schema diagram of the code structure
 * @param {Array<Object>} changedFiles - Array of changed file objects
 * @returns {Promise<Object>} Schema diagram information
 */
async function createSchema(changedFiles) {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      description: "No schema could be generated - no files changed.",
      diagramType: "none",
      content: null
    };
  }
  
  // Filter to only code files that can be represented in schemas
  const relevantFiles = changedFiles.filter(file => {
    const relevantExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cs', 'php', 'rb', 'go'];
    return relevantExtensions.includes(file.extension);
  });
  
  if (relevantFiles.length === 0) {
    return {
      description: "No schema could be generated - no relevant code files.",
      diagramType: "none",
      content: null
    };
  }
  
  // Process each file to extract schema information
  const fileSchemas = await Promise.all(
    relevantFiles.map(file => extractSchemaFromFile(file))
  );
  
  // Merge schemas into a combined diagram
  return createCombinedSchema(fileSchemas, relevantFiles);
}

/**
 * Extract schema information from a single file
 * @param {Object} file - File object
 * @returns {Promise<Object>} Schema information for the file
 */
async function extractSchemaFromFile(file) {
  // Use different extraction strategies based on file type
  switch (file.extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return extractJSSchema(file);
    case 'py':
      return extractPythonSchema(file);
    case 'java':
    case 'cs':
      return extractOOPSchema(file);
    default:
      return {
        filePath: file.path,
        entities: [],
        relationships: []
      };
  }
}

/**
 * Extract schema from JavaScript/TypeScript files
 * @param {Object} file - File object
 * @returns {Promise<Object>} Schema information
 */
async function extractJSSchema(file) {
  const prompt = `
    Analyze this ${file.extension} file and extract the code structure information.
    File path: ${file.path}
    
    \`\`\`${file.extension}
    ${file.content}
    \`\`\`
    
    Return the schema information in this JSON format:
    {
      "filePath": "${file.path}",
      "entities": [
        {
          "name": "EntityName",
          "type": "class|function|interface|object",
          "properties": ["prop1", "prop2"],
          "methods": ["method1", "method2"]
        }
      ],
      "relationships": [
        {
          "from": "EntityName1",
          "to": "EntityName2",
          "type": "inheritance|composition|dependency|import"
        }
      ]
    }
    
    Include only clear, definite relationships you can identify from the code.
  `;
  
  try {
    const response = await callOpenAI(prompt, {
      system_message: 'You are a code structure analyzer. Extract entities and relationships from code files with high precision.'
    });
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.warn(`Failed to parse JS schema response: ${parseError.message}`);
      // Extract JSON from the response if it's not a clean JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {
        filePath: file.path,
        entities: [],
        relationships: []
      };
    }
  } catch (error) {
    console.error(`Error extracting JS schema from ${file.path}:`, error);
    return {
      filePath: file.path,
      entities: [],
      relationships: []
    };
  }
}

/**
 * Extract schema from Python files
 * @param {Object} file - File object
 * @returns {Promise<Object>} Schema information
 */
async function extractPythonSchema(file) {
  // Similar to extractJSSchema but with Python-specific prompting
  // Implementation left out for brevity - would follow similar pattern
  return {
    filePath: file.path,
    entities: [],
    relationships: []
  };
}

/**
 * Extract schema from Java/C# files
 * @param {Object} file - File object
 * @returns {Promise<Object>} Schema information
 */
async function extractOOPSchema(file) {
  // Similar to extractJSSchema but with Java/C#-specific prompting
  // Implementation left out for brevity - would follow similar pattern
  return {
    filePath: file.path,
    entities: [],
    relationships: []
  };
}

/**
 * Create a combined schema from individual file schemas
 * @param {Array<Object>} fileSchemas - Array of file schema objects
 * @param {Array<Object>} relevantFiles - Array of relevant file objects
 * @returns {Promise<Object>} Combined schema
 */
async function createCombinedSchema(fileSchemas, relevantFiles) {
  // Collect all entities and relationships
  const allEntities = fileSchemas.flatMap(schema => schema.entities);
  const allRelationships = fileSchemas.flatMap(schema => schema.relationships);
  
  // Create a map of file paths to make it easier to reference
  const filePathMap = relevantFiles.reduce((map, file) => {
    map[file.path] = file;
    return map;
  }, {});
  
  // Generate draw.io XML and mermaid diagrams
  const drawioXML = generateDrawioXML(allEntities, allRelationships, filePathMap);
  const mermaidCode = generateMermaidCode(allEntities, allRelationships, filePathMap);
  
  return {
    description: "Combined schema diagram for all changed files",
    diagramType: "both",
    drawio: {
      format: "xml",
      content: drawioXML
    },
    mermaid: {
      format: "mermaid",
      content: mermaidCode
    },
    rawData: {
      entities: allEntities,
      relationships: allRelationships
    }
  };
}

/**
 * Generate draw.io XML from entities and relationships
 * @param {Array<Object>} entities - Array of entity objects
 * @param {Array<Object>} relationships - Array of relationship objects
 * @param {Object} filePathMap - Map of file paths to file objects
 * @returns {string} draw.io XML content
 */
function generateDrawioXML(entities, relationships, filePathMap) {
  // Simplified implementation - in a real implementation, this would generate
  // proper draw.io XML with entity boxes, connection lines, etc.
  return `
    <mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="PR Checker" version="21.1.8">
      <diagram id="schema-diagram" name="Schema Diagram">
        <mxGraphModel grid="1" shadow="0" math="0" pageWidth="1169" pageHeight="827">
          <root>
            <mxCell id="0" />
            <mxCell id="1" parent="0" />
            <!-- Entity nodes would be added here -->
            <!-- Relationship edges would be added here -->
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>
  `;
}

/**
 * Generate mermaid code from entities and relationships
 * @param {Array<Object>} entities - Array of entity objects
 * @param {Array<Object>} relationships - Array of relationship objects
 * @param {Object} filePathMap - Map of file paths to file objects
 * @returns {string} Mermaid code
 */
function generateMermaidCode(entities, relationships, filePathMap) {
  let mermaidCode = 'classDiagram\n';
  
  // Add entities
  entities.forEach(entity => {
    mermaidCode += `  class ${sanitizeMermaidId(entity.name)} {\n`;
    
    // Add properties
    if (entity.properties && entity.properties.length > 0) {
      entity.properties.forEach(prop => {
        mermaidCode += `    +${prop}\n`;
      });
    }
    
    // Add methods
    if (entity.methods && entity.methods.length > 0) {
      entity.methods.forEach(method => {
        mermaidCode += `    +${method}()\n`;
      });
    }
    
    mermaidCode += '  }\n';
  });
  
  // Add relationships
  relationships.forEach(rel => {
    const fromId = sanitizeMermaidId(rel.from);
    const toId = sanitizeMermaidId(rel.to);
    
    switch (rel.type) {
      case 'inheritance':
        mermaidCode += `  ${toId} <|-- ${fromId}\n`;
        break;
      case 'composition':
        mermaidCode += `  ${fromId} *-- ${toId}\n`;
        break;
      case 'dependency':
      case 'import':
        mermaidCode += `  ${fromId} --> ${toId}\n`;
        break;
      default:
        mermaidCode += `  ${fromId} -- ${toId}\n`;
    }
  });
  
  return mermaidCode;
}

/**
 * Sanitize ID for mermaid diagram
 * @param {string} id - Original ID 
 * @returns {string} Sanitized ID
 */
function sanitizeMermaidId(id) {
  // Replace invalid characters with underscores
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}

module.exports = {
  createSchema
};
