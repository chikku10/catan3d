import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(container) {
    this.container = container;

    // Renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.currentResolutionScale = 1.0;
    this.updatePixelDensity();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e141b);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Tabletop isometric angle
    this.camera.position.set(0, 32, 28);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 65;
    this.controls.target.set(0, 0, 0);

    // Raycaster & Mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.setupResize();
    this.animate();
  }

  updatePixelDensity() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.currentResolutionScale;
    this.renderer.setPixelRatio(dpr);
  }

  setResolutionScale(scale) {
    this.currentResolutionScale = scale;
    this.updatePixelDensity();
  }

  setShadowQuality(enabled) {
    this.renderer.shadowMap.enabled = enabled;
    if (this.sunLight) {
      this.sunLight.castShadow = enabled;
    }
  }

  setupLighting() {
    // 1. Warm Sun / Key Light with optimized shadow map (1024x1024)
    this.sunLight = new THREE.DirectionalLight(0xfff6ea, 2.4);
    this.sunLight.position.set(24, 45, 18);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 90;
    const shadowD = 24;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.radius = 2.0;
    this.scene.add(this.sunLight);

    // 2. Cool Sky Fill Light for crisp ambient occlusion feel
    const fillLight = new THREE.DirectionalLight(0x70a0d0, 0.8);
    fillLight.position.set(-20, 25, -20);
    this.scene.add(fillLight);

    // 3. Subtle warm rim/backlight
    const rimLight = new THREE.DirectionalLight(0xffdd99, 0.5);
    rimLight.position.set(0, 15, -30);
    this.scene.add(rimLight);

    // 4. Soft Hemisphere ambient light
    const hemiLight = new THREE.HemisphereLight(0xedf2f7, 0x1a202c, 0.7);
    this.scene.add(hemiLight);
  }

  setCameraView(mode = 'isometric') {
    const targetPos = new THREE.Vector3();
    if (mode === 'topdown') {
      targetPos.set(0, 42, 0.01);
    } else if (mode === 'closeup') {
      targetPos.set(0, 18, 16);
    } else {
      // Isometric default
      targetPos.set(0, 32, 28);
    }

    const startPos = this.camera.position.clone();
    const duration = 500;
    const startTime = performance.now();

    const animateCam = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.set(0, 0, 0);
      if (t < 1) requestAnimationFrame(animateCam);
    };
    requestAnimationFrame(animateCam);
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.updatePixelDensity();
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
