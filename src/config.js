// Single source of truth for every tunable value on the card.
// Nothing in InteractiveCard/main/gui should hardcode a magic number that
// belongs here - if it's tunable, it lives in this object.

export const config = {
  card: {
    // Applied to the DOM node at runtime (rename freely; effect CSS hooks
    // off a stable [data-interactive-card] attribute, not this class).
    className: 'interactive-card',

    // Which /packs/<id>/ asset set (card.png, card-front.png, card-back.png,
    // holo-mark.png) is currently loaded onto the card.
    pack: '001',

    // Pointer tilt/parallax.
    maxRotateX: 14,
    maxRotateY: 14,
    maxTranslateX: 30,
    maxTranslateY: 30,
    hoverScale: 1.04,
    movementStrength: 1,
    interpolationSpeed: 10, // lerp rate (1/s) while the pointer is over the card
    returnSpeed: 6, // lerp rate (1/s) back to rest after pointer leave
    perspective: 900,

    // Pointer-following highlight.
    highlightEnabled: true,
    highlightSize: 90, // % of card size
    highlightOpacity: 0.12,
    highlightColor: '#ffffff',

    // Foil layer, masked by holo-mark.png; brushed-metal streak shifts with
    // pointer position (reuses --mouse-x/--mouse-y).
    foilEnabled: true,
    foilOpacity: 0.8, // idle/rest opacity - real foil cards always shimmer a little
    foilHoverOpacity: 1, // boosted opacity while hovered

    // Illusion/sunpillar sweep layer, stacked on top of the foil layer - the
    // glossy diagonal rainbow streak + pointer-following spotlight.
    illusionEnabled: true,
    illusionOpacity: 0.5, // idle/rest opacity
    illusionHoverOpacity: 0.7, // boosted opacity while hovered

    // Glare: masked variant of shine, clipped to card-front-mask.png.
    glareEnabled: true,
    glareOpacity: 0.5,
    glareHoverOpacity: 1,

    // Click-to-flip, revealing card-back.png.
    flipOnClick: true,
    flipDuration: 0.6, // seconds
  },
};

// Available /packs/<id>/ asset sets - each folder holds a matching
// card.png, card-front.png, card-back.png, holo-mark.png.
export const CARD_PACKS = ['001', '002', '003', '004', '005'];

// Deep clone used to restore defaults without losing object identity of `config`.
export function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(config));
}

export const defaultConfigSnapshot = cloneDefaultConfig();
