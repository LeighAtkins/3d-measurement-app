import fs from 'fs';
import path from 'path';

// Create a simple GLB file with basic cube data
// This is a minimal GLB structure for a 1x1x1 cube
function createCubeGLB() {
  // Simplified GLB with JSON + BIN data for a basic cube
  const gltf = {
    "asset": {
      "version": "2.0",
      "generator": "3D Measurement App"
    },
    "scene": 0,
    "scenes": [
      {
        "nodes": [0]
      }
    ],
    "nodes": [
      {
        "mesh": 0,
        "name": "Cube"
      }
    ],
    "meshes": [
      {
        "primitives": [
          {
            "attributes": {
              "POSITION": 0,
              "NORMAL": 1
            },
            "indices": 2,
            "material": 0
          }
        ]
      }
    ],
    "materials": [
      {
        "pbrMetallicRoughness": {
          "baseColorFactor": [0.065, 0.725, 0.506, 1.0],
          "metallicFactor": 0.1,
          "roughnessFactor": 0.7
        },
        "name": "CubeMaterial"
      }
    ],
    "accessors": [
      {
        "bufferView": 0,
        "componentType": 5126,
        "count": 24,
        "type": "VEC3",
        "max": [0.5, 0.5, 0.5],
        "min": [-0.5, -0.5, -0.5]
      },
      {
        "bufferView": 1,
        "componentType": 5126,
        "count": 24,
        "type": "VEC3"
      },
      {
        "bufferView": 2,
        "componentType": 5123,
        "count": 36,
        "type": "SCALAR"
      }
    ],
    "bufferViews": [
      {
        "buffer": 0,
        "byteOffset": 0,
        "byteLength": 288
      },
      {
        "buffer": 0,
        "byteOffset": 288,
        "byteLength": 288
      },
      {
        "buffer": 0,
        "byteOffset": 576,
        "byteLength": 72
      }
    ],
    "buffers": [
      {
        "byteLength": 648
      }
    ]
  };

  // Create cube vertex data (positions, normals, indices)
  const positions = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
    // Back face
    -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
    // Top face
    -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
    // Bottom face
    -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
    // Right face
     0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
    // Left face
    -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5
  ]);

  const normals = new Float32Array([
    // Front face
     0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
    // Back face
     0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
    // Top face
     0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
    // Bottom face
     0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
    // Right face
     1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
    // Left face
    -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
  ]);

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,    // Front
     4,  5,  6,   4,  6,  7,    // Back
     8,  9, 10,   8, 10, 11,    // Top
    12, 13, 14,  12, 14, 15,    // Bottom
    16, 17, 18,  16, 18, 19,    // Right
    20, 21, 22,  20, 22, 23     // Left
  ]);

  // Combine all binary data
  const binaryData = Buffer.concat([
    Buffer.from(positions.buffer),
    Buffer.from(normals.buffer),
    Buffer.from(indices.buffer)
  ]);

  return { gltf, binaryData };
}

// Create GLB file format
function createGLB(gltf, binaryData) {
  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = Buffer.from(jsonString);
  
  // Pad to 4-byte alignment
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
  
  const binaryPadding = (4 - (binaryData.length % 4)) % 4;
  const paddedBinaryBuffer = Buffer.concat([binaryData, Buffer.alloc(binaryPadding, 0)]);
  
  // GLB header
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // 'glTF' magic
  header.writeUInt32LE(2, 4); // version
  header.writeUInt32LE(12 + 8 + paddedJsonBuffer.length + 8 + paddedBinaryBuffer.length, 8); // total length
  
  // JSON chunk header
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'
  
  // Binary chunk header
  const binaryChunkHeader = Buffer.alloc(8);
  binaryChunkHeader.writeUInt32LE(paddedBinaryBuffer.length, 0);
  binaryChunkHeader.writeUInt32LE(0x004E4942, 4); // 'BIN\0'
  
  return Buffer.concat([
    header,
    jsonChunkHeader,
    paddedJsonBuffer,
    binaryChunkHeader,
    paddedBinaryBuffer
  ]);
}

// Generate models
function generateModels() {
  console.log('Generating sample 3D models...\n');
  
  const clientOutputDir = path.join(process.cwd(), 'client-portal', 'public', 'sample-models');
  const companyOutputDir = path.join(process.cwd(), 'company-dashboard', 'public', 'sample-models');
  
  // Ensure both directories exist
  if (!fs.existsSync(clientOutputDir)) {
    fs.mkdirSync(clientOutputDir, { recursive: true });
  }
  if (!fs.existsSync(companyOutputDir)) {
    fs.mkdirSync(companyOutputDir, { recursive: true });
  }
  
  try {
    // Generate cube
    const { gltf, binaryData } = createCubeGLB();
    const glbBuffer = createGLB(gltf, binaryData);
    
    // Save to both locations
    fs.writeFileSync(path.join(clientOutputDir, 'cube.glb'), glbBuffer);
    fs.writeFileSync(path.join(companyOutputDir, 'cube.glb'), glbBuffer);
    console.log('✓ Generated cube.glb (both locations)');
    
    // Copy cube for room and cabinet (we'll use the same geometry for simplicity)
    fs.writeFileSync(path.join(clientOutputDir, 'room.glb'), glbBuffer);
    fs.writeFileSync(path.join(companyOutputDir, 'room.glb'), glbBuffer);
    console.log('✓ Generated room.glb (both locations)');
    
    fs.writeFileSync(path.join(clientOutputDir, 'cabinet.glb'), glbBuffer);
    fs.writeFileSync(path.join(companyOutputDir, 'cabinet.glb'), glbBuffer);
    console.log('✓ Generated cabinet.glb (both locations)');
    
    console.log('\n✓ All sample models generated successfully!');
    console.log('Models saved to:');
    console.log('  - client-portal/public/sample-models/');
    console.log('  - company-dashboard/public/sample-models/');
    
  } catch (error) {
    console.error('✗ Failed to generate models:', error);
    process.exit(1);
  }
}

generateModels();