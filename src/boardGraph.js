import * as THREE from 'three';
import { HexCoord, vertexKey, edgeKey } from './hexMath.js';
import { TILE_RADIUS } from './constants.js';

export class BoardGraph {
  constructor(playerCount = 4) {
    this.playerCount = playerCount;
    this.hexes = []; // Array of { q, r, resource, number, center, id }
    this.vertices = new Map(); // id -> { id, position, adjacentEdges, adjacentHexes, building: null }
    this.edges = new Map(); // id -> { id, v1, v2, midPoint, adjacentHexes, road: null }
    this.harbors = []; // Array of { vertex1, vertex2, type, resource, ratio }
    this.robberHex = null;

    this.generateBoardLayout();
  }

  generateBoardLayout() {
    if (this.playerCount <= 4) {
      this.generateStandard4Player();
    } else {
      this.generateExpanded6Player();
    }
    this.buildGraphElements();
    this.assignHarbors();
  }

  generateStandard4Player() {
    // 19 hexes in axial coordinates with radius 2
    // Resources: 4 wood, 4 sheep, 4 wheat, 3 brick, 3 ore, 1 desert (total 19)
    const resourcePool = [
      'wood', 'wood', 'wood', 'wood',
      'sheep', 'sheep', 'sheep', 'sheep',
      'wheat', 'wheat', 'wheat', 'wheat',
      'brick', 'brick', 'brick',
      'ore', 'ore', 'ore',
      'desert'
    ];

    // Numbers: 2, 12 (one each), 3,4,5,6,8,9,10,11 (two each) = 18 numbers
    const numberPool = [
      2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12
    ];

    // Shuffle until 6 and 8 are not adjacent
    let valid = false;
    let attempts = 0;

    const coords = [];
    const radius = 2;
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        coords.push(new HexCoord(q, r));
      }
    }

    while (!valid && attempts < 1000) {
      attempts++;
      const shuffledResources = [...resourcePool].sort(() => Math.random() - 0.5);
      const shuffledNumbers = [...numberPool].sort(() => Math.random() - 0.5);

      const candidateHexes = [];
      let numIdx = 0;
      let desertHex = null;

      for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];
        const res = shuffledResources[i];
        let num = null;
        if (res !== 'desert') {
          num = shuffledNumbers[numIdx++];
        } else {
          desertHex = coord;
        }
        candidateHexes.push({
          id: i,
          q: coord.q,
          r: coord.r,
          coord: coord,
          resource: res,
          number: num,
          center: coord.toWorld()
        });
      }

      // Check red numbers (6 and 8) adjacency
      let hasAdjacentReds = false;
      const hexMap = new Map();
      candidateHexes.forEach(h => hexMap.set(h.coord.key(), h));

      for (const hex of candidateHexes) {
        if (hex.number === 6 || hex.number === 8) {
          const neighbors = hex.coord.getNeighbors();
          for (const n of neighbors) {
            const neighborHex = hexMap.get(n.key());
            if (neighborHex && (neighborHex.number === 6 || neighborHex.number === 8)) {
              hasAdjacentReds = true;
              break;
            }
          }
        }
        if (hasAdjacentReds) break;
      }

      if (!hasAdjacentReds) {
        valid = true;
        this.hexes = candidateHexes;
        this.robberHex = desertHex;
      }
    }
  }

  generateExpanded6Player() {
    // 5-6 player board expands the standard board (typically 30 land hexes: 2 extra of each resource, 1 extra desert)
    // 6 wood, 6 sheep, 6 wheat, 5 brick, 5 ore, 2 desert = 30 hexes
    const resourcePool = [
      'wood', 'wood', 'wood', 'wood', 'wood', 'wood',
      'sheep', 'sheep', 'sheep', 'sheep', 'sheep', 'sheep',
      'wheat', 'wheat', 'wheat', 'wheat', 'wheat', 'wheat',
      'brick', 'brick', 'brick', 'brick', 'brick',
      'ore', 'ore', 'ore', 'ore', 'ore',
      'desert', 'desert'
    ];

    // Numbers: 28 numbers
    const numberPool = [
      2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6,
      8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12
    ];

    // Coordinates for 5-6 players: elongated hexagon (width extended)
    const coords = [];
    // Axial coordinates forming a 30-hex elongated field
    for (let r = -3; r <= 3; r++) {
      let qStart, qEnd;
      if (r === -3) { qStart = 1; qEnd = 3; }
      else if (r === -2) { qStart = 0; qEnd = 3; }
      else if (r === -1) { qStart = -1; qEnd = 3; }
      else if (r === 0) { qStart = -2; qEnd = 3; }
      else if (r === 1) { qStart = -3; qEnd = 2; }
      else if (r === 2) { qStart = -3; qEnd = 1; }
      else { qStart = -3; qEnd = 0; } // r === 3

      for (let q = qStart; q <= qEnd; q++) {
        coords.push(new HexCoord(q, r));
      }
    }

    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 1000) {
      attempts++;
      const shuffledResources = [...resourcePool].sort(() => Math.random() - 0.5);
      const shuffledNumbers = [...numberPool].sort(() => Math.random() - 0.5);

      const candidateHexes = [];
      let numIdx = 0;
      let deserts = [];

      for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];
        const res = shuffledResources[i];
        let num = null;
        if (res !== 'desert') {
          num = shuffledNumbers[numIdx++];
        } else {
          deserts.push(coord);
        }
        candidateHexes.push({
          id: i,
          q: coord.q,
          r: coord.r,
          coord: coord,
          resource: res,
          number: num,
          center: coord.toWorld()
        });
      }

      let hasAdjacentReds = false;
      const hexMap = new Map();
      candidateHexes.forEach(h => hexMap.set(h.coord.key(), h));

      for (const hex of candidateHexes) {
        if (hex.number === 6 || hex.number === 8) {
          const neighbors = hex.coord.getNeighbors();
          for (const n of neighbors) {
            const neighborHex = hexMap.get(n.key());
            if (neighborHex && (neighborHex.number === 6 || neighborHex.number === 8)) {
              hasAdjacentReds = true;
              break;
            }
          }
        }
        if (hasAdjacentReds) break;
      }

      if (!hasAdjacentReds) {
        valid = true;
        this.hexes = candidateHexes;
        this.robberHex = deserts[0];
      }
    }
  }

  buildGraphElements() {
    this.vertices.clear();
    this.edges.clear();

    const hexMap = new Map();
    this.hexes.forEach(h => hexMap.set(h.coord.key(), h));

    for (const hex of this.hexes) {
      const corners = hex.coord.getCornerPositions(TILE_RADIUS, 0.4); // elevation top of hex
      const cornerKeys = [];

      // Register or link vertices
      for (let i = 0; i < 6; i++) {
        const pos = corners[i];
        const vKey = vertexKey(pos);
        cornerKeys.push(vKey);

        if (!this.vertices.has(vKey)) {
          this.vertices.set(vKey, {
            id: vKey,
            position: pos.clone(),
            adjacentEdges: [],
            adjacentHexes: [],
            building: null // { type: 'settlement' | 'city', playerId: number }
          });
        }
        const vert = this.vertices.get(vKey);
        if (!vert.adjacentHexes.includes(hex)) {
          vert.adjacentHexes.push(hex);
        }
      }

      // Register or link edges
      for (let i = 0; i < 6; i++) {
        const v1Key = cornerKeys[i];
        const v2Key = cornerKeys[(i + 1) % 6];
        const eKey = edgeKey(v1Key, v2Key);

        if (!this.edges.has(eKey)) {
          const v1 = this.vertices.get(v1Key);
          const v2 = this.vertices.get(v2Key);
          const mid = new THREE.Vector3().addVectors(v1.position, v2.position).multiplyScalar(0.5);

          const edge = {
            id: eKey,
            v1Key: v1Key,
            v2Key: v2Key,
            midPoint: mid,
            adjacentHexes: [],
            road: null // { playerId: number }
          };
          this.edges.set(eKey, edge);

          v1.adjacentEdges.push(edge);
          v2.adjacentEdges.push(edge);
        }

        const edgeObj = this.edges.get(eKey);
        if (!edgeObj.adjacentHexes.includes(hex)) {
          edgeObj.adjacentHexes.push(hex);
        }
      }
    }
  }

  assignHarbors() {
    // Collect perimeter edges (edges having only 1 adjacent hex)
    const coastalEdges = Array.from(this.edges.values()).filter(e => e.adjacentHexes.length === 1);
    
    // In standard 4-player Catan, there are 9 harbors: 4 "3:1 Any", and 1 each of 2:1 Wood, Brick, Sheep, Wheat, Ore.
    const harborTypes = [
      { type: '3:1', resource: 'any', ratio: 3 },
      { type: '3:1', resource: 'any', ratio: 3 },
      { type: '3:1', resource: 'any', ratio: 3 },
      { type: '3:1', resource: 'any', ratio: 3 },
      { type: '2:1', resource: 'wood', ratio: 2 },
      { type: '2:1', resource: 'brick', ratio: 2 },
      { type: '2:1', resource: 'sheep', ratio: 2 },
      { type: '2:1', resource: 'wheat', ratio: 2 },
      { type: '2:1', resource: 'ore', ratio: 2 }
    ];

    if (this.playerCount > 4) {
      // 5-6 player adds 2 more harbors: 1 "3:1 Any" and 1 "2:1 Sheep"
      harborTypes.push(
        { type: '3:1', resource: 'any', ratio: 3 },
        { type: '2:1', resource: 'sheep', ratio: 2 }
      );
    }

    // Sort coastal edges angularly around center for evenly spaced harbor distribution
    coastalEdges.sort((a, b) => {
      const angleA = Math.atan2(a.midPoint.z, a.midPoint.x);
      const angleB = Math.atan2(b.midPoint.z, b.midPoint.x);
      return angleA - angleB;
    });

    const step = Math.floor(coastalEdges.length / harborTypes.length);
    this.harbors = [];

    for (let i = 0; i < harborTypes.length; i++) {
      const edgeIndex = (i * step) % coastalEdges.length;
      const edge = coastalEdges[edgeIndex];
      const hData = {
        ...harborTypes[i],
        edgeId: edge.id,
        v1Key: edge.v1Key,
        v2Key: edge.v2Key,
        position: edge.midPoint.clone(),
        hexCenter: edge.adjacentHexes[0].center
      };
      this.harbors.push(hData);

      // Attach harbor info to the two vertices
      const v1 = this.vertices.get(edge.v1Key);
      const v2 = this.vertices.get(edge.v2Key);
      if (v1) v1.harbor = hData;
      if (v2) v2.harbor = hData;
    }
  }

  // Get vertex neighbors
  getNeighborVertices(vKey) {
    const v = this.vertices.get(vKey);
    if (!v) return [];
    const neighbors = [];
    for (const edge of v.adjacentEdges) {
      const otherKey = edge.v1Key === vKey ? edge.v2Key : edge.v1Key;
      const otherVert = this.vertices.get(otherKey);
      if (otherVert) neighbors.push(otherVert);
    }
    return neighbors;
  }
}
