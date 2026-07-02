import React, { useState } from 'react';
import WrestlerPicker, { DEFAULT_CHARACTER } from '../components/WrestlerPicker';
import WrestlerAligner from '../components/WrestlerAligner';

export default function TestPickerPage() {
  const [characterData, setCharacterData] = useState(DEFAULT_CHARACTER);

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#ff4757' }}>Manual Override</h1>
        <p className="muted">
          AI alignment is disabled. You have full manual control using the <strong>Dev Alignment Tool</strong> below.<br/>
          (I've also fixed the browser caching bug so your changes will actually show up!)
        </p>
      </div>

      <div style={{ marginBottom: '4rem', padding: '2rem', background: '#111', borderRadius: '12px' }}>
        <WrestlerAligner value={characterData} onChange={setCharacterData} />
      </div>

      <div style={{ padding: '2rem', background: '#111', borderRadius: '12px' }}>
        <WrestlerPicker value={characterData} onChange={setCharacterData} />
      </div>

    </div>
  );
}
