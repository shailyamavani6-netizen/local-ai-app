import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// ==========================================
// 1. SETUP SCENE, CAMERA, & RENDERER
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Add basic lighting so depth and shadows are visible
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

let currentMesh = null;

// ==========================================
// 2. PURE CODE: AUTOMATIC HEIGHTMAP GENERATOR
// ==========================================
// This function takes any color texture and converts it to a grayscale Heightmap in memory
function createHeightmapFromTexture(texture) {
  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width || 512;
  canvas.height = image.height || 512;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert each pixel to grayscale (Luminance formula)
  for (let i = 0; i < data.length; i += 4) {
    const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i]     = avg; // Red
    data[i + 1] = avg; // Green
    data[i + 2] = avg; // Blue
  }

  ctx.putImageData(imageData, 0, 0);

  // Return a new Three.js texture generated purely in code
  const heightTexture = new THREE.CanvasTexture(canvas);
  heightTexture.needsUpdate = true;
  return heightTexture;
}

// ==========================================
// 3. APPLY POM / HEIGHTMAP SHADER MATERIAL
// ==========================================
function applyPOMToMesh(mesh) {
  mesh.traverse((child) => {
    if (child.isMesh && child.material) {
      const oldMat = child.material;
      
      // Extract existing texture, or create a default grid if none exists
      let baseTexture = oldMat.map;
      if (!baseTexture) {
        baseTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/uv_grid_opengl.jpg');
      }

      // Generate heightmap purely in code
      const generatedHeightmap = createHeightmapFromTexture(baseTexture);

      // Create a Material with Displacement & Depth properties
      child.material = new THREE.MeshStandardMaterial({
        map: baseTexture,
        displacementMap: generatedHeightmap,
        displacementScale: 0.1, // Controls depth intensity
        bumpMap: generatedHeightmap,
        bumpScale: 0.05,
        roughness: 0.4,
        metalness: 0.1
      });

      child.material.needsUpdate = true;
    }
  });
}

// ==========================================
// 4. CREATE A 100-POLYGON DEMO MESH
// ==========================================
function createDemoMesh() {
  // Create a low-poly sphere (approx 100-200 polygons)
  const geometry = new THREE.SphereGeometry(1, 16, 12); 
  const texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/uv_grid_opengl.jpg', (tex) => {
    const material = new THREE.MeshStandardMaterial({ map: tex });
    currentMesh = new THREE.Mesh(geometry, material);
    scene.add(currentMesh);

    // Run our auto-POM generator
    applyPOMToMesh(currentMesh);
  });
}

createDemoMesh();

// ==========================================
// 5. EXPORT TO .GLB WITH PACKED HEIGHTMAPS
// ==========================================
export function exportGLB() {
  if (!currentMesh) return;

  const exporter = new GLTFExporter();
  exporter.parse(
    currentMesh,
    (gltf) => {
      const blob = new Blob([gltf], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'model_with_pom_depth.glb';
      link.click();
    },
    (error) => console.error('Export error:', error),
    { binary: true } // Saves as single compact .glb file
  );
}

// Render loop
function animate() {
  requestAnimationFrame(animate);
  if (currentMesh) currentMesh.rotation.y += 0.005;
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
