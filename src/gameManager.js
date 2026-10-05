import { Player } from './player.js';
import { BoardGraph } from './boardGraph.js';
import { COLORS } from './constants.js';

export const BUILDING_COSTS = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  devCard: { sheep: 1, wheat: 1, ore: 1 }
};

export class GameManager {
  constructor(playerCount = 4, isVsAI = true, eventCallback = null) {
    this.playerCount = Math.min(Math.max(playerCount, 4), 6);
    this.isVsAI = isVsAI; // true = Player 1 is human, others are AI
    this.onEvent = eventCallback || (() => {});

    this.boardGraph = new BoardGraph(this.playerCount);
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      const isAI = isVsAI && i > 0;
      const name = i === 0 ? 'You (Red)' : `Bot ${i} (${COLORS.players[i].name})`;
      const p = new Player(i, name, COLORS.players[i]);
      p.isAI = isAI;
      this.players.push(p);
    }

    this.devDeck = this.createDevDeck();

    this.currentPhase = 'SETUP_SETTLEMENT_1';
    this.currentPlayerIndex = 0;
    this.setupRoundOrder = this.buildSetupTurnOrder();
    this.setupTurnStep = 0;

    this.lastDice = [1, 1];
    this.diceRolled = false;

    this.discardPending = [];
    this.stolenPlayerOptions = [];

    this.longestRoadHolder = null;
    this.longestRoadMin = 4;
    this.largestArmyHolder = null;
    this.largestArmyMin = 2;

    this.currentAction = null;
    this.roadBuildingFreeLeft = 0;

