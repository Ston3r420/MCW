import React from 'react';
import { LAYERS, DEFAULT_CHARACTER } from './WrestlerPicker';

const assetPath = (prefix, index) => `/assets/${prefix}${index}.png?v=5`;

/**
 * Renders the layered wrestler character as a static preview.
 *
 * Props:
 *   characterData  - { marble, armsLegs, eyes, hat } — falls back to DEFAULT_CHARACTER
 *   size           - pixel size of the square preview (default 120)
 *   className      - extra CSS class
 *   style          - extra inline styles on the wrapper
 */
export default function WrestlerAvatar({ characterData, size = 120, className = '', style = {} }) {
  const character = characterData ?? DEFAULT_CHARACTER;

  return (
    <div
      className={`wrestler-avatar ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid var(--color-teal)',
        boxShadow: '0 0 16px var(--color-teal-glow)',
        background: 'var(--color-bg-elevated)',
        ...style,
      }}
    >
      {LAYERS.map((layer, i) => {
        const idx = character[layer.key] ?? 1;
        return (
          <img
            key={layer.key}
            src={assetPath(layer.prefix, idx)}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: i,
            }}
          />
        );
      })}
    </div>
  );
}
