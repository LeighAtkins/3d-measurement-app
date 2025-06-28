import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

// Create normalized cube (1x1x1 centered at origin)
function generateCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x10b981,
    roughness: 0.7,
    metalness: 0.1 
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.name = 'Cube';
  
  // Already normalized: -0.5 to 0.5 on all axes
  return cube;
}

// Create simple room
function generateRoom() {
  const group = new THREE.Group();
  group.name = 'Room';
  
  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.02, 1),
    new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2 
    })
  );
  floor.position.y = -0.49;
  floor.name = 'Floor';
  
  // Back wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.96, 0.02),
    new THREE.MeshStandardMaterial({ 
      color: 0xf5f5f5,
      roughness: 0.9 
    })
  );
  backWall.position.z = -0.49;
  backWall.position.y = 0;
  backWall.name = 'BackWall';
  
  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.96, 1),
    new THREE.MeshStandardMaterial({ 
      color: 0xf0f0f0,
      roughness: 0.9 
    })
  );
  leftWall.position.x = -0.49;
  leftWall.position.y = 0;
  leftWall.name = 'LeftWall';
  
  group.add(floor, backWall, leftWall);
  return group;
}

// Create kitchen cabinet
function generateCabinet() {
  const group = new THREE.Group();
  group.name = 'Cabinet';
  
  // Cabinet body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.9, 0.4),
    new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.6,
      metalness: 0.1 
    })
  );
  body.position.y = -0.05;
  body.name = 'CabinetBody';
  
  // Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.8, 0.02),
    new THREE.MeshStandardMaterial({ 
      color: 0xa0522d,
      roughness: 0.5,
      metalness: 0.1 
    })
  );
  door.position.x = -0.15;
  door.position.y = -0.05;
  door.position.z = 0.21;
  door.name = 'CabinetDoor';
  
  // Handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.1),
    new THREE.MeshStandardMaterial({ 
      color: 0xc0c0c0,
      roughness: 0.2,
      metalness: 0.8 
    })
  );
  handle.position.x = 0.05;
  handle.position.y = -0.05;
  handle.position.z = 0.22;
  handle.rotation.z = Math.PI / 2;
  handle.name = 'Handle';
  
  group.add(body, door, handle);
  return group;
}

// Export model to GLB format
async function exportModel(model, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    
    exporter.parse(
      model,
      (gltf) => {
        const outputPath = path.join(process.cwd(), 'client-portal', 'public', 'sample-models', filename);
        
        if (gltf instanceof ArrayBuffer) {
          // Binary GLB format
          fs.writeFileSync(outputPath, Buffer.from(gltf));
        } else {
          // JSON format
          fs.writeFileSync(outputPath, JSON.stringify(gltf, null, 2));
        }
        
        console.log(`✓ Generated ${filename}`);
        resolve();
      },
      (error) => {
        console.error(`✗ Failed to generate ${filename}:`, error);
        reject(error);
      },
      {
        binary: true, // Generate GLB format
        includeCustomExtensions: false
      }
    );
  });
}

// Generate all models
async function generateAllModels() {
  console.log('Generating sample 3D models...\n');
  
  try {
    const cube = generateCube();
    await exportModel(cube, 'cube.glb');
    
    const room = generateRoom();
    await exportModel(room, 'room.glb');
    
    const cabinet = generateCabinet();
    await exportModel(cabinet, 'cabinet.glb');
    
    console.log('\n✓ All sample models generated successfully!');
    console.log('Models saved to: client-portal/public/sample-models/');
    
  } catch (error) {
    console.error('✗ Failed to generate models:', error);
    process.exit(1);
  }
}

// Run the generation
generateAllModels();