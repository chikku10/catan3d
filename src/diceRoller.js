import * as THREE from 'three';
import { createDiceGeometry } from './proceduralGeometries.js';

/**
 * 3D Animated Dice in the tabletop world space
 * Positioned on the left side of the board table for clear visibility outside the hex field
 */
export class DiceRoller {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.dice1 = this.createDie();
    this.dice2 = this.createDie();

    // Positioned cleanly on the left tabletop tray outside the island
    this.basePos1 = new THREE.Vector3(-14.5, 1.2, 2.0);
    this.basePos2 = new THREE.Vector3(-14.5, 1.2, 5.2);

    this.dice1.position.copy(this.basePos1);
    this.dice2.position.copy(this.basePos2);

    this.group.add(this.dice1);
    this.group.add(this.dice2);

    this.isRolling = false;
  }

  createDie() {
    const size = 1.7; // Prominent size for clear viewing
    const geom = createDiceGeometry(size);

    const materials = [];
    const faceValues = [1, 6, 2, 5, 3, 4]; // BoxGeometry face mapping (+x, -x, +y, -y, +z, -z)

    for (const val of faceValues) {
      const tex = this.createDieFaceTexture(val);
      materials.push(new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.25,
        metalness: 0.05
      }));
    }

    const mesh = new THREE.Mesh(geom, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { faceValues };
    return mesh;
  }

  createDieFaceTexture(number, size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Ivory finish
    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(0, 0, size, size);

    // Subtle chamfer rim
    ctx.strokeStyle = '#e2d9cc';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, size - 14, size - 14);

    const dotColor = (number === 1 || number === 6) ? '#d90429' : '#1e232a';
    ctx.fillStyle = dotColor;

    const c = size / 2;
    const left = size * 0.28;
    const right = size * 0.72;
    const top = size * 0.28;
    const bot = size * 0.72;
    const dotR = size * 0.095;

    const drawDot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    };

    if (number === 1) {
      drawDot(c, c);
    } else if (number === 2) {
      drawDot(left, top);
      drawDot(right, bot);
    } else if (number === 3) {
      drawDot(left, top);
      drawDot(c, c);
      drawDot(right, bot);
    } else if (number === 4) {
      drawDot(left, top);
      drawDot(right, top);
      drawDot(left, bot);
      drawDot(right, bot);
    } else if (number === 5) {
      drawDot(left, top);
      drawDot(right, top);
      drawDot(c, c);
      drawDot(left, bot);
      drawDot(right, bot);
    } else if (number === 6) {
      drawDot(left, top);
      drawDot(right, top);
      drawDot(left, c);
      drawDot(right, c);
      drawDot(left, bot);
      drawDot(right, bot);
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  getRotationForValue(val) {
    const euler = new THREE.Euler();
    switch (val) {
      case 1: euler.set(0, 0, Math.PI / 2); break;
      case 6: euler.set(0, 0, -Math.PI / 2); break;
      case 2: euler.set(0, 0, 0); break;
      case 5: euler.set(Math.PI, 0, 0); break;
      case 3: euler.set(-Math.PI / 2, 0, 0); break;
      case 4: euler.set(Math.PI / 2, 0, 0); break;
    }
    return euler;
  }

  roll(die1Val, die2Val, onComplete) {
    if (this.isRolling) return;
    this.isRolling = true;

    const d1TargetRot = this.getRotationForValue(die1Val);
    const d2TargetRot = this.getRotationForValue(die2Val);

    const spins1 = new THREE.Euler(
      d1TargetRot.x + (Math.floor(Math.random() * 2) + 2) * Math.PI * 2,
      d1TargetRot.y + (Math.floor(Math.random() * 2) + 2) * Math.PI * 2,
      d1TargetRot.z + (Math.floor(Math.random() * 2) + 2) * Math.PI * 2
    );

    const spins2 = new THREE.Euler(
      d2TargetRot.x + (Math.floor(Math.random() * 2) + 2) * Math.PI * 2,
      d2TargetRot.y + (Math.floor(Math.random() * 2) + 2) * Math.PI * 2,
      d2TargetRot.z + (Math.floor(Math.random() * 2) + 2) * Math.PI * 2
    );

    const startRot1 = this.dice1.rotation.clone();
    const startRot2 = this.dice2.rotation.clone();

    const startPos1 = this.basePos1.clone();
    const startPos2 = this.basePos2.clone();

    const duration = 850;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const bounce = Math.sin(progress * Math.PI) * 4.5 * (1 - progress);
      this.dice1.position.y = startPos1.y + bounce;
      this.dice2.position.y = startPos2.y + bounce;

      this.dice1.position.z = startPos1.z + Math.sin(progress * Math.PI * 4) * 0.4 * (1 - progress);
      this.dice2.position.z = startPos2.z + Math.sin(progress * Math.PI * 4 + 1) * 0.4 * (1 - progress);

      this.dice1.rotation.x = THREE.MathUtils.lerp(startRot1.x, spins1.x, ease);
      this.dice1.rotation.y = THREE.MathUtils.lerp(startRot1.y, spins1.y, ease);
      this.dice1.rotation.z = THREE.MathUtils.lerp(startRot1.z, spins1.z, ease);

      this.dice2.rotation.x = THREE.MathUtils.lerp(startRot2.x, spins2.x, ease);
      this.dice2.rotation.y = THREE.MathUtils.lerp(startRot2.y, spins2.y, ease);
      this.dice2.rotation.z = THREE.MathUtils.lerp(startRot2.z, spins2.z, ease);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.dice1.position.copy(this.basePos1);
        this.dice2.position.copy(this.basePos2);
        this.dice1.rotation.copy(d1TargetRot);
        this.dice2.rotation.copy(d2TargetRot);
        this.isRolling = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }
}
