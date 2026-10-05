import * as THREE from 'three';
import { COLORS } from './constants.js';

/**
 * Procedural Catan hex illustration generator using HTML5 Canvas.
 * Generates unmistakable, rich hand-painted style artwork for each hex:
 * - Mountain (Ore): Dramatic snow-capped mountain peaks rising against cloudy sky with silver ore seams
 * - Forest (Wood): Dense evergreen pine woods with winding woodland path
 * - Clay Quarry (Brick): Terraced clay cliff quarries with terracotta bricks and strata
 * - Pasture (Sheep): Lush green meadow with grazing fluffy sheep flock
 * - Fields (Wheat): Golden sun-drenched wheat fields and crop bundles
 * - Desert: Rolling desert sand dunes with sun glare and oasis
 * - Water: Coastal ocean surf with foam ripples
 */

export function createOreTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Cool mountain sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, size);
  skyGrad.addColorStop(0, '#778da9');
  skyGrad.addColorStop(0.35, '#a3b18a');
  skyGrad.addColorStop(0.8, '#415a77');
  skyGrad.addColorStop(1, '#1b263b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, size, size);

  // Deep mountain silhouettes in background
  ctx.fillStyle = 'rgba(27, 38, 59, 0.65)';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.lineTo(size * 0.25, size * 0.35);
  ctx.lineTo(size * 0.5, size * 0.65);
  ctx.lineTo(size * 0.8, size * 0.3);
  ctx.lineTo(size, size * 0.7);
  ctx.lineTo(size, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.fill();

  // Central massive mountain peak
  const drawDetailedPeak = (cx, cy, w, h, shadowColor, lightColor) => {
    // Left sunlit face
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx, cy + h * 0.6);
    ctx.lineTo(cx - w, cy + h * 0.6);
    ctx.closePath();
    ctx.fill();

    // Right shadow face
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w, cy + h * 0.6);
    ctx.lineTo(cx, cy + h * 0.6);
    ctx.closePath();
    ctx.fill();

    // Snow cap on peak
    const snowH = h * 0.45;
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w * 0.35, cy - h + snowH);
    ctx.lineTo(cx + w * 0.15, cy - h + snowH * 0.8);
    ctx.lineTo(cx, cy - h + snowH * 1.1);
    ctx.lineTo(cx - w * 0.2, cy - h + snowH * 0.85);
    ctx.lineTo(cx - w * 0.35, cy - h + snowH);
    ctx.closePath();
    ctx.fill();

    // Snow shadow on right side of snow
    ctx.fillStyle = 'rgba(160, 185, 205, 0.5)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w * 0.35, cy - h + snowH);
    ctx.lineTo(cx, cy - h + snowH * 1.1);
    ctx.closePath();
    ctx.fill();
  };

  // Draw 3 prominent peaks
  drawDetailedPeak(size * 0.25, size * 0.62, 110, 160, '#343a40', '#6c757d');
  drawDetailedPeak(size * 0.75, size * 0.65, 120, 170, '#212529', '#5a6268');
  drawDetailedPeak(size * 0.5, size * 0.5, 140, 210, '#1f2421', '#747d86'); // Main center peak

  // Mineral ore veins (glittering turquoise and silver)
  for (let i = 0; i < 28; i++) {
    const vx = size * 0.2 + Math.random() * size * 0.6;
    const vy = size * 0.45 + Math.random() * size * 0.45;
    ctx.strokeStyle = i % 2 === 0 ? '#48cae4' : '#e0e1dd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + 14, vy + 7);
    ctx.lineTo(vx + 26, vy + 4);
    ctx.stroke();
  }

  // Ore rocks at the base
  for (let i = 0; i < 25; i++) {
    const rx = Math.random() * size;
    const ry = size * 0.75 + Math.random() * (size * 0.25);
    ctx.fillStyle = i % 3 === 0 ? '#495057' : '#343a40';
    ctx.beginPath();
    ctx.arc(rx, ry, 6 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWoodTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Deep forest canopy ground
  const grad = ctx.createRadialGradient(size/2, size/2, 40, size/2, size/2, size * 0.75);
  grad.addColorStop(0, '#2d6a4f');
  grad.addColorStop(0.65, '#1b4332');
  grad.addColorStop(1, '#081c15');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Winding woodland trail
  ctx.strokeStyle = '#7f5539';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(size * 0.1, size * 0.9);
  ctx.bezierCurveTo(size * 0.4, size * 0.6, size * 0.6, size * 0.5, size * 0.85, size * 0.15);
  ctx.stroke();

  ctx.strokeStyle = '#9c6644';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Dense evergreen pine trees
  const drawPineTree = (x, y, s) => {
    ctx.fillStyle = 'rgba(8, 28, 21, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.3, y + s * 0.5, s * 0.6, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    const tiers = [
      { dy: s * 0.3, w: s * 0.75, col: '#1b4332' },
      { dy: 0, w: s * 0.6, col: '#2d6a4f' },
      { dy: -s * 0.3, w: s * 0.45, col: '#40916c' },
      { dy: -s * 0.6, w: s * 0.3, col: '#52b788' }
    ];

    tiers.forEach(t => {
      ctx.fillStyle = t.col;
      ctx.beginPath();
      ctx.moveTo(x, y + t.dy - s * 0.4);
      ctx.lineTo(x + t.w, y + t.dy + s * 0.2);
      ctx.lineTo(x - t.w, y + t.dy + s * 0.2);
      ctx.closePath();
      ctx.fill();
    });
  };

  const treePositions = [
    [120, 140, 28], [180, 110, 34], [260, 130, 32], [340, 120, 26],
    [100, 240, 36], [160, 220, 40], [240, 200, 44], [380, 210, 30],
    [90, 350, 30], [150, 360, 34], [320, 330, 38], [400, 340, 28],
    [210, 380, 32], [280, 410, 30], [350, 430, 26], [130, 440, 24]
  ];
  treePositions.forEach(([x, y, s]) => drawPineTree(x, y, s));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createBrickTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#9c3d1b');
  grad.addColorStop(0.5, '#c85a32');
  grad.addColorStop(1, '#78290f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Terraced quarry strata
  const strata = [
    { y: 80, amp: 22, freq: 0.015, col: '#d96d43' },
    { y: 160, amp: 28, freq: 0.018, col: '#b24c25' },
    { y: 240, amp: 26, freq: 0.014, col: '#e07a5f' },
    { y: 330, amp: 30, freq: 0.02, col: '#8f2d14' },
    { y: 420, amp: 24, freq: 0.016, col: '#d96d43' }
  ];

  strata.forEach(st => {
    ctx.strokeStyle = 'rgba(40, 10, 5, 0.45)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const y = st.y + Math.sin(x * st.freq) * st.amp + 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = st.col;
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const y = st.y + Math.sin(x * st.freq) * st.amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Clay brick blocks
  for (let i = 0; i < 70; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const rw = 12 + Math.random() * 20;
    const rh = 7 + Math.random() * 12;
    ctx.fillStyle = Math.random() > 0.5 ? '#b24c25' : '#d96d43';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(rx, ry, rw, rh);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createSheepTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#55a630');
  grad.addColorStop(0.4, '#70a83b');
  grad.addColorStop(0.8, '#588157');
  grad.addColorStop(1, '#386641');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Grazing sheep flock
  const drawSheep = (x, y, scale = 1.0) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 8 * scale, 12 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8f9fa';
    const puffs = [[-6, 0, 7], [0, -3, 8], [6, 0, 7], [3, 4, 7], [-3, 4, 7]];
    puffs.forEach(([px, py, pr]) => {
      ctx.beginPath();
      ctx.arc(x + px * scale, y + py * scale, pr * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.ellipse(x + 10 * scale, y + 2 * scale, 4.5 * scale, 3.5 * scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  const sheepFlock = [
    [140, 160, 1.3], [180, 190, 1.1], [210, 150, 1.4],
    [320, 220, 1.3], [360, 250, 1.2], [390, 210, 1.0],
    [220, 340, 1.4], [260, 370, 1.2], [180, 390, 1.1]
  ];
  sheepFlock.forEach(([x, y, s]) => drawSheep(x, y, s));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWheatTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#dda15e');
  grad.addColorStop(0.5, '#bc6c25');
  grad.addColorStop(1, '#99582a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Crop contour rows
  for (let r = 0; r < size; r += 14) {
    ctx.strokeStyle = 'rgba(100, 50, 15, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, r + 4);
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, r + 4 + Math.sin(x * 0.04) * 3);
    }
    ctx.stroke();

    ctx.strokeStyle = r % 28 === 0 ? '#ffe6a7' : '#f4a261';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, r);
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, r + Math.sin(x * 0.04) * 3);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createDesertTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#e9c46a');
  grad.addColorStop(0.5, '#ddb892');
  grad.addColorStop(1, '#b08968');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const dunes = [
    { y: 100, amp: 35, freq: 0.015 },
    { y: 220, amp: 40, freq: 0.012 },
    { y: 340, amp: 45, freq: 0.014 }
  ];

  dunes.forEach(d => {
    ctx.strokeStyle = 'rgba(127, 85, 57, 0.4)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const y = d.y + Math.sin(x * d.freq) * d.amp + 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#fff1e6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const y = d.y + Math.sin(x * d.freq) * d.amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWaterTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size/2, size/2, 20, size/2, size/2, size * 0.7);
  grad.addColorStop(0, '#1d4e89');
  grad.addColorStop(0.7, '#0f2b46');
  grad.addColorStop(1, '#081c2f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(217, 237, 146, 0.22)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 45; i++) {
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 30) {
      ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 6);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createNumberTokenTexture(number, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const center = size / 2;
  const radius = size * 0.44;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#fdfbf7';
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = '#d4cbb3';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, radius - 10, 0, Math.PI * 2);
  ctx.stroke();

  const isRed = (number === 6 || number === 8);
  ctx.fillStyle = isRed ? '#d90429' : '#2b2d42';

  ctx.font = 'bold 150px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), center, center - 24);

  const dotCounts = { 2: 1, 12: 1, 3: 2, 11: 2, 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 };
  const dots = dotCounts[number] || 0;
  const dotSpacing = 24;
  const startX = center - ((dots - 1) * dotSpacing) / 2;
  const dotY = center + 78;

  ctx.fillStyle = isRed ? '#d90429' : '#2b2d42';
  for (let i = 0; i < dots; i++) {
    ctx.beginPath();
    ctx.arc(startX + i * dotSpacing, dotY, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export function createHarborTexture(harbor, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e242c';
  ctx.beginPath();
  ctx.roundRect(10, 10, size - 20, size - 20, 24);
  ctx.fill();

  ctx.strokeStyle = '#fcc419';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(harbor.type, size / 2, size / 2 - 20);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#ffd166';
  const label = harbor.resource === 'any' ? 'ANY' : harbor.resource.toUpperCase();
  ctx.fillText(label, size / 2, size / 2 + 45);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
