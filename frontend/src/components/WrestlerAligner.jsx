import React, { useState } from 'react';
import api from '../lib/api';
import './WrestlerPicker.css';

export const LAYERS = [
  { key: 'marble',   label: 'Marble',      count: 18, prefix: 'Marble' },
  { key: 'armsLegs', label: 'Arms & Legs', count: 6,  prefix: 'ArmsLegs' },
  { key: 'eyes',     label: 'Eyes',        count: 12, prefix: 'Eye' },
  { key: 'hat',      label: 'Hat',         count: 12, prefix: 'Hat' },
];

// Read from assets_raw in the Dev Tool so we always manipulate the pristine unbaked images!
const assetPath = (prefix, index) => `/assets_raw/${prefix}${index}.png`;

export const DEFAULT_CHARACTER = {
  armsLegs: 1,
  marble: 1,
  eyes: 1,
  hat: 1,
};

export default function WrestlerAligner({ value, onChange }) {
  const character = value ?? DEFAULT_CHARACTER;
  
  const [transforms, setTransforms] = useState({});
  const [activeLayer, setActiveLayer] = useState(LAYERS[0].key);
  const [lockedLayers, setLockedLayers] = useState([]);
  const [linkedLayers, setLinkedLayers] = useState([]);
  const [hiddenLayers, setHiddenLayers] = useState([]);
  const [globalScale, setGlobalScale] = useState(0.35); // Default to zoomed out
  
  const [layerOrder, setLayerOrder] = useState(LAYERS.map(l => l.key));

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isAiAligning, setIsAiAligning] = useState(false);
  const [aiAlignMessage, setAiAlignMessage] = useState(null);

  const handleAiAlign = async (activeOnly = false) => {
    setIsAiAligning(true);
    setAiAlignMessage(null);
    try {
      const res = await api.post('/api/viewers/ai-align-layers', {
        character,
        activeLayerOnly: activeOnly ? activeLayer : null,
      });

      if (res.data && res.data.transforms) {
        const returnedTransforms = res.data.transforms;
        setTransforms((prev) => {
          const next = { ...prev };
          Object.keys(returnedTransforms).forEach((layerKey) => {
            if (activeOnly && layerKey !== activeLayer) return;
            const idx = character[layerKey];
            if (idx) {
              const transformData = returnedTransforms[layerKey];
              next[`${layerKey}-${idx}`] = {
                x: transformData.x || 0,
                y: transformData.y || 0,
                scale: transformData.scale || 1,
              };
            }
          });
          return next;
        });
        setAiAlignMessage(res.data.explanation || '✨ AI alignment successfully calculated and applied!');
      }
    } catch (err) {
      console.error(err);
      setAiAlignMessage(err.response?.data?.error || '⚠️ Failed to align layers with AI.');
    } finally {
      setIsAiAligning(false);
    }
  };

  const getTransform = (layerKey, idx) => {
    return transforms[`${layerKey}-${idx}`] || { x: 0, y: 0, scale: 1 };
  };

  const handleSelect = (layerKey, index) => {
    onChange({ ...character, [layerKey]: index });
    setActiveLayer(layerKey);
  };

  const handleTransformChange = (axis, val) => {
    const idx = character[activeLayer];
    const key = `${activeLayer}-${idx}`;
    setTransforms(prev => ({
      ...prev,
      [key]: {
        ...getTransform(activeLayer, idx),
        [axis]: parseFloat(val)
      }
    }));
  };

  const handlePointerDown = (e, layerKey) => {
    const idx = character[layerKey];
    const key = `${layerKey}-${idx}`;
    if (lockedLayers.includes(key)) return;
    
    setActiveLayer(layerKey);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e, layerKey) => {
    const idx = character[layerKey];
    const key = `${layerKey}-${idx}`;
    if (!isDragging || activeLayer !== layerKey || lockedLayers.includes(key)) return;
    
    const dx = (e.clientX - dragStart.x) / globalScale;
    const dy = (e.clientY - dragStart.y) / globalScale;
    setDragStart({ x: e.clientX, y: e.clientY });

    setTransforms(prev => {
      const next = { ...prev };
      
      if (linkedLayers.includes(layerKey)) {
        linkedLayers.forEach(lKey => {
          const lIdx = character[lKey];
          const specificKey = `${lKey}-${lIdx}`;
          const currentTransform = prev[specificKey] || { x: 0, y: 0, scale: 1 };
          next[specificKey] = {
            ...currentTransform,
            x: currentTransform.x + dx,
            y: currentTransform.y + dy
          };
        });
      } else {
        const currentTransform = prev[key] || { x: 0, y: 0, scale: 1 };
        next[key] = {
          ...currentTransform,
          x: currentTransform.x + dx,
          y: currentTransform.y + dy
        };
      }
      return next;
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const moveLayerUp = () => {
    const idx = layerOrder.indexOf(activeLayer);
    if (idx < layerOrder.length - 1) {
      const newOrder = [...layerOrder];
      newOrder[idx] = newOrder[idx + 1];
      newOrder[idx + 1] = activeLayer;
      setLayerOrder(newOrder);
    }
  };

  const moveLayerDown = () => {
    const idx = layerOrder.indexOf(activeLayer);
    if (idx > 0) {
      const newOrder = [...layerOrder];
      newOrder[idx] = newOrder[idx - 1];
      newOrder[idx - 1] = activeLayer;
      setLayerOrder(newOrder);
    }
  };

  const toggleLock = () => {
    const idx = character[activeLayer];
    const key = `${activeLayer}-${idx}`;
    setLockedLayers(prev => 
      prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]
    );
  };

  const toggleLink = (layerKey) => {
    setLinkedLayers(prev => 
      prev.includes(layerKey) ? prev.filter(k => k !== layerKey) : [...prev, layerKey]
    );
  };

  const toggleHide = (layerKey, e) => {
    e.stopPropagation();
    setHiddenLayers(prev => 
      prev.includes(layerKey) ? prev.filter(k => k !== layerKey) : [...prev, layerKey]
    );
  };

  const activeIdx = character[activeLayer];
  const activeTransformKey = `${activeLayer}-${activeIdx}`;
  const isLocked = lockedLayers.includes(activeTransformKey);
  const activeTransform = getTransform(activeLayer, activeIdx);

  return (
    <div className="wrestler-picker" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div 
          className="wrestler-preview-wrap" 
          style={{ 
            width: 1000, 
            height: 1000, 
            position: 'relative', 
            overflow: 'hidden',
            backgroundColor: '#2b2b36',
            borderRadius: '8px',
            touchAction: 'none'
          }}
        >
          <div style={{ width: '100%', height: '100%', transform: `scale(${globalScale})`, transformOrigin: 'center center' }}>
            {layerOrder.map((layerKey, i) => {
              if (hiddenLayers.includes(layerKey)) return null;

              const layerDef = LAYERS.find(l => l.key === layerKey);
              const idx = character[layerKey];
              const t = getTransform(layerKey, idx);
              const specificAssetKey = `${layerKey}-${idx}`;
              const assetIsLocked = lockedLayers.includes(specificAssetKey);
              
              return (
                <img
                  key={layerKey}
                  src={assetPath(layerDef.prefix, idx)}
                  alt={layerDef.label}
                  draggable={false}
                  onPointerDown={(e) => handlePointerDown(e, layerKey)}
                  onPointerMove={(e) => handlePointerMove(e, layerKey)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    zIndex: i,
                    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
                    cursor: assetIsLocked ? 'default' : (activeLayer === layerKey && isDragging ? 'grabbing' : 'grab'),
                    pointerEvents: assetIsLocked ? 'none' : 'auto',
                    filter: linkedLayers.includes(layerKey) && activeLayer !== layerKey ? 'drop-shadow(0 0 5px rgba(0, 229, 255, 0.5))' : 'none'
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ background: '#1e1e24', padding: '15px', borderRadius: '8px', border: '1px solid #444', width: '1000px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#ff4757' }}>🚧 Dev Alignment Tool</h3>
          
          {/* AI Auto-Align Section */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b2e 0%, #2a1b3d 100%)',
            border: '1px solid #a855f7',
            padding: '12px 15px',
            borderRadius: '6px',
            marginBottom: '15px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ color: '#f3e8ff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🤖 Gemini AI Layer Aligner
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#c084fc' }}>
                  Let Gemini analyze the image layers and automatically compute perfect x, y, and scale alignment.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isAiAligning}
                  onClick={() => handleAiAlign(true)}
                  style={{
                    padding: '6px 12px',
                    background: '#6b21a8',
                    color: '#fff',
                    border: '1px solid #a855f7',
                    borderRadius: '4px',
                    cursor: isAiAligning ? 'not-allowed' : 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                  }}
                >
                  {isAiAligning ? '⚡ Aligning...' : `✨ Auto-Align ${LAYERS.find(l=>l.key===activeLayer).label}`}
                </button>
                <button
                  type="button"
                  disabled={isAiAligning}
                  onClick={() => handleAiAlign(false)}
                  style={{
                    padding: '6px 12px',
                    background: '#9333ea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isAiAligning ? 'not-allowed' : 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                  }}
                >
                  {isAiAligning ? '⚡ Aligning All...' : '🚀 Auto-Align ALL Layers'}
                </button>
              </div>
            </div>
            {aiAlignMessage && (
              <div style={{ marginTop: '8px', fontSize: '0.82rem', color: aiAlignMessage.startsWith('⚠️') ? '#f87171' : '#e9d5ff', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px' }}>
                {aiAlignMessage}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
              Editing: <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{LAYERS.find(l=>l.key===activeLayer).label} {activeIdx}</strong>
              {isLocked && <span style={{ color: '#ff4757', marginLeft: '8px' }}>(DONE)</span>}
            </p>
            <button 
              onClick={toggleLock} 
              style={{ 
                padding: '8px 16px', 
                background: isLocked ? '#333' : '#ff4757', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isLocked ? `🔓 Unlock` : `🔒 Lock Position`}
            </button>
          </div>

          <div style={{ marginBottom: '15px', padding: '10px', background: '#2a2a35', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#00e5ff' }}>
              🔗 Lock Pieces Together (Group Dragging)
            </strong>
            <div style={{ display: 'flex', gap: '15px' }}>
              {LAYERS.map(l => (
                <label key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={linkedLayers.includes(l.key)} 
                    onChange={() => toggleLink(l.key)} 
                  />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={moveLayerDown} style={{ flex: 1, padding: '5px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ↓ Move Back
            </button>
            <button onClick={moveLayerUp} style={{ flex: 1, padding: '5px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ↑ Move Front
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              X Offset ({activeTransform.x.toFixed(1)}px)
              <input type="range" min="-1000" max="1000" step="1" value={activeTransform.x} disabled={isLocked} onChange={(e) => handleTransformChange('x', e.target.value)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              Y Offset ({activeTransform.y.toFixed(1)}px)
              <input type="range" min="-1000" max="1000" step="1" value={activeTransform.y} disabled={isLocked} onChange={(e) => handleTransformChange('y', e.target.value)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              Scale ({activeTransform.scale.toFixed(2)}x)
              <input type="range" min="0.1" max="3" step="0.05" value={activeTransform.scale} disabled={isLocked} onChange={(e) => handleTransformChange('scale', e.target.value)} />
            </label>
          </div>

          <hr style={{ borderColor: '#444', margin: '15px 0' }} />

          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#00e5ff', fontWeight: 'bold' }}>
            GLOBAL ZOOM
            <input type="range" min="0.1" max="3" step="0.05" value={globalScale} onChange={(e) => setGlobalScale(parseFloat(e.target.value))} />
          </label>

          <div style={{ marginTop: '15px' }}>
            <strong style={{ fontSize: '0.8rem' }}>Export Data:</strong>
            <textarea readOnly value={JSON.stringify({ globalScale, order: layerOrder, transforms }, null, 2)} style={{ width: '100%', height: '150px', marginTop: '5px', background: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '0.8rem' }} />
          </div>
        </div>

      </div>

      <div className="wrestler-layers" style={{ flex: 1, maxHeight: '1000px', overflowY: 'auto' }}>
        {LAYERS.map((layer) => {
          const isHidden = hiddenLayers.includes(layer.key);
          
          return (
            <div key={layer.key} className="wrestler-layer" onClick={() => setActiveLayer(layer.key)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="layer-label" style={{ color: activeLayer === layer.key ? '#ff4757' : 'inherit' }}>
                  {layer.label} {activeLayer === layer.key && '(Editing)'}
                </span>
                <button onClick={(e) => toggleHide(layer.key, e)} style={{ background: 'transparent', border: '1px solid #444', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '2px 8px' }}>
                  {isHidden ? '🙈 Hidden' : '👁️ Visible'}
                </button>
              </div>
              
              {!isHidden && (
                <div className="layer-options" role="radiogroup" aria-label={`${layer.label} options`}>
                  {Array.from({ length: layer.count }, (_, i) => i + 1).map((idx) => {
                    const selected = character[layer.key] === idx;
                    const specificAssetKey = `${layer.key}-${idx}`;
                    const assetIsLocked = lockedLayers.includes(specificAssetKey);
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`layer-thumb${selected ? ' selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleSelect(layer.key, idx); }}
                        aria-pressed={selected}
                      >
                        {assetIsLocked && <div style={{position:'absolute', top:2, right:2, fontSize:'0.7rem'}}>🔒</div>}
                        <img src={assetPath(layer.prefix, idx)} alt={`${layer.label} ${idx}`} draggable={false} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
