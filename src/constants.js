export const COLORS = {
  // Player colors (vibrant, saturated, readable matte finish)
  players: [
    { id: 0, name: 'Red', hex: 0xe63946, css: '#e63946', lightHex: 0xff6b6b },
    { id: 1, name: 'Blue', hex: 0x1d3557, css: '#1d3557', lightHex: 0x457b9d },
    { id: 2, name: 'Orange', hex: 0xf4a261, css: '#f4a261', lightHex: 0xffba08 },
    { id: 3, name: 'White', hex: 0xf1faee, css: '#f1faee', lightHex: 0xffffff },
    { id: 4, name: 'Green', hex: 0x2a9d8f, css: '#2a9d8f', lightHex: 0x52b788 },
    { id: 5, name: 'Brown', hex: 0x8d5b4c, css: '#8d5b4c', lightHex: 0xb07d62 },
  ],
  // Resource colors & visual theme
  resources: {
    wood: {
      name: 'Lumber',
      color: 0x2d6a4f,
      groundColor: 0x1b4332,
      accentColor: 0x52b788,
      trunkColor: 0x5c4033,
      uiBadge: '#2d6a4f',
      icon: '🌲'
    },
    brick: {
      name: 'Brick',
      color: 0xc85a32,
      groundColor: 0x9c3d1b,
      accentColor: 0xe07a5f,
      uiBadge: '#c85a32',
      icon: '🧱'
    },
    sheep: {
      name: 'Wool',
      color: 0x70a83b,
      groundColor: 0x588157,
      accentColor: 0x90be6d,
      uiBadge: '#70a83b',
      icon: '🐑'
    },
    wheat: {
      name: 'Grain',
      color: 0xdda15e,
      groundColor: 0xbc6c25,
      accentColor: 0xffe6a7,
      uiBadge: '#dda15e',
      icon: '🌾'
    },
    ore: {
      name: 'Ore',
      color: 0x6c757d,
      groundColor: 0x495057,
      accentColor: 0x90e0ef,
      uiBadge: '#6c757d',
      icon: '⛰️'
    },
    desert: {
      name: 'Desert',
      color: 0xddb892,
      groundColor: 0xb08968,
      accentColor: 0xede0d4,
      uiBadge: '#b08968',
      icon: '🏜️'
    }
  },
  sea: {
    deep: 0x0f2b46,
    surface: 0x184e77,
    shore: 0x38a3a5,
    foam: 0xd9ed92
  },
  boardFrame: 0x0a192f,
  table: 0x161a1d,
  gold: 0xfcc419,
  danger: 0xd90429,
  robber: 0x212529
};

export const TILE_RADIUS = 3.6; // Outer radius of hex
export const TILE_HEIGHT = 0.8; // Base height of hex tile
export const BEVEL_SIZE = 0.18; // Chamfered top edge
export const HEX_GAP = 0.12; // Gap for crisp shadow definition
