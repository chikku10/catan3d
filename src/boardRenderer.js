import * as THREE from 'three';
import {
  createBeveledHexGeometry,
  createSettlementGeometry,
  createCityGeometry,
  createRoadGeometry,
  createRobberGeometry
} from './proceduralGeometries.js';
import { createNumberTokenTexture, createHarborTexture } from './proceduralTextures.js';
import { TILE_RADIUS, TILE_HEIGHT } from './constants.js';

export class BoardRenderer {
  constructor(scene, boardGraph, materialLib) {
    this.scene = scene;
    this.graph = boardGraph;
    this.materials = materialLib;

    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    this.hexMeshes = new Map();
    this.vertexInteractiveObjects = new Map();
    this.edgeInteractiveObjects = new Map();
    this.hexInteractiveObjects = new Map();

    this.buildingMeshes = new Map(); // vKey -> mesh
    this.roadMeshes = new Map(); // eKey -> mesh
    this.robberMesh = null;

    this.sharedHexGeometry = createBeveledHexGeometry();
    this.settlementGeom = createSettlementGeometry();
    this.cityGeom = createCityGeometry();
    this.roadGeom = createRoadGeometry();
    this.robberGeom = createRobberGeometry();

    this.render();
  }

  render() {
    this.clear();
    this.renderOceanBase();
    this.renderHexes();
    this.renderNumberTokens();
    this.renderHarbors();
    this.renderRobber();
    this.buildInteractionAnchors();
  }

  clear() {
    while (this.boardGroup.children.length > 0) {
      const obj = this.boardGroup.children[0];
      this.boardGroup.remove(obj);
    }
    this.hexMeshes.clear();
    this.vertexInteractiveObjects.clear();
    this.edgeInteractiveObjects.clear();
    this.hexInteractiveObjects.clear();
    this.buildingMeshes.clear();
    this.roadMeshes.clear();
  }

  renderOceanBase() {
    // Beautiful oceanic perimeter frame with subtle stepped water rim
    const oceanRadius = this.graph.playerCount > 4 ? 26 : 22;
    const oceanGeom = new THREE.CylinderGeometry(oceanRadius, oceanRadius + 1.5, 0.7, 64);
    const oceanMesh = new THREE.Mesh(oceanGeom, this.materials.materials.water);
    oceanMesh.position.y = -0.36;
    oceanMesh.receiveShadow = true;
    this.boardGroup.add(oceanMesh);

    // Deep wooden / obsidian game table mat underneath
    const tableGeom = new THREE.CylinderGeometry(oceanRadius + 3, oceanRadius + 3.5, 0.4, 64);
    const tableMesh = new THREE.Mesh(tableGeom, this.materials.materials.frame);
    tableMesh.position.y = -0.72;
    tableMesh.receiveShadow = true;
    this.boardGroup.add(tableMesh);
  }

  renderHexes() {
    for (const hex of this.graph.hexes) {
      const mat = this.materials.getHexMaterial(hex.resource);
      const mesh = new THREE.Mesh(this.sharedHexGeometry, mat);
      mesh.position.set(hex.center.x, 0, hex.center.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'hex', hex: hex };

      this.boardGroup.add(mesh);
      this.hexMeshes.set(hex.coord.key(), mesh);
    }
  }

  renderNumberTokens() {
    const tokenGeom = new THREE.CylinderGeometry(1.05, 1.05, 0.12, 32);

    for (const hex of this.graph.hexes) {
      if (hex.resource === 'desert' || !hex.number) continue;

      const tokenTexture = createNumberTokenTexture(hex.number);
      const tokenMat = new THREE.MeshStandardMaterial({
        map: tokenTexture,
        roughness: 0.35,
        metalness: 0.05
      });

      const tokenMesh = new THREE.Mesh(tokenGeom, tokenMat);
      tokenMesh.position.set(hex.center.x, TILE_HEIGHT + 0.06, hex.center.z);
      tokenMesh.castShadow = true;
      tokenMesh.receiveShadow = true;
      tokenMesh.userData = { type: 'numberToken', hex: hex };

      this.boardGroup.add(tokenMesh);
    }
  }

