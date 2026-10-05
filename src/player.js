import { COLORS } from './constants.js';

export class Player {
  constructor(id, name, colorConfig) {
    this.id = id;
    this.name = name;
    this.color = colorConfig.hex;
    this.cssColor = colorConfig.css;
    this.lightHex = colorConfig.lightHex;

    // Inventory of resources
    this.resources = {
      wood: 0,
      brick: 0,
      sheep: 0,
      wheat: 0,
      ore: 0
    };

    // Remaining physical pieces
    this.pieces = {
      settlements: 5,
      cities: 4,
      roads: 15
    };

    // Development cards in hand and played
    this.devCards = {
      knight: 0,
      victoryPoint: 0,
      roadBuilding: 0,
      yearOfPlenty: 0,
      monopoly: 0
    };
    this.newDevCards = { // Cannot play on the turn bought
      knight: 0,
      victoryPoint: 0,
      roadBuilding: 0,
      yearOfPlenty: 0,
      monopoly: 0
    };

    // Stats
    this.knightsPlayed = 0;
    this.hasLargestArmy = false;
    this.hasLongestRoad = false;
    this.longestRoadLength = 0;

    // Placed structures references
    this.settlementKeys = [];
    this.cityKeys = [];
    this.roadKeys = [];
  }

  getTotalResourceCount() {
    return Object.values(this.resources).reduce((sum, count) => sum + count, 0);
  }

  getVictoryPoints() {
    let vp = 0;
    vp += this.settlementKeys.length * 1;
    vp += this.cityKeys.length * 2;
    if (this.hasLongestRoad) vp += 2;
    if (this.hasLargestArmy) vp += 2;
    vp += this.devCards.victoryPoint + this.newDevCards.victoryPoint;
    return vp;
  }

  canAfford(cost) {
    for (const [res, count] of Object.entries(cost)) {
      if ((this.resources[res] || 0) < count) return false;
    }
    return true;
  }

  payCost(cost) {
    for (const [res, count] of Object.entries(cost)) {
      this.resources[res] -= count;
    }
  }

  addResources(resObj) {
    for (const [res, count] of Object.entries(resObj)) {
      if (this.resources[res] !== undefined) {
        this.resources[res] += count;
      }
    }
  }

  endTurn() {
    // Merge new dev cards into playable hand
    for (const [type, count] of Object.entries(this.newDevCards)) {
      this.devCards[type] += count;
      this.newDevCards[type] = 0;
    }
  }
}
