import * as THREE from 'three';
import { BUILDING_COSTS } from './gameManager.js';
import { COLORS } from './constants.js';
import { sound } from './sound.js';

export class UIManager {
  constructor(gameManager, boardRenderer, diceRoller, sceneManager, onNewGame) {
    this.gm = gameManager;
    this.boardRenderer = boardRenderer;
    this.diceRoller = diceRoller;
    this.sceneManager = sceneManager;
    this.onNewGame = onNewGame;

    this.container = document.getElementById('ui-overlay');
    this.lastActivePlayerId = null;

    this.settings = {
      resolution: 1.0,
      shadows: true,
      audio: true,
      volume: 0.5
    };

    this.showSettingsModal = false;
    this.showTradeModal = false;
    this.showDevCardsModal = false;

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const dom = this.sceneManager.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('pointerup', (e) => {
      if (this.pointerDownPos) {
        const dx = Math.abs(e.clientX - this.pointerDownPos.x);
        const dy = Math.abs(e.clientY - this.pointerDownPos.y);
        if (dx > 5 || dy > 5) return;
      }
      this.handleBoardClick(e);
    });
  }

  handleBoardClick(event) {
    const curr = this.gm.getCurrentPlayer();
    if (curr.isAI) return;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.sceneManager.raycaster.setFromCamera(mouse, this.sceneManager.camera);

    const action = this.gm.currentAction;
    const phase = this.gm.currentPhase;

    if (action === 'BUILD_SETTLEMENT' || phase.includes('SETTLEMENT')) {
      const candidates = Array.from(this.boardRenderer.vertexInteractiveObjects.values());
      const intersects = this.sceneManager.raycaster.intersectObjects(candidates, false);
      if (intersects.length > 0) {
        const target = intersects[0].object;
        const vKey = target.userData.vKey;
        this.boardRenderer.placeSettlement(vKey, this.gm.getCurrentPlayer().id);
        if (this.gm.buildSettlement(vKey)) {
          sound.playPlacePiece();
          this.gm.currentAction = null;
          this.boardRenderer.clearHighlights();
          this.render();
        }
      }
    } else if (action === 'BUILD_CITY') {
      const candidates = Array.from(this.boardRenderer.vertexInteractiveObjects.values());
      const intersects = this.sceneManager.raycaster.intersectObjects(candidates, false);
      if (intersects.length > 0) {
        const target = intersects[0].object;
        const vKey = target.userData.vKey;
        this.boardRenderer.placeCity(vKey, this.gm.getCurrentPlayer().id);
        if (this.gm.buildCity(vKey)) {
          sound.playPlacePiece();
          this.gm.currentAction = null;
          this.boardRenderer.clearHighlights();
          this.render();
        }
      }
    } else if (action === 'BUILD_ROAD' || phase.includes('ROAD')) {
      const candidates = Array.from(this.boardRenderer.edgeInteractiveObjects.values());
      const intersects = this.sceneManager.raycaster.intersectObjects(candidates, false);
      if (intersects.length > 0) {
        const target = intersects[0].object;
        const eKey = target.userData.eKey;
        this.boardRenderer.placeRoad(eKey, this.gm.getCurrentPlayer().id);
        if (this.gm.buildRoad(eKey)) {
          sound.playPlacePiece();
          if (this.gm.roadBuildingFreeLeft <= 0 && !phase.startsWith('SETUP_')) {
            this.gm.currentAction = null;
          }
          this.boardRenderer.clearHighlights();
          this.render();
        }
      }
    } else if (action === 'MOVE_ROBBER' || phase === 'ROBBER_MOVE') {
      const candidates = Array.from(this.boardRenderer.hexInteractiveObjects.values());
      const intersects = this.sceneManager.raycaster.intersectObjects(candidates, false);
      if (intersects.length > 0) {
        const target = intersects[0].object;
        const hex = target.userData.hex;
        if (hex.coord.key() !== this.gm.boardGraph.robberHex?.key()) {
          sound.playPlacePiece();
          this.boardRenderer.moveRobber(hex.coord, () => {
            this.gm.moveRobber(hex.coord);
            this.boardRenderer.clearHighlights();
            this.render();
          });
        }
      }
    }
  }

  setAction(actionType) {
    if (this.gm.currentAction === actionType) {
      this.gm.currentAction = null;
      this.boardRenderer.clearHighlights();
    } else {
      this.gm.currentAction = actionType;
      this.updateHighlightsForCurrentAction();
    }
    sound.playClick();
    this.render();
  }

