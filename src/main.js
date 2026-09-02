import { config } from './config.js';
import { InteractiveCard } from './InteractiveCard.js';
import { createGUI } from './gui.js';
import './styles.css';

const interactiveCard = new InteractiveCard(config);

// --- Animation loop ---------------------------------------------------------
let rafId = null;
let lastTime = performance.now();

function animate(now) {
  rafId = requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 1 / 15); // clamp so a tab-switch doesn't jump
  lastTime = now;
  interactiveCard.update(dt);
}

function startLoop() {
  if (rafId === null) {
    lastTime = performance.now();
    rafId = requestAnimationFrame(animate);
  }
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// No wasted work while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLoop();
  } else {
    startLoop();
  }
});

startLoop();

// --- Controller exposed to the GUI ------------------------------------------
const controller = {
  onCardStyleChange() {
    interactiveCard.refreshStyle();
  },
  onCardClassNameChange(name) {
    interactiveCard.setClassName(name);
  },
  onCardPackChange(pack) {
    interactiveCard.setPack(pack);
  },
  toggleCardFlip() {
    interactiveCard.toggleFlip();
  },
};

createGUI(config, controller);
