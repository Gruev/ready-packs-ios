import GUI from 'lil-gui';
import { defaultConfigSnapshot, CARD_PACKS } from './config.js';

export function createGUI(config, controller) {
  const gui = new GUI({ title: 'Card' });

  // --- Card pack (asset set) --------------------------------------------
  gui
    .add(config.card, 'pack', CARD_PACKS)
    .name('pack')
    .onChange((value) => controller.onCardPackChange(value));

  gui
    .add(config.card, 'className')
    .name('class name')
    .onFinishChange((value) => controller.onCardClassNameChange(value));
  gui
    .add(config.card, 'perspective', 300, 2500, 10)
    .onFinishChange(() => controller.onCardStyleChange());

  const tiltFolder = gui.addFolder('Tilt');
  tiltFolder.add(config.card, 'maxRotateX', 0, 45, 0.5);
  tiltFolder.add(config.card, 'maxRotateY', 0, 45, 0.5);
  tiltFolder.add(config.card, 'maxTranslateX', 0, 60, 1);
  tiltFolder.add(config.card, 'maxTranslateY', 0, 60, 1);
  tiltFolder.add(config.card, 'hoverScale', 0.9, 1.3, 0.01);
  tiltFolder.add(config.card, 'movementStrength', 0, 2, 0.01);
  tiltFolder.add(config.card, 'interpolationSpeed', 1, 30, 0.5);
  tiltFolder.add(config.card, 'returnSpeed', 1, 30, 0.5);

  const highlightFolder = gui.addFolder('Highlight');
  highlightFolder.add(config.card, 'highlightEnabled');
  highlightFolder
    .add(config.card, 'highlightSize', 10, 150, 1)
    .onFinishChange(() => controller.onCardStyleChange());
  highlightFolder.add(config.card, 'highlightOpacity', 0, 1, 0.01);
  highlightFolder
    .addColor(config.card, 'highlightColor')
    .onFinishChange(() => controller.onCardStyleChange());

  const foilFolder = gui.addFolder('Foil');
  foilFolder
    .add(config.card, 'foilEnabled')
    .onFinishChange(() => controller.onCardStyleChange());
  foilFolder
    .add(config.card, 'foilOpacity', 0, 1, 0.01)
    .name('foilOpacity (idle)')
    .onFinishChange(() => controller.onCardStyleChange());
  foilFolder.add(config.card, 'foilHoverOpacity', 0, 1, 0.01);

  const shineFolder = gui.addFolder('Illusion');
  shineFolder
    .add(config.card, 'illusionEnabled')
    .onFinishChange(() => controller.onCardStyleChange());
  shineFolder
    .add(config.card, 'illusionOpacity', 0, 1, 0.01)
    .name('illusionOpacity (idle)')
    .onFinishChange(() => controller.onCardStyleChange());
  shineFolder.add(config.card, 'illusionHoverOpacity', 0, 1, 0.01);

  const glareFolder = gui.addFolder('Glare');
  glareFolder.add(config.card, 'glareEnabled');
  glareFolder.add(config.card, 'glareOpacity', 0, 1, 0.01).name('glareOpacity (idle)');
  glareFolder.add(config.card, 'glareHoverOpacity', 0, 1, 0.01);

  const flipFolder = gui.addFolder('Flip');
  flipFolder.add(config.card, 'flipOnClick').name('flip on click');
  flipFolder
    .add(config.card, 'flipDuration', 0.1, 2, 0.05)
    .name('flipDuration (s)')
    .onFinishChange(() => controller.onCardStyleChange());
  flipFolder.add({ flip: () => controller.toggleCardFlip() }, 'flip').name('Trigger flip');

  // --- Global reset -----------------------------------------------------
  const globalActions = {
    resetToDefaults: () => {
      Object.assign(config.card, defaultConfigSnapshot.card);
      controller.onCardClassNameChange(config.card.className);
      controller.onCardPackChange(config.card.pack);
      controller.onCardStyleChange();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
  };
  gui.add(globalActions, 'resetToDefaults').name('Reset to defaults');

  // All accordions start closed - only the top-level "pack" dropdown
  // is visible by default.
  gui.folders.forEach((folder) => folder.close());

  return gui;
}
