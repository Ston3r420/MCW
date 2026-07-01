// Modular character-creator part definitions.
// A wrestler's look is stored on the viewer as `characterData`:
//   { bodyColor, pattern, face, headgear, accessory }
// Everything is rendered programmatically as SVG (see MarblePortrait.jsx),
// so no external art assets are required.

export const BODY_COLORS = [
  { id: 'gold', label: 'Gold', value: '#ffd700' },
  { id: 'crimson', label: 'Crimson', value: '#e63946' },
  { id: 'teal', label: 'Teal', value: '#00d4c8' },
  { id: 'emerald', label: 'Emerald', value: '#2ecc71' },
  { id: 'cobalt', label: 'Cobalt', value: '#3a6ff7' },
  { id: 'onyx', label: 'Onyx', value: '#2c2c3a' },
  { id: 'amethyst', label: 'Amethyst', value: '#9b59b6' },
  { id: 'silver', label: 'Silver', value: '#c7c9d1' },
  { id: 'ember', label: 'Ember', value: '#ff7b29' },
];

export const PATTERNS = [
  { id: 'solid', label: 'Solid' },
  { id: 'swirl', label: 'Swirl' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'sparkle', label: 'Sparkle' },
];

export const FACES = [
  { id: 'game', label: 'Game Face' },
  { id: 'angry', label: 'Angry' },
  { id: 'cool', label: 'Cool' },
  { id: 'happy', label: 'Happy' },
  { id: 'blank', label: 'Blank' },
];

export const HEADGEAR = [
  { id: 'none', label: 'None' },
  { id: 'crown', label: 'Crown' },
  { id: 'headband', label: 'Headband' },
  { id: 'mask', label: 'Luchador Mask' },
  { id: 'mohawk', label: 'Mohawk' },
];

export const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'shades', label: 'Shades' },
  { id: 'belt', label: 'Title Belt' },
  { id: 'cape', label: 'Cape' },
];

export const DEFAULT_CHARACTER = {
  bodyColor: 'teal',
  pattern: 'swirl',
  face: 'game',
  headgear: 'none',
  accessory: 'none',
};

export function colorValue(id) {
  return (BODY_COLORS.find((c) => c.id === id) || BODY_COLORS[2]).value;
}

// Backfills any missing fields so old/partial records still render.
export function normalizeCharacter(data) {
  if (!data || typeof data !== 'object') return { ...DEFAULT_CHARACTER };
  return { ...DEFAULT_CHARACTER, ...data };
}
