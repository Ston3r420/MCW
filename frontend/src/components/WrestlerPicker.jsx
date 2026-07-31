import React from 'react';
import './WrestlerPicker.css';

export const LAYERS = [
  { key: 'marble',   label: 'Marble',      count: 18, prefix: 'Marble' },
  { key: 'armsLegs', label: 'Arms & Legs', count: 6,  prefix: 'ArmsLegs' },
  { key: 'eyes',     label: 'Eyes',        count: 12, prefix: 'Eye' },
  { key: 'hat',      label: 'Hat',         count: 12, prefix: 'Hat' },
];

const assetPath = (prefix, index) => `/assets/${prefix}${index}.png?v=5`;

export const DEFAULT_CHARACTER = {
  armsLegs: 1,
  marble: 1,
  eyes: 1,
  hat: 1,
};

export default function WrestlerPicker({ value, onChange }) {
  const character = value ?? DEFAULT_CHARACTER;

  const handleSelect = (layerKey, index) => {
    onChange({ ...character, [layerKey]: index });
  };

  return (
    <div className="wrestler-picker" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      
      {/* Left Column: Preview */}
      <div 
        className="wrestler-preview-wrap" 
        style={{ 
          width: 300, 
          height: 300, 
          position: 'relative', 
          overflow: 'hidden',
          backgroundColor: '#2b2b36',
          borderRadius: '8px',
          border: '2px solid #ff4757',
          flexShrink: 0
        }}
      >
        {LAYERS.map((layer, i) => {
          const idx = character[layer.key];
          return (
            <img
              key={layer.key}
              src={assetPath(layer.prefix, idx)}
              alt={layer.label}
              draggable={false}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: i
              }}
            />
          );
        })}
      </div>

      {/* Right Column: Asset Pickers */}
      <div className="wrestler-layers" style={{ flex: 1, maxHeight: '600px', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#00e5ff' }}>✨ The Actual Character Creator ✨</h3>
        <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '15px' }}>
          This uses the baked assets from <strong style={{color:'#fff'}}>/public/assets</strong>. There is absolutely NO messy position or scale math used here. It natively stacks them!
        </p>

        {LAYERS.map((layer) => (
          <div key={layer.key} className="wrestler-layer">
            <span className="layer-label">{layer.label}</span>
            <div className="layer-options" role="radiogroup" aria-label={`${layer.label} options`}>
              {Array.from({ length: layer.count }, (_, i) => i + 1).map((idx) => {
                const selected = character[layer.key] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`layer-thumb${selected ? ' selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(layer.key, idx);
                    }}
                    aria-pressed={selected}
                    aria-label={`${layer.label} option ${idx}`}
                  >
                    <img
                      src={assetPath(layer.prefix, idx)}
                      alt={`${layer.label} ${idx}`}
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
