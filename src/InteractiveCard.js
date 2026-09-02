// Drives the real HTML card: pointer tilt/parallax, a pointer-following
// highlight, and reporting the card's on-screen center/size via a callback
// (useful if something else - a background effect, another layout piece -
// needs to stay locked to the card).
//
// Everything here is plain DOM + CSS custom properties - no rasterizing
// the card into a canvas, no animation library.

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class InteractiveCard {
  constructor(config, { onCenterChange } = {}) {
    this.config = config;
    this.onCenterChange = onCenterChange || (() => {});

    this.el = document.querySelector('[data-interactive-card]');
    if (!this.el) throw new Error('InteractiveCard: [data-interactive-card] element not found');

    // Pointer tracking listens on the whole scene, not the card itself, so
    // the tilt reacts to pointer movement anywhere over the scene area.
    this.sceneEl = document.querySelector('.card-scene');
    if (!this.sceneEl) throw new Error('InteractiveCard: .card-scene element not found');

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.hovering = false;
    this.hoverT = 0; // smoothed 0..1, exposed for anything that wants to react to hover
    this.flipped = false;

    // foil/shine/glare start at their idle opacity (real foil cards always
    // shimmer a little), not 0 like glow which is purely a hover-only sheen.
    const idleFoil = config.card.foilEnabled ? config.card.foilOpacity : 0;
    const idleIllusion = config.card.illusionEnabled ? config.card.illusionOpacity : 0;
    const idleGlare = config.card.glareEnabled ? config.card.glareOpacity : 0;
    this.current = { rx: 0, ry: 0, tx: 0, ty: 0, scale: 1, mx: 50, my: 50, glow: 0, foil: idleFoil, illusion: idleIllusion, glare: idleGlare };
    this.target = { rx: 0, ry: 0, tx: 0, ty: 0, scale: 1, mx: 50, my: 50, glow: 0, foil: idleFoil, illusion: idleIllusion, glare: idleGlare };

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerEnter = this._onPointerEnter.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
    this._measure = this._measure.bind(this);

    this.sceneEl.addEventListener('pointermove', this._onPointerMove);
    this.sceneEl.addEventListener('pointerleave', this._onPointerLeave);
    // Keyboard users still get a (static) card without depending on hover.
    this.el.addEventListener('focus', this._onPointerEnter);
    this.el.addEventListener('blur', this._onPointerLeave);
    window.addEventListener('blur', this._onPointerLeave);
    // Click-to-flip is its own affordance, independent of hover.
    this.el.addEventListener('click', this._onClick);
    this.el.addEventListener('keydown', this._onKeydown);
    this.el.setAttribute('role', 'button');
    this.el.setAttribute('aria-pressed', 'false');

    this.className = config.card.className;
    this.el.className = this.className;

    this.setPack(config.card.pack);
    this._applyStaticStyle();
    this._syncBasePosition();

    this.resizeObserver = new ResizeObserver(this._measure);
    this.resizeObserver.observe(this.el);
    window.addEventListener('resize', this._measure);

    this._measure();
  }

  setClassName(name) {
    this.el.className = name || this.className;
  }

  /** Swap in a different /packs/<id>/ asset set (card/front/back/holo-mark). */
  setPack(pack) {
    this.config.card.pack = pack;
    const base = `/packs/${pack}`;
    const cardImg = this.el.querySelector('[data-card-asset="card"]');
    const frontImg = this.el.querySelector('[data-card-asset="card-front"]');
    const backImg = this.el.querySelector('[data-card-asset="card-back"]');
    if (cardImg) cardImg.src = `${base}/card.png`;
    if (frontImg) frontImg.src = `${base}/card-front.png`;
    if (backImg) backImg.src = `${base}/card-back.png`;
    this.el.style.setProperty('--illusion-url', `url('${base}/illusion.png')`);
    // Cascades down to .interactive-card__foil's mask-image.
    this.el.style.setProperty('--holo-mark-url', `url('${base}/holo-mark.png')`);
    // Glare layer: pack-specific mask and pattern texture.
    this.el.style.setProperty('--glare-mask-url', `url('${base}/card-front-mask.png')`);
    this.el.style.setProperty('--glare-pattern-url', `url('${base}/pattern.png')`);
  }

  /** Re-apply size/radius/perspective/highlight-color/position after a GUI edit. */
  refreshStyle() {
    this._applyStaticStyle();
    this._syncBasePosition();
    this._measure();
  }

  _applyStaticStyle() {
    const c = this.config.card;
    const s = this.el.style;
    s.setProperty('--highlight-color', c.highlightColor);
    s.setProperty('--highlight-size', `${c.highlightSize}%`);
    s.setProperty('--flip-duration', `${c.flipDuration}s`);
    // Set on the root, not the card: .interactive-card-layer (an ancestor
    // of the card) needs to read this too, via the CSS `perspective`
    // property, for the flip to get a real fixed vanishing point.
    document.documentElement.style.setProperty('--perspective', `${c.perspective}px`);
  }

  /** Toggle the click-to-flip state, revealing the card back. */
  toggleFlip() {
    this.flipped = !this.flipped;
    this.el.style.setProperty('--flip-rotation', this.flipped ? '180deg' : '0deg');
    this.el.setAttribute('aria-pressed', String(this.flipped));
  }

  _onClick() {
    if (!this.config.card.flipOnClick) return;
    this.toggleFlip();
  }

  _onKeydown(event) {
    if (!this.config.card.flipOnClick) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.toggleFlip();
    }
  }

  // Rest-state translate/foil baseline == the configured static offset and
  // idle foil opacity; keeps the card looking right even before any
  // pointer interaction, and after a GUI edit while not hovering.
  _syncBasePosition() {
    const c = this.config.card;
    this.target.tx = 0;
    this.target.ty = 0;
    this.current.tx = 0;
    this.current.ty = 0;
    if (!this.hovering) {
      this.target.foil = c.foilEnabled ? c.foilOpacity : 0;
      this.target.illusion = c.illusionEnabled ? c.illusionOpacity : 0;
      this.target.glare = c.glareEnabled ? c.glareOpacity : 0;
    }
  }

  _onPointerEnter() {
    this.hovering = true;
  }

  _onPointerMove(event) {
    this.hovering = true;
    const c = this.config.card;
    // Normalized against the full scene container, not the card itself -
    // the card reacts to pointer position anywhere over the scene.
    const rect = this.sceneEl.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    this.target.mx = (normalizedX * 0.5 + 0.5) * 100;
    this.target.my = (normalizedY * 0.5 + 0.5) * 100;

    if (this.reducedMotion) return; // no tilt/translate/scale motion

    const normX = normalizedX;
    const normY = normalizedY;

    this.target.ry = normX * c.maxRotateY * c.movementStrength;
    this.target.rx = -normY * c.maxRotateX * c.movementStrength;
    this.target.tx = normX * c.maxTranslateX * c.movementStrength;
    this.target.ty = normY * c.maxTranslateY * c.movementStrength;
    this.target.scale = c.hoverScale;
    this.target.glow = c.highlightEnabled ? c.highlightOpacity : 0;
    this.target.foil = c.foilEnabled ? c.foilHoverOpacity : 0;
    this.target.illusion = c.illusionEnabled ? c.illusionHoverOpacity : 0;
    this.target.glare = c.glareEnabled ? c.glareHoverOpacity : 0;
  }

  _onPointerLeave() {
    this.hovering = false;
    const c = this.config.card;
    this.target.rx = 0;
    this.target.ry = 0;
    this.target.tx = 0;
    this.target.ty = 0;
    this.target.scale = 1;
    this.target.glow = 0;
    this.target.foil = c.foilEnabled ? c.foilOpacity : 0;
    this.target.illusion = c.illusionEnabled ? c.illusionOpacity : 0;
    this.target.glare = c.glareEnabled ? c.glareOpacity : 0;
  }

  // Reports the card's real DOM center/size, origin at viewport center
  // (y-up), so anything syncing to the card never has to trust config
  // numbers over what's actually rendered.
  _measure() {
    const rect = this.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - window.innerWidth / 2;
    const cy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    this.onCenterChange(cx, cy, rect.width, rect.height);
  }

  /** Called once per frame from the main render loop. */
  update(dt) {
    const c = this.config.card;
    const rate = this.hovering ? c.interpolationSpeed : c.returnSpeed;
    const t = 1 - Math.exp(-rate * dt);

    this.current.rx = lerp(this.current.rx, this.target.rx, t);
    this.current.ry = lerp(this.current.ry, this.target.ry, t);
    this.current.tx = lerp(this.current.tx, this.target.tx, t);
    this.current.ty = lerp(this.current.ty, this.target.ty, t);
    this.current.scale = lerp(this.current.scale, this.target.scale, t);
    this.current.mx = lerp(this.current.mx, this.target.mx, t);
    this.current.my = lerp(this.current.my, this.target.my, t);
    this.current.glow = lerp(this.current.glow, this.target.glow, t);
    this.current.foil = lerp(this.current.foil, this.target.foil, t);
    this.current.illusion = lerp(this.current.illusion, this.target.illusion, t);
    this.current.glare = lerp(this.current.glare, this.target.glare, t);
    this.hoverT = lerp(this.hoverT, this.hovering ? 1 : 0, t);

    const s = this.el.style;
    s.setProperty('--rx', `${this.current.rx.toFixed(3)}deg`);
    s.setProperty('--ry', `${this.current.ry.toFixed(3)}deg`);
    s.setProperty('--tx', `${this.current.tx.toFixed(2)}px`);
    s.setProperty('--ty', `${this.current.ty.toFixed(2)}px`);
    s.setProperty('--scale', this.current.scale.toFixed(4));
    s.setProperty('--mouse-x', `${this.current.mx.toFixed(2)}%`);
    s.setProperty('--mouse-y', `${this.current.my.toFixed(2)}%`);
    s.setProperty('--highlight-opacity', this.current.glow.toFixed(3));
    s.setProperty('--foil-opacity', this.current.foil.toFixed(3));
    s.setProperty('--illusion-opacity', this.current.illusion.toFixed(3));
    s.setProperty('--glare-opacity', this.current.glare.toFixed(3));
    // Pre-clamped in JS, not CSS: background-position percentages are
    // edge-alignment anchors that must stay within 0%-100%, and clamp()/
    // calc() chains inside background-position were unreliable across
    // engines (silently failed to animate). Plain var() substitution of an
    // already-resolved number is guaranteed to work.
    const diagX = Math.min(100, Math.max(0, this.current.mx + this.current.my * 0.2));
    const diagXInv = Math.min(100, Math.max(0, 100 - this.current.mx - this.current.my * 0.2));
    const mouseYInv = 100 - this.current.my;
    s.setProperty('--illusion-diag-x', `${diagX.toFixed(2)}%`);
    s.setProperty('--illusion-diag-x-inv', `${diagXInv.toFixed(2)}%`);
    s.setProperty('--illusion-mouse-y-inv', `${mouseYInv.toFixed(2)}%`);
    // Rim shadow drifts opposite the tilt for a subtle parallax/bend cue.
    s.setProperty('--shadow-x', `${(-this.current.ry * 1.6).toFixed(2)}px`);
    s.setProperty('--shadow-y', `${(this.current.rx * 1.6).toFixed(2)}px`);
  }

  dispose() {
    this.sceneEl.removeEventListener('pointermove', this._onPointerMove);
    this.sceneEl.removeEventListener('pointerleave', this._onPointerLeave);
    this.el.removeEventListener('focus', this._onPointerEnter);
    this.el.removeEventListener('blur', this._onPointerLeave);
    this.el.removeEventListener('click', this._onClick);
    this.el.removeEventListener('keydown', this._onKeydown);
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this._measure);
    window.removeEventListener('blur', this._onPointerLeave);
  }
}
