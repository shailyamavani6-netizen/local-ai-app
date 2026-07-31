import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

// ==========================================
// 1. STATE & VARS
// ==========================================
let currentFile = null;
let currentFileType = null; // 'glb', 'gltf', or 'obj'
let currentMesh = null;
let originalMaterial = null;

// ==========================================
// 2. SETUP SCENE, CAMERA, & RENDERER
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// ==========================================
// 3. UI OVERLAY CREATION (2 SCREENS)
// ==========================================
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '0';
uiContainer.style.left = '0';
uiContainer.style.width = '100vw';
uiContainer.style.height = '100vh';
uiContainer.style.pointerEvents = 'none';
uiContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
document.body.appendChild(uiContainer);

// --- SCREEN 1: IMPORT & PROCESS ---
const screen1 = document.createElement('div');
screen1.style.position = 'absolute';
screen1.style.top = '50%';
screen1.style.left = '50%';
screen1.style.transform = 'translate(-50%, -50%)';
screen1.style.backgroundColor = 'rgba(30, 41, 59, 0.95)';
screen1.style.padding = '30px';
screen1.style.borderRadius = '16px';
screen1.style.color = '#fff';
screen1.style.textAlign = 'center';
screen1.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5)';
screen1.style.pointerEvents = 'auto';
screen1.style.maxWidth = '400px';
screen1.style.width = '90%';

screen1.innerHTML = `
  <h2 style="margin-top: 0;">Upload 3D Model</h2>
  <p style="color: #94a3b8; font-size: 14px;">Select any .GLB, .GLTF, or .OBJ file to automatically apply POM Depth.</p>
  
  <input type="file" id="file-input" accept=".glb,.gltf,.obj" style="display: none;" />
  <button id="select-btn" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">📂 Select 3D File</button>
  
  <div id="file-name" style="margin-bottom: 15px; font-size: 13px; color: #38bdf8; word-break: break-all;">No file selected</div>
  
  <button id="process-btn" style="width: 100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; opacity: 0.5;" disabled>⚡ Process & Add POM Depth</button>
`;

uiContainer.appendChild(screen1);

// --- SCREEN 2: READY ASSET & EXPORT ---
const screen2 = document.createElement('div');
screen2.style.position = 'absolute';
screen2.style.top = '20px';
screen2.style.left = '20px';
screen2.style.display = 'none'; // Hidden initially
screen2.style.gap = '10px';
screen2.style.flexDirection = 'column';
screen2.style.pointerEvents = 'auto';

screen2.innerHTML = `
  <div style="background: rgba(15, 23, 42, 0.85); padding: 12px 18px; border-radius: 10px; color: #4ade80; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
    ✅ Asset Ready (POM Applied)
  </div>
  <button id="export-btn" style="padding: 12px 18px; background: #16a34a; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
    💾 Export in Original Format (<span id="export-format-text">GLB</span>)
  </button>
  <button id="new-model-btn" style="padding: 12px 18px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
    🔄 Import New Model
  </button>
`;

uiContainer.appendChild(screen2);

// ==========================================
// 4. EVENT LISTENERS & SCREEN SWITCHING
// ==========================================
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const processBtn = document.getElementById('process-btn');
const fileNameDisplay = document.getElementById('file-name');
const exportBtn = document.getElementById('export-btn');
const newModelBtn = document.getElementById('new-model-btn');
const exportFormatText = document.getElementById('export-format-text');

selectBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  currentFile = file;
  const ext = file.name.split('.').pop().toLowerCase();
  currentFileType = ext;

  fileNameDisplay.innerText = `Selected: ${file.name}`;
  exportFormatText.innerText = `.${ext.toUpperCase()}`;
  
  processBtn.disabled = false;
  processBtn.style.opacity = '1';
});