    this.winner = null;
  }

  createDevDeck() {
    const counts = this.playerCount > 4
      ? { knight: 20, victoryPoint: 6, roadBuilding: 3, yearOfPlenty: 3, monopoly: 3 }
      : { knight: 14, victoryPoint: 5, roadBuilding: 2, yearOfPlenty: 2, monopoly: 2 };

    const deck = [];
    for (const [type, count] of Object.entries(counts)) {
      for (let i = 0; i < count; i++) deck.push(type);
    }
    return deck.sort(() => Math.random() - 0.5);
  }

  buildSetupTurnOrder() {
    const order = [];
    for (let i = 0; i < this.playerCount; i++) {
      order.push({ player: i, phase: 'SETUP_SETTLEMENT_1' });
      order.push({ player: i, phase: 'SETUP_ROAD_1' });
    }
    for (let i = this.playerCount - 1; i >= 0; i--) {
      order.push({ player: i, phase: 'SETUP_SETTLEMENT_2' });
      order.push({ player: i, phase: 'SETUP_ROAD_2' });
    }
    return order;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  start() {
    const step = this.setupRoundOrder[0];
    this.currentPlayerIndex = step.player;
    this.currentPhase = step.phase;
    this.currentAction = 'BUILD_SETTLEMENT';
    this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
  }

  notify(type, data) {
    if (this.onEvent) {
      this.onEvent(type, { ...data, game: this });
    }
  }

  canBuildSettlementAt(vKey, playerId, isSetup = false) {
    const vert = this.boardGraph.vertices.get(vKey);
    if (!vert || vert.building) return false;

    const neighbors = this.boardGraph.getNeighborVertices(vKey);
    for (const n of neighbors) {
      if (n.building) return false;
    }

    if (isSetup) return true;

    const player = this.players[playerId];
    if (!player.canAfford(BUILDING_COSTS.settlement) || player.pieces.settlements <= 0) {
      return false;
    }

    const hasConnectedRoad = vert.adjacentEdges.some(e => e.road && e.road.playerId === playerId);
    return hasConnectedRoad;
  }

  canBuildCityAt(vKey, playerId) {
    const vert = this.boardGraph.vertices.get(vKey);
    if (!vert || !vert.building) return false;
    if (vert.building.playerId !== playerId || vert.building.type !== 'settlement') return false;

    const player = this.players[playerId];
    return player.canAfford(BUILDING_COSTS.city) && player.pieces.cities > 0;
  }

  canBuildRoadAt(eKey, playerId, isSetup = false) {
    const edge = this.boardGraph.edges.get(eKey);
    if (!edge || edge.road) return false;

    const player = this.players[playerId];
    if (!isSetup && this.roadBuildingFreeLeft <= 0) {
      if (!player.canAfford(BUILDING_COSTS.road) || player.pieces.roads <= 0) {
        return false;
      }
    }

    const v1 = this.boardGraph.vertices.get(edge.v1Key);
    const v2 = this.boardGraph.vertices.get(edge.v2Key);

    if (isSetup) {
      const lastSettlementKey = player.settlementKeys[player.settlementKeys.length - 1];
      return edge.v1Key === lastSettlementKey || edge.v2Key === lastSettlementKey;
    }

    const connectsToOwnBuilding = (v1.building && v1.building.playerId === playerId) ||
                                  (v2.building && v2.building.playerId === playerId);
    if (connectsToOwnBuilding) return true;

    const connectsToOwnRoad = v1.adjacentEdges.some(e => e.road && e.road.playerId === playerId) ||
                              v2.adjacentEdges.some(e => e.road && e.road.playerId === playerId);
    return connectsToOwnRoad;
  }

  getValidSettlementSpots(playerId, isSetup = false) {
    const spots = [];
    for (const vKey of this.boardGraph.vertices.keys()) {
      if (this.canBuildSettlementAt(vKey, playerId, isSetup)) {
        spots.push(vKey);
      }
    }
    return spots;
  }

  getValidCitySpots(playerId) {
    const spots = [];
    for (const vKey of this.boardGraph.vertices.keys()) {
      if (this.canBuildCityAt(vKey, playerId)) {
        spots.push(vKey);
      }
    }
    return spots;
  }

  getValidRoadSpots(playerId, isSetup = false) {
    const spots = [];
    for (const eKey of this.boardGraph.edges.keys()) {
      if (this.canBuildRoadAt(eKey, playerId, isSetup)) {
        spots.push(eKey);
      }
    }
    return spots;
  }

  buildSettlement(vKey) {
    const player = this.getCurrentPlayer();
    const isSetup = this.currentPhase.startsWith('SETUP_');

    if (!this.canBuildSettlementAt(vKey, player.id, isSetup)) return false;

    if (!isSetup) {
      player.payCost(BUILDING_COSTS.settlement);
    }
    player.pieces.settlements--;
    player.settlementKeys.push(vKey);

    const vert = this.boardGraph.vertices.get(vKey);
    vert.building = { type: 'settlement', playerId: player.id };

    if (this.currentPhase === 'SETUP_SETTLEMENT_2') {
      vert.adjacentHexes.forEach(hex => {
        if (hex.resource !== 'desert') {
          player.resources[hex.resource] = (player.resources[hex.resource] || 0) + 1;
        }
      });
    }

    this.notify('SETTLEMENT_BUILT', { vKey, player });
    this.checkVictory();
    this.advanceSetupIfApplicable();
    return true;
  }

  buildCity(vKey) {
    const player = this.getCurrentPlayer();
    if (!this.canBuildCityAt(vKey, player.id)) return false;

    player.payCost(BUILDING_COSTS.city);
    player.pieces.settlements++;
    player.pieces.cities--;

    player.settlementKeys = player.settlementKeys.filter(k => k !== vKey);
    player.cityKeys.push(vKey);

    const vert = this.boardGraph.vertices.get(vKey);
    vert.building = { type: 'city', playerId: player.id };

    this.notify('CITY_BUILT', { vKey, player });
    this.checkVictory();
    return true;
  }

  buildRoad(eKey) {
    const player = this.getCurrentPlayer();
    const isSetup = this.currentPhase.startsWith('SETUP_');

    if (!this.canBuildRoadAt(eKey, player.id, isSetup)) return false;

    if (!isSetup) {
      if (this.roadBuildingFreeLeft > 0) {
        this.roadBuildingFreeLeft--;
      } else {
        player.payCost(BUILDING_COSTS.road);
      }
    }
    player.pieces.roads--;
    player.roadKeys.push(eKey);

    const edge = this.boardGraph.edges.get(eKey);
    edge.road = { playerId: player.id };

    this.recalculateLongestRoad();
    this.notify('ROAD_BUILT', { eKey, player });
    this.checkVictory();
    this.advanceSetupIfApplicable();
    return true;
  }

  advanceSetupIfApplicable() {
    if (!this.currentPhase.startsWith('SETUP_')) return;

    this.setupTurnStep++;
    if (this.setupTurnStep < this.setupRoundOrder.length) {
      const step = this.setupRoundOrder[this.setupTurnStep];
      this.currentPlayerIndex = step.player;
      this.currentPhase = step.phase;
      this.currentAction = step.phase.includes('SETTLEMENT') ? 'BUILD_SETTLEMENT' : 'BUILD_ROAD';
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    } else {
      this.currentPlayerIndex = 0;
      this.currentPhase = 'ROLL_DICE';
      this.currentAction = null;
      this.diceRolled = false;
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    }
  }

  rollDice() {
    if (this.currentPhase !== 'ROLL_DICE' || this.diceRolled) return null;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.lastDice = [d1, d2];
    this.diceRolled = true;

    const sum = d1 + d2;
    this.notify('DICE_ROLLED', { die1: d1, die2: d2, sum });

    if (sum === 7) {
      this.handleRolledSeven();
    } else {
      this.produceResources(sum);
      this.currentPhase = 'MAIN_TURN';
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    }
    return sum;
  }

  produceResources(rollSum) {
    const yieldLog = [];

    for (const hex of this.boardGraph.hexes) {
      if (hex.number === rollSum && hex.coord.key() !== this.boardGraph.robberHex?.key()) {
        const corners = hex.coord.getCornerPositions();
        for (const c of corners) {
          const vert = Array.from(this.boardGraph.vertices.values()).find(v => v.position.distanceTo(c) < 0.2);
          if (vert && vert.building) {
            const player = this.players[vert.building.playerId];
            const amount = vert.building.type === 'city' ? 2 : 1;
            player.resources[hex.resource] += amount;
            yieldLog.push({ player: player.name, resource: hex.resource, amount });
          }
        }
      }
    }

    this.notify('RESOURCES_DISTRIBUTED', { rollSum, yieldLog });
  }

  handleRolledSeven() {
    this.discardPending = [];
    for (const player of this.players) {
      const total = player.getTotalResourceCount();
      if (total > 7) {
        const mustDiscard = Math.floor(total / 2);
        this.discardPending.push({ playerId: player.id, mustDiscard });
      }
    }

    // Auto-discard for AI bots
    this.discardPending = this.discardPending.filter(pInfo => {
      const p = this.players[pInfo.playerId];
      if (p.isAI) {
        let toDiscard = pInfo.mustDiscard;
        const resKeys = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
        while (toDiscard > 0) {
          const available = resKeys.filter(k => p.resources[k] > 0);
          if (available.length === 0) break;
          const chosen = available[Math.floor(Math.random() * available.length)];
          p.resources[chosen]--;
          toDiscard--;
        }
        return false;
      }
      return true;
    });

    if (this.discardPending.length > 0) {
      this.currentPhase = 'ROBBER_DISCARD';
      this.notify('DISCARD_REQUIRED', { pending: this.discardPending });
    } else {
      this.currentPhase = 'ROBBER_MOVE';
      this.currentAction = 'MOVE_ROBBER';
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    }
  }

  submitDiscard(playerId, discardedRes) {
    const entryIndex = this.discardPending.findIndex(p => p.playerId === playerId);
    if (entryIndex === -1) return false;

    const player = this.players[playerId];
    player.payCost(discardedRes);

    this.discardPending.splice(entryIndex, 1);
    this.notify('PLAYER_DISCARDED', { player, discardedRes });

    if (this.discardPending.length === 0) {
      this.currentPhase = 'ROBBER_MOVE';
      this.currentAction = 'MOVE_ROBBER';
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    }
    return true;
  }

  moveRobber(targetCoord) {
    if (this.currentPhase !== 'ROBBER_MOVE') return false;
    if (this.boardGraph.robberHex && this.boardGraph.robberHex.key() === targetCoord.key()) {
      return false;
    }

    this.boardGraph.robberHex = targetCoord;
    this.notify('ROBBER_MOVED', { coord: targetCoord });

    const hex = this.boardGraph.hexes.find(h => h.coord.key() === targetCoord.key());
    const eligiblePlayers = new Set();
    const currId = this.getCurrentPlayer().id;

    if (hex) {
      const corners = hex.coord.getCornerPositions();
      for (const c of corners) {
        const vert = Array.from(this.boardGraph.vertices.values()).find(v => v.position.distanceTo(c) < 0.2);
        if (vert && vert.building && vert.building.playerId !== currId) {
          const victim = this.players[vert.building.playerId];
          if (victim.getTotalResourceCount() > 0) {
            eligiblePlayers.add(victim.id);
          }
        }
      }
    }

    if (eligiblePlayers.size > 0) {
      this.stolenPlayerOptions = Array.from(eligiblePlayers);
      this.currentPhase = 'ROBBER_STEAL';
      this.notify('ROBBER_STEAL_TARGETS', { targets: this.stolenPlayerOptions });
    } else {
      this.currentPhase = 'MAIN_TURN';
      this.currentAction = null;
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    }
    return true;
  }

  stealResourceFrom(victimId) {
    if (this.currentPhase !== 'ROBBER_STEAL') return false;
    const victim = this.players[victimId];
    const thief = this.getCurrentPlayer();

    const cards = [];
    for (const [res, count] of Object.entries(victim.resources)) {
      for (let i = 0; i < count; i++) cards.push(res);
    }
    if (cards.length === 0) return false;

    const stolen = cards[Math.floor(Math.random() * cards.length)];
    victim.resources[stolen]--;
    thief.resources[stolen]++;

    this.notify('RESOURCE_STOLEN', { thief, victim, resource: stolen });

    this.currentPhase = 'MAIN_TURN';
    this.currentAction = null;
    this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: thief });
    return true;
  }

  buyDevCard() {
    const player = this.getCurrentPlayer();
    if (this.currentPhase !== 'MAIN_TURN') return false;
    if (this.devDeck.length === 0) return false;
    if (!player.canAfford(BUILDING_COSTS.devCard)) return false;

    player.payCost(BUILDING_COSTS.devCard);
    const card = this.devDeck.pop();
    player.newDevCards[card]++;

    this.notify('DEV_CARD_BOUGHT', { player, card });
    this.checkVictory();
    return card;
  }

  playDevCard(cardType, params = {}) {
    const player = this.getCurrentPlayer();
    if (this.currentPhase !== 'MAIN_TURN') return false;
    if ((player.devCards[cardType] || 0) <= 0) return false;

    player.devCards[cardType]--;

    if (cardType === 'knight') {
      player.knightsPlayed++;
      this.recalculateLargestArmy();
      this.currentPhase = 'ROBBER_MOVE';
      this.currentAction = 'MOVE_ROBBER';
      this.notify('KNIGHT_PLAYED', { player });
      this.notify('PHASE_CHANGED', { phase: this.currentPhase, player });
    } else if (cardType === 'roadBuilding') {
      this.roadBuildingFreeLeft = Math.min(2, player.pieces.roads);
      this.currentAction = 'BUILD_ROAD';
      this.notify('ROAD_BUILDING_PLAYED', { player, freeRoads: this.roadBuildingFreeLeft });
    } else if (cardType === 'yearOfPlenty') {
      const { res1, res2 } = params;
      if (res1) player.resources[res1]++;
      if (res2) player.resources[res2]++;
      this.notify('YEAR_OF_PLENTY_PLAYED', { player, res1, res2 });
    } else if (cardType === 'monopoly') {
      const targetRes = params.resource;
      let totalGained = 0;
      for (const p of this.players) {
        if (p.id !== player.id) {
          const count = p.resources[targetRes] || 0;
          p.resources[targetRes] = 0;
          totalGained += count;
        }
      }
      player.resources[targetRes] = (player.resources[targetRes] || 0) + totalGained;
      this.notify('MONOPOLY_PLAYED', { player, resource: targetRes, totalGained });
    }

    this.checkVictory();
    return true;
  }

  getMaritimeRate(playerId, resource) {
    const player = this.players[playerId];
    let bestRate = 4;

    for (const vKey of [...player.settlementKeys, ...player.cityKeys]) {
      const vert = this.boardGraph.vertices.get(vKey);
      if (vert && vert.harbor) {
        if (vert.harbor.resource === resource && vert.harbor.ratio < bestRate) {
          bestRate = vert.harbor.ratio;
        } else if (vert.harbor.resource === 'any' && vert.harbor.ratio < bestRate) {
          bestRate = vert.harbor.ratio;
        }
      }
    }
    return bestRate;
  }

  tradeWithBank(giveResource, wantResource) {
    const player = this.getCurrentPlayer();
    if (this.currentPhase !== 'MAIN_TURN') return false;

    const rate = this.getMaritimeRate(player.id, giveResource);
    if ((player.resources[giveResource] || 0) < rate) return false;

    player.resources[giveResource] -= rate;
    player.resources[wantResource] = (player.resources[wantResource] || 0) + 1;

    this.notify('TRADE_BANK', { player, giveResource, rate, wantResource });
    return true;
  }

  endTurn() {
    if (this.currentPhase !== 'MAIN_TURN') return false;

    const currPlayer = this.getCurrentPlayer();
    currPlayer.endTurn();

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
    this.currentPhase = 'ROLL_DICE';
    this.currentAction = null;
    this.diceRolled = false;

    this.notify('TURN_ENDED', { nextPlayer: this.getCurrentPlayer() });
    this.notify('PHASE_CHANGED', { phase: this.currentPhase, player: this.getCurrentPlayer() });
    return true;
  }

  recalculateLargestArmy() {
    let leader = this.largestArmyHolder;
    let maxKnights = this.largestArmyMin;

    for (const p of this.players) {
      if (p.knightsPlayed > maxKnights) {
        maxKnights = p.knightsPlayed;
        leader = p;
      }
    }

    if (leader !== this.largestArmyHolder) {
      if (this.largestArmyHolder) this.largestArmyHolder.hasLargestArmy = false;
      leader.hasLargestArmy = true;
      this.largestArmyHolder = leader;
      this.largestArmyMin = maxKnights;
      this.notify('LARGEST_ARMY_CHANGED', { player: leader, count: maxKnights });
    }
  }

  recalculateLongestRoad() {
    let leader = this.longestRoadHolder;
    let maxLength = this.longestRoadMin;

    for (const p of this.players) {
      const roadLen = this.calculatePlayerLongestRoad(p.id);
      p.longestRoadLength = roadLen;
      if (roadLen > maxLength) {
        maxLength = roadLen;
        leader = p;
      }
    }

    if (leader !== this.longestRoadHolder) {
      if (this.longestRoadHolder) this.longestRoadHolder.hasLongestRoad = false;
      leader.hasLongestRoad = true;
      this.longestRoadHolder = leader;
      this.longestRoadMin = maxLength;
      this.notify('LONGEST_ROAD_CHANGED', { player: leader, length: maxLength });
    }
  }

  calculatePlayerLongestRoad(playerId) {
    const playerRoads = Array.from(this.boardGraph.edges.values()).filter(e => e.road && e.road.playerId === playerId);
    if (playerRoads.length === 0) return 0;

    let maxRoad = 0;
    const visitedEdges = new Set();

    const dfs = (vKey, currentLen) => {
      maxRoad = Math.max(maxRoad, currentLen);
      const vert = this.boardGraph.vertices.get(vKey);
      if (!vert) return;

      for (const edge of vert.adjacentEdges) {
        if (edge.road && edge.road.playerId === playerId && !visitedEdges.has(edge.id)) {
          if (vert.building && vert.building.playerId !== playerId && currentLen > 0) {
            continue;
          }

          visitedEdges.add(edge.id);
          const nextVKey = edge.v1Key === vKey ? edge.v2Key : edge.v1Key;
          dfs(nextVKey, currentLen + 1);
          visitedEdges.delete(edge.id);
        }
      }
    };

    for (const road of playerRoads) {
      visitedEdges.add(road.id);
      dfs(road.v1Key, 1);
      dfs(road.v2Key, 1);
      visitedEdges.delete(road.id);
    }

    return maxRoad;
  }

  checkVictory() {
    for (const p of this.players) {
      if (p.getVictoryPoints() >= 10) {
        this.winner = p;
        this.currentPhase = 'GAME_OVER';
        this.notify('GAME_WON', { winner: p });
        return true;
      }
    }
    return false;
  }
}