  renderHarbors() {
    const harborPostGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });

    for (const harbor of this.graph.harbors) {
      // Harbor pier/dock: a small wooden plank pointing towards water
      const dir = new THREE.Vector3().subVectors(harbor.position, harbor.hexCenter).normalize();
      const pierPos = harbor.position.clone().add(dir.clone().multiplyScalar(0.75));

      const pierGeom = new THREE.BoxGeometry(0.4, 0.15, 1.2);
      const pierMesh = new THREE.Mesh(pierGeom, postMat);
      pierMesh.position.set(pierPos.x, 0.15, pierPos.z);
      pierMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      pierMesh.castShadow = true;
      pierMesh.receiveShadow = true;
      this.boardGroup.add(pierMesh);

      // Harbor Badge Billboard
      const badgeTex = createHarborTexture(harbor);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: badgeTex,
        transparent: true,
        side: THREE.DoubleSide
      });
      const badgeGeom = new THREE.PlaneGeometry(1.2, 1.2);
      const badgeMesh = new THREE.Mesh(badgeGeom, badgeMat);
      badgeMesh.position.set(pierPos.x, 1.1, pierPos.z);
      badgeMesh.rotation.x = -Math.PI / 4; // Tilted slightly towards camera
      badgeMesh.renderOrder = 2;
      this.boardGroup.add(badgeMesh);
    }
  }

  renderRobber() {
    if (this.robberMesh) {
      this.boardGroup.remove(this.robberMesh);
    }

    this.robberMesh = new THREE.Mesh(this.robberGeom, this.materials.materials.robber);
    this.robberMesh.castShadow = true;
    this.robberMesh.receiveShadow = true;
    this.robberMesh.scale.set(1.15, 1.15, 1.15);

    const targetCenter = this.graph.robberHex ? this.graph.robberHex.toWorld() : new THREE.Vector3();
    this.robberMesh.position.set(targetCenter.x, TILE_HEIGHT, targetCenter.z);
    this.boardGroup.add(this.robberMesh);
  }

  moveRobber(targetCoord, onComplete) {
    this.graph.robberHex = targetCoord;
    const targetPos = targetCoord.toWorld();
    targetPos.y = TILE_HEIGHT;

    // Smooth arc animation
    const startPos = this.robberMesh.position.clone();
    const duration = 450;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      this.robberMesh.position.lerpVectors(startPos, targetPos, ease);
      // Parabolic jump arc
      this.robberMesh.position.y = TILE_HEIGHT + Math.sin(progress * Math.PI) * 2.2;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.robberMesh.position.copy(targetPos);
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  buildInteractionAnchors() {
    // 1. Invisible or subtly glowing hit-spheres for Vertices (Settlements / Cities)
    const vertHitGeom = new THREE.SphereGeometry(0.55, 12, 12);
    for (const [vKey, vert] of this.graph.vertices) {
      const hitMesh = new THREE.Mesh(vertHitGeom, this.materials.materials.highlightVertex.clone());
      hitMesh.position.set(vert.position.x, TILE_HEIGHT + 0.15, vert.position.z);
      hitMesh.visible = false;
      hitMesh.userData = { type: 'vertex', vKey: vKey, vertex: vert };
      this.boardGroup.add(hitMesh);
      this.vertexInteractiveObjects.set(vKey, hitMesh);
    }

    // 2. Hit-boxes for Edges (Roads)
    const edgeHitGeom = new THREE.BoxGeometry(2.0, 0.45, 0.6);
    for (const [eKey, edge] of this.graph.edges) {
      const hitMesh = new THREE.Mesh(edgeHitGeom, this.materials.materials.highlightEdge.clone());
      hitMesh.position.set(edge.midPoint.x, TILE_HEIGHT + 0.12, edge.midPoint.z);

      const v1 = this.graph.vertices.get(edge.v1Key);
      const v2 = this.graph.vertices.get(edge.v2Key);
      const dir = new THREE.Vector3().subVectors(v2.position, v1.position).normalize();
      hitMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

      hitMesh.visible = false;
      hitMesh.userData = { type: 'edge', eKey: eKey, edge: edge };
      this.boardGroup.add(hitMesh);
      this.edgeInteractiveObjects.set(eKey, hitMesh);
    }

    // 3. Hex interactive meshes for Robber placement
    for (const hex of this.graph.hexes) {
      const hexHitGeom = new THREE.CylinderGeometry(TILE_RADIUS * 0.85, TILE_RADIUS * 0.85, 0.3, 6);
      const hitMesh = new THREE.Mesh(hexHitGeom, this.materials.materials.highlightHex.clone());
      hitMesh.position.set(hex.center.x, TILE_HEIGHT + 0.1, hex.center.z);
      hitMesh.visible = false;
      hitMesh.userData = { type: 'hex', hex: hex };
      this.boardGroup.add(hitMesh);
      this.hexInteractiveObjects.set(hex.coord.key(), hitMesh);
    }
  }

  // Visual piece placements with popping bounce
  placeSettlement(vKey, playerId) {
    const vert = this.graph.vertices.get(vKey);
    if (!vert) return;

    if (this.buildingMeshes.has(vKey)) {
      this.boardGroup.remove(this.buildingMeshes.get(vKey));
    }

    const mat = this.materials.getPlayerMaterial(playerId);
    const mesh = new THREE.Mesh(this.settlementGeom, mat);
    mesh.position.set(vert.position.x, TILE_HEIGHT, vert.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Pop-in animation
    mesh.scale.set(0.01, 0.01, 0.01);
    this.boardGroup.add(mesh);
    this.buildingMeshes.set(vKey, mesh);

    this.animateSpawn(mesh, 1.0);
  }

  placeCity(vKey, playerId) {
    const vert = this.graph.vertices.get(vKey);
    if (!vert) return;

    if (this.buildingMeshes.has(vKey)) {
      this.boardGroup.remove(this.buildingMeshes.get(vKey));
    }

    const mat = this.materials.getPlayerMaterial(playerId);
    const mesh = new THREE.Mesh(this.cityGeom, mat);
    mesh.position.set(vert.position.x, TILE_HEIGHT, vert.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.scale.set(0.01, 0.01, 0.01);
    this.boardGroup.add(mesh);
    this.buildingMeshes.set(vKey, mesh);

    this.animateSpawn(mesh, 1.0);
  }

  placeRoad(eKey, playerId) {
    const edge = this.graph.edges.get(eKey);
    if (!edge) return;

    const v1 = this.graph.vertices.get(edge.v1Key);
    const v2 = this.graph.vertices.get(edge.v2Key);
    const dir = new THREE.Vector3().subVectors(v2.position, v1.position).normalize();

    const mat = this.materials.getPlayerMaterial(playerId);
    const mesh = new THREE.Mesh(this.roadGeom, mat);
    mesh.position.set(edge.midPoint.x, TILE_HEIGHT, edge.midPoint.z);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.scale.set(0.01, 0.01, 0.01);
    this.boardGroup.add(mesh);
    this.roadMeshes.set(eKey, mesh);

    this.animateSpawn(mesh, 1.0);
  }

  animateSpawn(mesh, targetScale = 1.0) {
    const startTime = performance.now();
    const duration = 300;
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Elastic overshoot spring
      const s = t === 1 ? 1 : Math.sin(t * Math.PI * 0.7) * (1 + (1 - t) * 0.35);
      const val = s * targetScale;
      mesh.scale.set(val, val, val);
      if (t < 1) requestAnimationFrame(animate);
      else mesh.scale.set(targetScale, targetScale, targetScale);
    };
    requestAnimationFrame(animate);
  }

  highlightVertices(keys) {
    this.vertexInteractiveObjects.forEach((mesh, key) => {
      mesh.visible = keys.includes(key);
    });
  }

  highlightEdges(keys) {
    this.edgeInteractiveObjects.forEach((mesh, key) => {
      mesh.visible = keys.includes(key);
    });
  }

  highlightHexes(keys) {
    this.hexInteractiveObjects.forEach((mesh, key) => {
      mesh.visible = keys.includes(key);
    });
  }

  clearHighlights() {
    this.vertexInteractiveObjects.forEach(m => m.visible = false);
    this.edgeInteractiveObjects.forEach(m => m.visible = false);
    this.hexInteractiveObjects.forEach(m => m.visible = false);
  }
}