  updateHighlightsForCurrentAction() {
    const action = this.gm.currentAction;
    const player = this.gm.getCurrentPlayer();
    const isSetup = this.gm.currentPhase.startsWith('SETUP_');

    this.boardRenderer.clearHighlights();

    if (player.isAI) return;

    if (action === 'BUILD_SETTLEMENT' || this.gm.currentPhase.includes('SETTLEMENT')) {
      const spots = this.gm.getValidSettlementSpots(player.id, isSetup);
      this.boardRenderer.highlightVertices(spots);
    } else if (action === 'BUILD_CITY') {
      const spots = this.gm.getValidCitySpots(player.id);
      this.boardRenderer.highlightVertices(spots);
    } else if (action === 'BUILD_ROAD' || this.gm.currentPhase.includes('ROAD')) {
      const spots = this.gm.getValidRoadSpots(player.id, isSetup);
      this.boardRenderer.highlightEdges(spots);
    } else if (action === 'MOVE_ROBBER' || this.gm.currentPhase === 'ROBBER_MOVE') {
      const otherHexes = this.gm.boardGraph.hexes
        .filter(h => h.coord.key() !== this.gm.boardGraph.robberHex?.key())
        .map(h => h.coord.key());
      this.boardRenderer.highlightHexes(otherHexes);
    }
  }