processBtn.addEventListener('click', () => {
  if (!currentFile) return;

  // Read and load file
  const reader = new FileReader();
  
  if (currentFileType === 'obj') {
    reader.readAsText(currentFile);
    reader.onload = (e) => {
      const loader = new OBJLoader();
      const obj = loader.parse(e.target.result);
      loadModelIntoScene(obj);
      switchToScreen2();
    };
  } else {
    // GLB / GLTF
    reader.readAsArrayBuffer(currentFile);
    reader.onload = (e) => {
      const loader = new GLTFLoader();
      loader.parse(e.target.result, '', (gltf) => {
        loadModelIntoScene(gltf.scene);
        switchToScreen2();
      });
    };
  }
});

newModelBtn.addEventListener('click', () => {
  // Clear scene and return to Screen 1
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh = null;
  }
  currentFile = null;
  currentFileType = null;
  fileInput.value = '';
  fileNameDisplay.innerText = 'No file selected';
  processBtn.disabled = true;
  processBtn.style.opacity = '0.5';

  screen2.style.display = 'none';
  screen1.style.display = 'block';
});

exportBtn.addEventListener('click', exportModelInOriginalFormat);

function switchToScreen2() {
  screen1.style.display = 'none';
  screen2.style.display = 'flex';
}

// ==========================================
// 5. AUTOMATIC HEIGHTMAP & POM PROCESSING
// ==========================================
function createHeightmapFromTexture(texture) {
  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width || 512;
  canvas.height = image.height || 512;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Luminance conversion (Grayscale)
  for (let i = 0; i < data.length; i += 4) {
    const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = avg;     // R
    data[i + 1] = avg; // G
    data[i + 2] = avg; // B
  }

  ctx.putImageData(imageData, 0, 0);

  const heightTexture = new THREE.CanvasTexture(canvas);
  heightTexture.needsUpdate = true;
  return heightTexture;
}

function loadModelIntoScene(model) {
  if (currentMesh) scene.remove(currentMesh);
  currentMesh = model;

  // Process mesh and attach POM Depth
  currentMesh.traverse((child) => {
    if (child.isMesh) {
      let baseTexture = child.material ? child.material.map : null;

      if (!baseTexture) {
        baseTexture = new THREE.TextureLoader().load(
          'https://threejs.org/examples/textures/uv_grid_opengl.jpg'
        );
      }

      const generatedHeightmap = createHeightmapFromTexture(baseTexture);

      child.material = new THREE.MeshStandardMaterial({
        map: baseTexture,
        displacementMap: generatedHeightmap,
        displacementScale: 0.1, // Controls depth intensity
        bumpMap: generatedHeightmap,
        bumpScale: 0.05,
        roughness: 0.4,
        metalness: 0.1,
      });

      child.material.needsUpdate = true;
    }
  });

  // Center model in view
  const box = new THREE.Box3().setFromObject(currentMesh);
  const center = box.getCenter(new THREE.Vector3());
  currentMesh.position.sub(center);

  scene.add(currentMesh);
}

// ==========================================
// 6. SAME-FORMAT EXPORTER (.GLB or .OBJ)
// ==========================================
function exportModelInOriginalFormat() {
  if (!currentMesh) return;

  if (currentFileType === 'obj') {
    // Export back out as .OBJ
    const exporter = new OBJExporter();
    const result = exporter.parse(currentMesh);
    const blob = new Blob([result], { type: 'text/plain' });
    downloadBlob(blob, `processed_pom_model.obj`);
  } else {
    // Export back out as .GLB / .GLTF
    const exporter = new GLTFExporter();
    exporter.parse(
      currentMesh,
      (gltf) => {
        const blob = new Blob([gltf], { type: 'application/octet-stream' });
        downloadBlob(blob, `processed_pom_model.${currentFileType || 'glb'}`);
      },
      (err) => console.error('Export Error:', err),
      { binary: true }
    );
  }
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ==========================================
// 7. ANIMATION LOOP
// ==========================================
function animate() {
  requestAnimationFrame(animate);
  if (currentMesh && screen2.style.display !== 'none') {
    currentMesh.rotation.y += 0.003; // Smooth rotation
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

