import React from 'react';
import { colorValue, normalizeCharacter } from '../lib/characterParts';

// Renders a wrestler's marble portrait as a self-contained SVG built from
// the modular character parts. `character` is the viewer's characterData.
export default function MarblePortrait({ character, size = 160, className = '' }) {
  const c = normalizeCharacter(character);
  const base = colorValue(c.bodyColor);
  const dark = shade(base, -40);
  const light = shade(base, 60);
  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`marble-portrait ${className}`}
      role="img"
      aria-label="Wrestler marble portrait"
    >
      <defs>
        <radialGradient id={`g-${uid}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <circle cx="100" cy="100" r="78" />
        </clipPath>
      </defs>

      {/* Marble body */}
      <circle cx="100" cy="100" r="78" fill={`url(#g-${uid})`} stroke={dark} strokeWidth="3" />

      {/* Pattern overlay (clipped to the marble) */}
      <g clipPath={`url(#clip-${uid})`}>{renderPattern(c.pattern, base, light, dark)}</g>

      {/* Glossy highlight */}
      <ellipse cx="72" cy="66" rx="26" ry="16" fill="rgba(255,255,255,0.35)" transform="rotate(-25 72 66)" />

      {/* Face */}
      {renderFace(c.face)}

      {/* Headgear + accessories */}
      {renderHeadgear(c.headgear)}
      {renderAccessory(c.accessory)}
    </svg>
  );
}

function renderPattern(pattern, base, light, dark) {
  switch (pattern) {
    case 'swirl':
      return (
        <path
          d="M100 40 C40 60 40 140 100 160 C150 145 150 95 100 100 C70 102 70 130 100 132"
          fill="none"
          stroke={light}
          strokeOpacity="0.55"
          strokeWidth="10"
          strokeLinecap="round"
        />
      );
    case 'stripe':
      return (
        <g fill={dark} opacity="0.5">
          <rect x="20" y="78" width="160" height="14" />
          <rect x="20" y="108" width="160" height="14" />
        </g>
      );
    case 'sparkle':
      return (
        <g fill={light} opacity="0.85">
          <path d="M60 60 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" />
          <path d="M140 90 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path d="M120 140 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
        </g>
      );
    default:
      return null;
  }
}

function renderFace(face) {
  const eye = '#101018';
  switch (face) {
    case 'angry':
      return (
        <g fill={eye} stroke={eye}>
          <line x1="70" y1="92" x2="90" y2="98" strokeWidth="5" strokeLinecap="round" />
          <line x1="130" y1="92" x2="110" y2="98" strokeWidth="5" strokeLinecap="round" />
          <circle cx="80" cy="104" r="6" />
          <circle cx="120" cy="104" r="6" />
          <path d="M78 132 Q100 120 122 132" fill="none" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'cool':
      return (
        <g fill={eye} stroke={eye}>
          <path d="M74 124 Q100 138 126 124" fill="none" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'happy':
      return (
        <g fill={eye} stroke={eye}>
          <circle cx="80" cy="100" r="7" />
          <circle cx="120" cy="100" r="7" />
          <path d="M74 122 Q100 148 126 122" fill="none" strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case 'blank':
      return (
        <g fill={eye} stroke={eye}>
          <circle cx="80" cy="102" r="6" />
          <circle cx="120" cy="102" r="6" />
          <line x1="80" y1="130" x2="120" y2="130" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    default: // game face
      return (
        <g fill={eye} stroke={eye}>
          <circle cx="80" cy="100" r="7" />
          <circle cx="120" cy="100" r="7" />
          <path d="M76 128 Q100 140 124 128" fill="none" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
  }
}

function renderHeadgear(headgear) {
  switch (headgear) {
    case 'crown':
      return (
        <path
          d="M60 44 L72 64 L86 40 L100 64 L114 40 L128 64 L140 44 L134 74 L66 74 Z"
          fill="#ffd700"
          stroke="#b8960b"
          strokeWidth="2"
        />
      );
    case 'headband':
      return <rect x="30" y="60" width="140" height="16" rx="4" fill="#e63946" transform="rotate(-6 100 68)" />;
    case 'mask':
      return (
        <g>
          <path d="M40 92 Q100 30 160 92 L160 78 Q100 26 40 78 Z" fill="#3a6ff7" />
          <circle cx="80" cy="100" r="16" fill="none" stroke="#ffd700" strokeWidth="4" />
          <circle cx="120" cy="100" r="16" fill="none" stroke="#ffd700" strokeWidth="4" />
        </g>
      );
    case 'mohawk':
      return (
        <g fill="#9b59b6">
          <path d="M100 20 L108 60 L92 60 Z" />
          <path d="M84 34 L92 62 L78 62 Z" />
          <path d="M116 34 L108 62 L122 62 Z" />
        </g>
      );
    default:
      return null;
  }
}

function renderAccessory(accessory) {
  switch (accessory) {
    case 'shades':
      return (
        <g fill="#101018">
          <rect x="62" y="92" width="30" height="18" rx="4" />
          <rect x="108" y="92" width="30" height="18" rx="4" />
          <rect x="92" y="98" width="16" height="5" />
        </g>
      );
    case 'belt':
      return (
        <g>
          <rect x="52" y="150" width="96" height="22" rx="6" fill="#3a2c10" stroke="#b8960b" strokeWidth="2" />
          <circle cx="100" cy="161" r="13" fill="#ffd700" stroke="#b8960b" strokeWidth="2" />
          <circle cx="100" cy="161" r="5" fill="#3a2c10" />
        </g>
      );
    case 'cape':
      return (
        <path d="M30 120 Q100 210 170 120 L150 180 Q100 200 50 180 Z" fill="#e63946" opacity="0.9" />
      );
    default:
      return null;
  }
}

// Lightens (positive) or darkens (negative) a hex color.
function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