  showDiceSplash(d1, d2) {
    const total = d1 + d2;
    const isSeven = total === 7;
    const splash = document.createElement('div');
    splash.className = 'dice-splash-overlay';
    splash.innerHTML = `
      <div class="dice-splash-content ${isSeven ? 'splash-danger' : ''}">
        <div class="dice-splash-dice">🎲 ${d1} + ${d2}</div>
        <div class="dice-splash-sum">${total}</div>
        <div class="dice-splash-sub">${isSeven ? 'The Robber Strikes' : 'Harvest'}</div>
      </div>
    `;
    document.body.appendChild(splash);

    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 350);
    }, 1300);
  }

  showTurnSplash(player) {
    sound.playTurnSplash();
    const splash = document.createElement('div');
    splash.className = 'turn-splash-overlay';
    splash.innerHTML = `
      <div class="turn-splash-content" style="border-top: 4px solid ${player.cssColor}">
        <div class="turn-splash-subtitle">${player.isAI ? 'Computer Turn' : 'Your Turn'}</div>
        <div class="turn-splash-title" style="color: ${player.lightHex ? '#' + player.lightHex.toString(16) : '#fff'}">
          ${player.name}
        </div>
      </div>
    `;
    document.body.appendChild(splash);

    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 300);
    }, 1000);
  }

  render() {
    if (!this.container) return;

    const currPlayer = this.gm.getCurrentPlayer();
    const isSetup = this.gm.currentPhase.startsWith('SETUP_');

    if (this.lastActivePlayerId !== currPlayer.id) {
      this.lastActivePlayerId = currPlayer.id;
      this.showTurnSplash(currPlayer);
    }

    if (isSetup && !currPlayer.isAI) {
      this.updateHighlightsForCurrentAction();
    }

    let html = `
      <!-- Top Clean Header -->
      <div class="top-nav-panel">
        <div class="game-logo-badge">
          <span class="logo-title">CATAN 3D</span>
          <span class="logo-mode-pill">${this.gm.isVsAI ? 'VS Computer' : 'Multiplayer'}</span>
        </div>

        <div class="header-right-tools">
          <button class="natural-btn btn-sm" id="btn-cam-iso" title="Angle View">Angle</button>
          <button class="natural-btn btn-sm" id="btn-cam-top" title="Top View">Top</button>
          <button class="natural-btn btn-sm" id="btn-cam-close" title="Zoom View">Zoom</button>
          <button class="natural-btn btn-sm" id="btn-open-settings" title="Settings">Settings</button>
          <button class="natural-btn btn-sm btn-accent" id="btn-menu-back" title="Main Menu">Menu</button>
        </div>
      </div>

      <!-- Docked Upper-Right Players Board -->
      <div class="compact-players-sidebar">
        <div class="sidebar-header">PLAYERS</div>
        ${this.gm.players.map(p => `
          <div class="compact-player-card ${p.id === currPlayer.id ? 'active-player' : ''}" style="border-left: 3px solid ${p.cssColor}">
            <div class="compact-p-info">
              <span class="compact-p-name">${p.name}</span>
              <div class="compact-p-badges">
                ${p.hasLongestRoad ? '<span class="badge-mini" title="Longest Road">Road</span>' : ''}
                ${p.hasLargestArmy ? '<span class="badge-mini" title="Largest Army">Army</span>' : ''}
              </div>
            </div>
            <div class="compact-p-stats">
              <span class="compact-vp">${p.getVictoryPoints()} VP</span>
              <span class="compact-cards">🎴 ${p.getTotalResourceCount()}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Clean Minimal Bottom Console -->
      <div class="minimal-dock">
        <div class="dock-turn-line">
          <div class="dock-turn-name">
            <span class="status-dot" style="background:${currPlayer.cssColor}"></span>
            <span class="font-bold">${currPlayer.name}</span>
            <span class="dock-phase-pill">${this.formatPhase(this.gm.currentPhase)}</span>
          </div>
          ${this.gm.diceRolled ? `
            <div class="dock-dice-pill">
              Dice: <b>${this.gm.lastDice[0]} + ${this.gm.lastDice[1]} = ${this.gm.lastDice[0] + this.gm.lastDice[1]}</b>
            </div>
          ` : ''}
        </div>

        <!-- Micro Resources -->
        <div class="micro-res-tray">
          <div class="micro-res" title="Wood"><span>🌲</span><b>${currPlayer.resources.wood}</b></div>
          <div class="micro-res" title="Brick"><span>🧱</span><b>${currPlayer.resources.brick}</b></div>
          <div class="micro-res" title="Wool"><span>🐑</span><b>${currPlayer.resources.sheep}</b></div>
          <div class="micro-res" title="Wheat"><span>🌾</span><b>${currPlayer.resources.wheat}</b></div>
          <div class="micro-res" title="Ore"><span>⛰️</span><b>${currPlayer.resources.ore}</b></div>
        </div>

        <!-- Actions -->
        <div class="dock-actions">
          ${this.renderDockActions(currPlayer)}
        </div>
      </div>

      <!-- Settings & Game Modals -->
      ${this.renderModals()}
    `;

    this.container.innerHTML = html;
    this.attachDomHandlers();
  }

  formatPhase(phase) {
    switch (phase) {
      case 'SETUP_SETTLEMENT_1': return 'Place 1st Settlement';
      case 'SETUP_ROAD_1': return 'Place 1st Road';
      case 'SETUP_SETTLEMENT_2': return 'Place 2nd Settlement (Collect Resources)';
      case 'SETUP_ROAD_2': return 'Place 2nd Road';
      case 'ROLL_DICE': return 'Roll Dice';
      case 'ROBBER_DISCARD': return 'Discarding Excess Cards';
      case 'ROBBER_MOVE': return 'Move Robber';
      case 'ROBBER_STEAL': return 'Steal Resource Card';
      case 'MAIN_TURN': return 'Main Turn';
      case 'GAME_OVER': return `Winner: ${this.gm.winner?.name}!`;
      default: return phase;
    }
  }

  renderDockActions(player) {
    const phase = this.gm.currentPhase;

    if (player.isAI) {
      return `<div class="ai-status-pulse">Computer is making a move...</div>`;
    }

    if (phase.startsWith('SETUP_')) {
      return `<div class="action-hint-inline">Click a glowing node on the 3D board to build</div>`;
    }

    if (phase === 'ROLL_DICE') {
      return `<button class="natural-btn btn-roll" id="btn-roll-dice">Roll Dice</button>`;
    }

    if (phase === 'MAIN_TURN') {
      const canRoad = player.canAfford(BUILDING_COSTS.road) && player.pieces.roads > 0;
      const canSettlement = player.canAfford(BUILDING_COSTS.settlement) && player.pieces.settlements > 0;
      const canCity = player.canAfford(BUILDING_COSTS.city) && player.pieces.cities > 0;
      const canDev = player.canAfford(BUILDING_COSTS.devCard) && this.gm.devDeck.length > 0;

      return `
        <button class="natural-btn ${canRoad ? '' : 'disabled'} ${this.gm.currentAction === 'BUILD_ROAD' ? 'btn-active' : ''}" id="btn-build-road">
          Road (${player.pieces.roads})
        </button>
        <button class="natural-btn ${canSettlement ? '' : 'disabled'} ${this.gm.currentAction === 'BUILD_SETTLEMENT' ? 'btn-active' : ''}" id="btn-build-settlement">
          Settlement (${player.pieces.settlements})
        </button>
        <button class="natural-btn ${canCity ? '' : 'disabled'} ${this.gm.currentAction === 'BUILD_CITY' ? 'btn-active' : ''}" id="btn-build-city">
          City (${player.pieces.cities})
        </button>
        <button class="natural-btn ${canDev ? '' : 'disabled'}" id="btn-buy-dev">
          Buy Card
        </button>
        <button class="natural-btn" id="btn-open-devs">
          Hand (${Object.values(player.devCards).reduce((a, b) => a + b, 0)})
        </button>
        <button class="natural-btn" id="btn-open-trade">
          Trade
        </button>
        <button class="natural-btn btn-end-turn" id="btn-end-turn">
          End Turn
        </button>
      `;
    }

    return '';
  }

  renderModals() {
    if (this.showSettingsModal) {
      return `
        <div class="modal-backdrop">
          <div class="natural-modal">
            <h3 class="modal-title">Settings</h3>
            <div class="settings-group">
              <div class="settings-row">
                <span>Graphics Resolution:</span>
                <select id="select-resolution" class="natural-select">
                  <option value="0.75" ${this.settings.resolution === 0.75 ? 'selected' : ''}>Performance (Low)</option>
                  <option value="1.0" ${this.settings.resolution === 1.0 ? 'selected' : ''}>Balanced (Standard)</option>
                  <option value="1.5" ${this.settings.resolution === 1.5 ? 'selected' : ''}>Ultra Sharp (High DPI)</option>
                </select>
              </div>
              <div class="settings-row">
                <span>Soft Shadows:</span>
                <input type="checkbox" id="check-shadows" ${this.settings.shadows ? 'checked' : ''} />
              </div>
              <div class="settings-row">
                <span>Sound Effects:</span>
                <input type="checkbox" id="check-audio" ${this.settings.audio ? 'checked' : ''} />
              </div>
              <div class="settings-row">
                <span>Volume:</span>
                <input type="range" id="range-volume" min="0" max="1" step="0.05" value="${this.settings.volume}" />
              </div>
            </div>
            <div class="modal-actions">
              <button class="natural-btn btn-accent" id="btn-save-settings">Save Settings</button>
              <button class="natural-btn" id="btn-cancel-settings">Cancel</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.gm.currentPhase === 'ROBBER_STEAL' && !this.gm.getCurrentPlayer().isAI && this.gm.stolenPlayerOptions.length > 0) {
      return `
        <div class="modal-backdrop">
          <div class="natural-modal">
            <h3 class="modal-title">Robber Steal</h3>
            <p>Select a player adjacent to this hex to steal a card from:</p>
            <div class="modal-buttons">
              ${this.gm.stolenPlayerOptions.map(id => {
                const target = this.gm.players[id];
                return `<button class="natural-btn steal-target-btn" data-player-id="${id}" style="border-left: 4px solid ${target.cssColor}">
                  ${target.name} (${target.getTotalResourceCount()} cards)
                </button>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.gm.currentPhase === 'ROBBER_DISCARD' && this.gm.discardPending.length > 0) {
      const pending = this.gm.discardPending[0];
      const p = this.gm.players[pending.playerId];
      if (!p.isAI) {
        return `
          <div class="modal-backdrop">
            <div class="natural-modal">
              <h3 class="modal-title">Robber Halving (Rolled 7)</h3>
              <p>You have ${p.getTotalResourceCount()} cards and must discard <b>${pending.mustDiscard}</b>:</p>
              <div class="discard-selector" id="discard-selector" data-needed="${pending.mustDiscard}" data-player-id="${p.id}">
                ${['wood', 'brick', 'sheep', 'wheat', 'ore'].map(res => `
                  <div class="discard-row">
                    <span>${res.toUpperCase()} (${p.resources[res]}):</span>
                    <input type="number" class="discard-input" data-res="${res}" min="0" max="${p.resources[res]}" value="0" />
                  </div>
                `).join('')}
              </div>
              <button class="natural-btn btn-accent" id="btn-submit-discard" style="margin-top:12px">Confirm Discard</button>
            </div>
          </div>
        `;
      }
    }

    if (this.showTradeModal) {
      const p = this.gm.getCurrentPlayer();
      const resources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
      return `
        <div class="modal-backdrop">
          <div class="natural-modal">
            <h3 class="modal-title">Maritime & Bank Trading</h3>
            <div class="trade-grid">
              <div>
                <h4>Give:</h4>
                <select id="trade-give-select" class="natural-select">
                  ${resources.map(r => {
                    const rate = this.gm.getMaritimeRate(p.id, r);
                    const count = p.resources[r];
                    const canAfford = count >= rate;
                    return `<option value="${r}" ${canAfford ? '' : 'disabled'}>
                      ${r.toUpperCase()} (${count}) - Rate ${rate}:1 ${canAfford ? '✓' : '✗'}
                    </option>`;
                  }).join('')}
                </select>
              </div>
              <div class="trade-arrow">→</div>
              <div>
                <h4>Receive 1x:</h4>
                <select id="trade-want-select" class="natural-select">
                  ${resources.map(r => `<option value="${r}">${r.toUpperCase()}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-actions">
              <button class="natural-btn btn-accent" id="btn-confirm-trade">Confirm Trade</button>
              <button class="natural-btn" id="btn-close-trade">Cancel</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.showDevCardsModal) {
      const p = this.gm.getCurrentPlayer();
      return `
        <div class="modal-backdrop">
          <div class="natural-modal">
            <h3 class="modal-title">Development Cards</h3>
            <div class="dev-cards-list">
              <div class="dev-card-row">
                <div><b>Knight (${p.devCards.knight})</b>: Move robber & steal</div>
                <button class="natural-btn btn-sm ${p.devCards.knight > 0 ? '' : 'disabled'}" data-card="knight">Play</button>
              </div>
              <div class="dev-card-row">
                <div><b>Road Building (${p.devCards.roadBuilding})</b>: 2 free roads</div>
                <button class="natural-btn btn-sm ${p.devCards.roadBuilding > 0 ? '' : 'disabled'}" data-card="roadBuilding">Play</button>
              </div>
              <div class="dev-card-row">
                <div><b>Year of Plenty (${p.devCards.yearOfPlenty})</b>: Take 2 resources</div>
                <button class="natural-btn btn-sm ${p.devCards.yearOfPlenty > 0 ? '' : 'disabled'}" data-card="yearOfPlenty">Play</button>
              </div>
              <div class="dev-card-row">
                <div><b>Monopoly (${p.devCards.monopoly})</b>: Take 1 resource from all</div>
                <button class="natural-btn btn-sm ${p.devCards.monopoly > 0 ? '' : 'disabled'}" data-card="monopoly">Play</button>
              </div>
              <div class="dev-card-row">
                <div><b>Victory Point (${p.devCards.victoryPoint + p.newDevCards.victoryPoint})</b>: Hidden 1 VP</div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="natural-btn" id="btn-close-devs">Close</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.gm.currentPhase === 'GAME_OVER' && this.gm.winner) {
      return `
        <div class="modal-backdrop">
          <div class="natural-modal text-center">
            <h2 class="modal-title">Game Over</h2>
            <p class="my-4"><b>${this.gm.winner.name}</b> has reached 10 Victory Points and won!</p>
            <button class="natural-btn btn-accent mt-4" id="btn-play-again">Back to Menu</button>
          </div>
        </div>
      `;
    }

    return '';
  }

  attachDomHandlers() {
    document.getElementById('btn-cam-iso')?.addEventListener('click', () => {
      sound.playClick();
      this.sceneManager.setCameraView('isometric');
    });
    document.getElementById('btn-cam-top')?.addEventListener('click', () => {
      sound.playClick();
      this.sceneManager.setCameraView('topdown');
    });
    document.getElementById('btn-cam-close')?.addEventListener('click', () => {
      sound.playClick();
      this.sceneManager.setCameraView('closeup');
    });

    document.getElementById('btn-menu-back')?.addEventListener('click', () => {
      sound.playClick();
      if (confirm('Return to main menu?')) {
        this.onNewGame();
      }
    });

    // Settings open & save
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      sound.playClick();
      this.showSettingsModal = true;
      this.render();
    });

    // Save settings
    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      sound.playClick();
      const resElem = document.getElementById('select-resolution');
      const shadElem = document.getElementById('check-shadows');
      const audElem = document.getElementById('check-audio');
      const volElem = document.getElementById('range-volume');

      const res = resElem ? parseFloat(resElem.value) : 1.0;
      const shad = shadElem ? shadElem.checked : true;
      const aud = audElem ? audElem.checked : true;
      const vol = volElem ? parseFloat(volElem.value) : 0.5;

      this.settings = { resolution: res, shadows: shad, audio: aud, volume: vol };
      this.sceneManager.setResolutionScale(res);
      this.sceneManager.setShadowQuality(shad);
      sound.setEnabled(aud);
      sound.setVolume(vol);

      this.showSettingsModal = false;
      this.render();
    });

    document.getElementById('btn-cancel-settings')?.addEventListener('click', () => {
      sound.playClick();
      this.showSettingsModal = false;
      this.render();
    });

    // Live volume test slider
    document.getElementById('range-volume')?.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      sound.setVolume(vol);
    });

    // Roll dice
    document.getElementById('btn-roll-dice')?.addEventListener('click', () => {
      sound.playDiceRoll();
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      this.diceRoller.roll(d1, d2, () => {
        this.gm.rollDice();
        this.showDiceSplash(d1, d2);
        this.render();
      });
    });

    // Build buttons
    document.getElementById('btn-build-road')?.addEventListener('click', () => this.setAction('BUILD_ROAD'));
    document.getElementById('btn-build-settlement')?.addEventListener('click', () => this.setAction('BUILD_SETTLEMENT'));
    document.getElementById('btn-build-city')?.addEventListener('click', () => this.setAction('BUILD_CITY'));

    // Buy Dev
    document.getElementById('btn-buy-dev')?.addEventListener('click', () => {
      sound.playClick();
      const card = this.gm.buyDevCard();
      if (card) {
        alert(`You drew: ${card.toUpperCase()}! (Usable next turn)`);
        this.render();
      }
    });

    // Modals
    document.getElementById('btn-open-devs')?.addEventListener('click', () => {
      sound.playClick();
      this.showDevCardsModal = true;
      this.render();
    });
    document.getElementById('btn-close-devs')?.addEventListener('click', () => {
      sound.playClick();
      this.showDevCardsModal = false;
      this.render();
    });

    document.getElementById('btn-open-trade')?.addEventListener('click', () => {
      sound.playClick();
      this.showTradeModal = true;
      this.render();
    });
    document.getElementById('btn-close-trade')?.addEventListener('click', () => {
      sound.playClick();
      this.showTradeModal = false;
      this.render();
    });

    // End turn
    document.getElementById('btn-end-turn')?.addEventListener('click', () => {
      sound.playClick();
      this.gm.endTurn();
      this.render();
    });

    // Trade confirm
    document.getElementById('btn-confirm-trade')?.addEventListener('click', () => {
      const give = document.getElementById('trade-give-select')?.value;
      const want = document.getElementById('trade-want-select')?.value;
      if (give && want) {
        if (this.gm.tradeWithBank(give, want)) {
          sound.playClick();
          this.showTradeModal = false;
          this.render();
        }
      }
    });

    // Steal target
    document.querySelectorAll('.steal-target-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-player-id'), 10);
        sound.playClick();
        this.gm.stealResourceFrom(id);
        this.render();
      });
    });

    // Submit discard
    document.getElementById('btn-submit-discard')?.addEventListener('click', () => {
      const selector = document.getElementById('discard-selector');
      const needed = parseInt(selector.getAttribute('data-needed'), 10);
      const pId = parseInt(selector.getAttribute('data-player-id'), 10);

      const inputs = selector.querySelectorAll('.discard-input');
      let sum = 0;
      const discardObj = {};
      inputs.forEach(input => {
        const count = parseInt(input.value, 10) || 0;
        const res = input.getAttribute('data-res');
        discardObj[res] = count;
        sum += count;
      });

      if (sum !== needed) {
        alert(`You must discard exactly ${needed} cards. You selected ${sum}.`);
        return;
      }

      this.gm.submitDiscard(pId, discardObj);
      this.render();
    });

    // Play Dev cards
    document.querySelectorAll('[data-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.getAttribute('data-card');
        this.showDevCardsModal = false;

        if (card === 'knight') {
          this.gm.playDevCard('knight');
          this.updateHighlightsForCurrentAction();
          this.render();
        } else if (card === 'roadBuilding') {
          this.gm.playDevCard('roadBuilding');
          this.updateHighlightsForCurrentAction();
          this.render();
        } else if (card === 'yearOfPlenty') {
          const res1 = prompt('Choose first resource (wood, brick, sheep, wheat, ore):', 'wood');
          const res2 = prompt('Choose second resource (wood, brick, sheep, wheat, ore):', 'ore');
          this.gm.playDevCard('yearOfPlenty', { res1, res2 });
          this.render();
        } else if (card === 'monopoly') {
          const res = prompt('Choose resource to monopolize (wood, brick, sheep, wheat, ore):', 'ore');
          this.gm.playDevCard('monopoly', { resource: res });
          this.render();
        }
      });
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.onNewGame();
    });
  }
}
