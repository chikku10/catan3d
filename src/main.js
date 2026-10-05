import './style.css';
import { SceneManager } from './sceneManager.js';
import { MaterialLibrary } from './materials.js';
import { BoardRenderer } from './boardRenderer.js';
import { GameManager } from './gameManager.js';
import { DiceRoller } from './diceRoller.js';
import { UIManager } from './uiManager.js';
import { AIAgent } from './aiAgent.js';
import { sound } from './sound.js';

let currentApp = null;

function renderMainMenu(onStartGame) {
  const overlay = document.getElementById('ui-overlay');
  overlay.innerHTML = `
    <div class="main-menu-overlay">
      <div class="menu-card">
        <div class="menu-logo">🎲</div>
        <h1 class="menu-title">CATAN 3D</h1>
        <p class="menu-tagline">High-Resolution Tabletop Catan Experience</p>

        <div class="menu-options">
          <div class="menu-btn" id="btn-mode-ai">
            <div class="menu-btn-icon">🤖</div>
            <div class="menu-btn-text">
              <h3>Play VS Computer</h3>
              <p>Quick solo game against smart AI bot players</p>
            </div>
          </div>

          <div class="menu-btn" id="btn-mode-multi">
            <div class="menu-btn-icon">👥</div>
            <div class="menu-btn-text">
              <h3>Local Multiplayer</h3>
              <p>Pass-and-play hot-seat for 4 to 6 human players</p>
            </div>
          </div>
        </div>

        <div class="menu-config-row">
          <span>Board Player Count:</span>
          <select id="menu-select-players" class="glass-select">
            <option value="4" selected>4 Players (Classic Island)</option>
            <option value="5">5 Players (Expanded Field)</option>
            <option value="6">6 Players (Grand Island)</option>
          </select>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-mode-ai')?.addEventListener('click', () => {
    sound.init();
    sound.playClick();
    const count = parseInt(document.getElementById('menu-select-players')?.value || '4', 10);
    onStartGame(count, true);
  });

  document.getElementById('btn-mode-multi')?.addEventListener('click', () => {
    sound.init();
    sound.playClick();
    const count = parseInt(document.getElementById('menu-select-players')?.value || '4', 10);
    onStartGame(count, false);
  });
}

function initGame(playerCount, isVsAI) {
  const container = document.getElementById('canvas-container');
  container.innerHTML = '';

  const sceneManager = new SceneManager(container);
  const materials = new MaterialLibrary();
  const gameManager = new GameManager(playerCount, isVsAI);
  const boardRenderer = new BoardRenderer(sceneManager.scene, gameManager.boardGraph, materials);
  const diceRoller = new DiceRoller(sceneManager.scene, materials);

  const uiManager = new UIManager(gameManager, boardRenderer, diceRoller, sceneManager, () => {
    // Return to main menu
    container.innerHTML = '';
    renderMainMenu(initGame);
  });

  // AI bot controller
  const aiAgent = new AIAgent(gameManager, boardRenderer, diceRoller, uiManager);

  gameManager.onEvent = (type, data) => {
    uiManager.render();
    if (isVsAI) {
      aiAgent.checkAndAct();
    }
  };

  gameManager.start();
  uiManager.render();

  if (isVsAI) {
    aiAgent.checkAndAct();
  }

  currentApp = {
    gameManager,
    boardRenderer,
    sceneManager,
    diceRoller,
    uiManager,
    aiAgent
  };
}

window.addEventListener('DOMContentLoaded', () => {
  renderMainMenu(initGame);
});
