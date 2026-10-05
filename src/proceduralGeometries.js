import * as THREE from 'three';
import { TILE_RADIUS, TILE_HEIGHT, BEVEL_SIZE, HEX_GAP } from './constants.js';

/**
 * Creates a beveled hexagonal prism geometry with top face planar UV mapping (0..1)
 * so illustration textures map squarely onto the top face.
 */
export function createBeveledHexGeometry(radius = TILE_RADIUS - HEX_GAP, height = TILE_HEIGHT, bevel = BEVEL_SIZE) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateX(Math.PI / 2);

  // Compute clean normalized UV mapping for top face centered at (0.5, 0.5)
  const posAttr = geom.attributes.position;
  const uvAttr = geom.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    // Map bounds [-radius, radius] to [0.05, 0.95]
    const u = 0.5 + (x / (radius * 2.2));
    const v = 0.5 + (z / (radius * 2.2));
    uvAttr.setXY(i, u, v);
  }
  uvAttr.needsUpdate = true;

  geom.computeVertexNormals();
  return geom;
}

/**
 * Clean Settlement: Traditional cottage home with walls and gabled roof
 */
export function createSettlementGeometry() {
  const body = new THREE.BoxGeometry(0.85, 0.7, 0.85);
  body.translate(0, 0.35, 0);

  const roof = new THREE.CylinderGeometry(0.6, 0.6, 0.9, 3);
  roof.rotateZ(Math.PI / 2);
  roof.rotateY(Math.PI / 2);
  roof.scale(0.85, 0.75, 0.85);
  roof.translate(0, 0.95, 0);

  return mergeBufferGeometries([body, roof]);
}

/**
 * Clean City: Upgraded settlement with fortified watchtower / wall extension
 */
export function createCityGeometry() {
  // Main house wing (same proportion as settlement)
  const house = new THREE.BoxGeometry(0.85, 0.7, 0.85);
  house.translate(0.4, 0.35, 0);

  const houseRoof = new THREE.CylinderGeometry(0.6, 0.6, 0.9, 3);
  houseRoof.rotateZ(Math.PI / 2);
  houseRoof.rotateY(Math.PI / 2);
  houseRoof.scale(0.85, 0.75, 0.85);
  houseRoof.translate(0.4, 0.95, 0);

  // Fortress tower with battlements
  const tower = new THREE.BoxGeometry(0.9, 1.45, 0.9);
  tower.translate(-0.45, 0.725, 0);

  const spire = new THREE.ConeGeometry(0.65, 0.7, 4);
  spire.rotateY(Math.PI / 4);
  spire.translate(-0.45, 1.8, 0);

  return mergeBufferGeometries([house, houseRoof, tower, spire]);
}

/**
 * Clean road geometry: smooth beveled beam
 */
export function createRoadGeometry() {
  const length = 2.0;
  const width = 0.38;
  const height = 0.22;
  const geom = new THREE.BoxGeometry(length, height, width);
  geom.translate(0, height / 2, 0);
  return geom;
}

/**
 * Procedural Robber figure: stylized pawn
 */
export function createRobberGeometry() {
  const base = new THREE.CylinderGeometry(0.65, 0.75, 0.35, 16);
  base.translate(0, 0.175, 0);

  const body = new THREE.CylinderGeometry(0.35, 0.62, 1.5, 16);
  body.translate(0, 1.0, 0);

  const head = new THREE.SphereGeometry(0.42, 16, 16);
  head.translate(0, 1.85, 0);

  return mergeBufferGeometries([base, body, head]);
}

/**
 * Procedural Dice geometry with rounded corners
 */
export function createDiceGeometry(size = 0.9) {
  return new THREE.BoxGeometry(size, size, size, 2, 2, 2);
}

function mergeBufferGeometries(geometries) {
  let totalVertices = 0;
  for (const g of geometries) {
    const gNonIndexed = g.toNonIndexed();
    totalVertices += gNonIndexed.attributes.position.count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);

  let vertexOffset = 0;
  for (const g of geometries) {
    const gNonIndexed = g.toNonIndexed();
    const pos = gNonIndexed.attributes.position.array;
    const norm = gNonIndexed.attributes.normal.array;

    positions.set(pos, vertexOffset * 3);
    if (norm) normals.set(norm, vertexOffset * 3);
    vertexOffset += gNonIndexed.attributes.position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.computeVertexNormals();
  return merged;
}
