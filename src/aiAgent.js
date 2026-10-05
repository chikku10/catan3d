import { BUILDING_COSTS } from './gameManager.js';

/**
 * Intelligent Catan Bot Player Agent
 * Robust against race conditions with safe timeout sequencing
 */
export class AIAgent {
  constructor(gameManager, boardRenderer, diceRoller, uiManager) {
    this.gm = gameManager;
    this.boardRenderer = boardRenderer;
    this.diceRoller = diceRoller;
    this.uiManager = uiManager;
    this.isThinking = false;
    this.timerId = null;
  }

  checkAndAct() {
    if (this.isThinking) return;
    const curr = this.gm.getCurrentPlayer();
    if (!curr || !curr.isAI) return;

    this.isThinking = true;
    if (this.timerId) clearTimeout(this.timerId);

    this.timerId = setTimeout(() => {
      this.executeTurnStep();
    }, 700);
  }

  executeTurnStep() {
    const curr = this.gm.getCurrentPlayer();
    if (!curr || !curr.isAI) {
      this.isThinking = false;
      return;
    }

    const phase = this.gm.currentPhase;

    // 1. Initial Setup: Settlement
    if (phase.includes('SETTLEMENT') && phase.startsWith('SETUP_')) {
      const validSpots = this.gm.getValidSettlementSpots(curr.id, true);
      if (validSpots.length > 0) {
        const bestSpot = this.chooseBestVertex(validSpots);
        this.boardRenderer.placeSettlement(bestSpot, curr.id);
        this.gm.buildSettlement(bestSpot);
      }
      this.isThinking = false;
      this.checkAndAct();
      return;
    }

    // 2. Initial Setup: Road
    if (phase.includes('ROAD') && phase.startsWith('SETUP_')) {
      const validRoads = this.gm.getValidRoadSpots(curr.id, true);
      if (validRoads.length > 0) {
        const chosenRoad = validRoads[Math.floor(Math.random() * validRoads.length)];
        this.boardRenderer.placeRoad(chosenRoad, curr.id);
        this.gm.buildRoad(chosenRoad);
      }
      this.isThinking = false;
      this.checkAndAct();
      return;
    }

    // 3. Roll Dice Phase
    if (phase === 'ROLL_DICE') {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      this.diceRoller.roll(d1, d2, () => {
        this.gm.rollDice();
        this.uiManager.showDiceSplash(d1, d2);
        this.isThinking = false;
        this.checkAndAct();
      });
      return;
    }

    // 4. Robber Move Phase
    if (phase === 'ROBBER_MOVE') {
      const candidateHexes = this.gm.boardGraph.hexes.filter(
        h => h.coord.key() !== this.gm.boardGraph.robberHex?.key() && h.resource !== 'desert'
      );
      const chosenHex = candidateHexes[Math.floor(Math.random() * candidateHexes.length)] || this.gm.boardGraph.hexes[0];
      if (chosenHex) {
        this.boardRenderer.moveRobber(chosenHex.coord, () => {
          this.gm.moveRobber(chosenHex.coord);
          this.isThinking = false;
          this.checkAndAct();
        });
      } else {
        this.isThinking = false;
      }
      return;
    }

    // 5. Robber Steal Phase
    if (phase === 'ROBBER_STEAL') {
      if (this.gm.stolenPlayerOptions.length > 0) {
        let victimId = this.gm.stolenPlayerOptions[0];
        let maxVp = -1;
        for (const tId of this.gm.stolenPlayerOptions) {
          const vp = this.gm.players[tId].getVictoryPoints();
          if (vp > maxVp) {
            maxVp = vp;
            victimId = tId;
          }
        }
        this.gm.stealResourceFrom(victimId);
      }
      this.isThinking = false;
      this.checkAndAct();
      return;
    }

    // 6. Main Turn: Build or Pass
    if (phase === 'MAIN_TURN') {
      // Try to upgrade to City
      const citySpots = this.gm.getValidCitySpots(curr.id);
      if (citySpots.length > 0 && curr.canAfford(BUILDING_COSTS.city) && curr.pieces.cities > 0) {
        const spot = citySpots[0];
        this.boardRenderer.placeCity(spot, curr.id);
        this.gm.buildCity(spot);
        this.isThinking = false;
        this.checkAndAct();
        return;
      }

      // Try to build Settlement
      const setSpots = this.gm.getValidSettlementSpots(curr.id, false);
      if (setSpots.length > 0 && curr.canAfford(BUILDING_COSTS.settlement) && curr.pieces.settlements > 0) {
        const spot = setSpots[0];
        this.boardRenderer.placeSettlement(spot, curr.id);
        this.gm.buildSettlement(spot);
        this.isThinking = false;
        this.checkAndAct();
        return;
      }

      // Try to build Road
      const roadSpots = this.gm.getValidRoadSpots(curr.id, false);
      if (roadSpots.length > 0 && curr.canAfford(BUILDING_COSTS.road) && curr.pieces.roads > 0) {
        const road = roadSpots[0];
        this.boardRenderer.placeRoad(road, curr.id);
        this.gm.buildRoad(road);
        this.isThinking = false;
        this.checkAndAct();
        return;
      }

      // End turn after small delay
      if (this.timerId) clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
        this.gm.endTurn();
        this.isThinking = false;
        this.checkAndAct();
      }, 600);
      return;
    }

    this.isThinking = false;
  }

  chooseBestVertex(spots) {
    let bestKey = spots[0];
    let bestScore = -1;

    for (const vKey of spots) {
      const vert = this.gm.boardGraph.vertices.get(vKey);
      if (!vert) continue;

      let score = 0;
      for (const hex of vert.adjacentHexes) {
        if (hex.number) {
          const dots = { 2: 1, 12: 1, 3: 2, 11: 2, 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 }[hex.number] || 0;
          score += dots;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestKey = vKey;
      }
    }
    return bestKey;
  }
}
