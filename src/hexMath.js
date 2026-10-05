import * as THREE from 'three';
import { TILE_RADIUS } from './constants.js';

/**
 * Axial Coordinates (q, r)
 * Cube Coordinates (q, r, s) where q + r + s = 0
 * Flat-topped or pointy-topped:
 * In Catan, pointy-topped hexes (corners top and bottom, flat sides left and right)
 * OR flat-topped (flat edge top, corners left and right).
 * Pointy-topped hexes:
 * width = sqrt(3) * radius
 * height = 2 * radius
 * x = radius * sqrt(3) * (q + r / 2)
 * z = radius * 3/2 * r
 */

export class HexCoord {
  constructor(q, r) {
    this.q = q;
    this.r = r;
    this.s = -q - r;
  }

  key() {
    return `${this.q},${this.r}`;
  }

  static fromKey(key) {
    const [q, r] = key.split(',').map(Number);
    return new HexCoord(q, r);
  }

  toWorld(radius = TILE_RADIUS) {
    // Pointy-topped hex layout
    const x = radius * Math.sqrt(3) * (this.q + this.r / 2);
    const z = radius * (3 / 2) * this.r;
    return new THREE.Vector3(x, 0, z);
  }

  // Get the 6 world-space corner vertices of this hex
  getCornerPositions(radius = TILE_RADIUS, y = 0) {
    const center = this.toWorld(radius);
    const corners = [];
    for (let i = 0; i < 6; i++) {
      // Pointy-topped angles: 30, 90, 150, 210, 270, 330 degrees
      const angle = (Math.PI / 180) * (60 * i + 30);
      const cx = center.x + radius * Math.cos(angle);
      const cz = center.z + radius * Math.sin(angle);
      corners.push(new THREE.Vector3(cx, y, cz));
    }
    return corners;
  }

  // 6 Neighboring hex coordinates
  getNeighbors() {
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];
    return directions.map(([dq, dr]) => new HexCoord(this.q + dq, this.r + dr));
  }
}

/**
 * Vertex key rounder to unify shared vertices across adjacent hexes
 */
export function vertexKey(v, precision = 2) {
  const f = Math.pow(10, precision);
  return `${Math.round(v.x * f) / f},${Math.round(v.z * f) / f}`;
}

/**
 * Edge key to unify shared edges between two vertex keys
 */
export function edgeKey(v1Key, v2Key) {
  return v1Key < v2Key ? `${v1Key}|${v2Key}` : `${v2Key}|${v1Key}`;
}
