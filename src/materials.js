import * as THREE from 'three';
import { COLORS } from './constants.js';
import {
  createWoodTexture,
  createBrickTexture,
  createSheepTexture,
  createWheatTexture,
  createOreTexture,
  createDesertTexture,
  createWaterTexture
} from './proceduralTextures.js';

export class MaterialLibrary {
  constructor() {
    this.textures = {};
    this.materials = {};
    this.initTextures();
    this.initMaterials();
  }

  initTextures() {
    this.textures.wood = createWoodTexture();
    this.textures.brick = createBrickTexture();
    this.textures.sheep = createSheepTexture();
    this.textures.wheat = createWheatTexture();
    this.textures.ore = createOreTexture();
    this.textures.desert = createDesertTexture();
    this.textures.water = createWaterTexture();
  }

  initMaterials() {
    // Hex Tile Materials (PBR MeshStandardMaterial with high roughness and rich tactile qualities)
    const resourceDefs = [
      { key: 'wood', color: COLORS.resources.wood.color, roughness: 0.85, metalness: 0.05 },
      { key: 'brick', color: COLORS.resources.brick.color, roughness: 0.75, metalness: 0.1 },
      { key: 'sheep', color: COLORS.resources.sheep.color, roughness: 0.9, metalness: 0.02 },
      { key: 'wheat', color: COLORS.resources.wheat.color, roughness: 0.8, metalness: 0.05 },
      { key: 'ore', color: COLORS.resources.ore.color, roughness: 0.6, metalness: 0.25 },
      { key: 'desert', color: COLORS.resources.desert.color, roughness: 0.95, metalness: 0.0 }
    ];

    for (const r of resourceDefs) {
      this.materials[r.key] = new THREE.MeshStandardMaterial({
        color: r.color,
        map: this.textures[r.key],
        roughness: r.roughness,
        metalness: r.metalness,
        bumpMap: this.textures[r.key],
        bumpScale: 0.04,
        shadowSide: THREE.DoubleSide
      });
    }

    // Sea/Water Material
    this.materials.water = new THREE.MeshStandardMaterial({
      color: 0x184e77,
      map: this.textures.water,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92
    });

    // Board Frame Material (Matte navy / obsidian table trim)
    this.materials.frame = new THREE.MeshStandardMaterial({
      color: COLORS.boardFrame,
      roughness: 0.4,
      metalness: 0.2
    });

    // Robber Material (Obsidian / Matte dark coal)
    this.materials.robber = new THREE.MeshStandardMaterial({
      color: 0x1f2421,
      roughness: 0.45,
      metalness: 0.3
    });

    // Dice Material
    this.materials.dice = new THREE.MeshStandardMaterial({
      color: 0xfdf0d5,
      roughness: 0.3,
      metalness: 0.05
    });

    // Player Pieces Materials
    this.playerMaterials = COLORS.players.map(p => {
      return new THREE.MeshStandardMaterial({
        color: p.hex,
        roughness: 0.45,
        metalness: 0.15
      });
    });

    // Selection/Highlight materials
    this.materials.highlightVertex = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x55ff77,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });

    this.materials.highlightEdge = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x4cc9f0,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });

    this.materials.highlightHex = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffb703,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4
    });
  }

  getHexMaterial(resource) {
    return this.materials[resource] || this.materials.desert;
  }

  getPlayerMaterial(playerId) {
    return this.playerMaterials[playerId % this.playerMaterials.length];
  }
}
