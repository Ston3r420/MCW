import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { twitchLoginUrl } from '../lib/config';
import api from '../lib/api';
import MarblePortrait from '../components/MarblePortrait';
import {
  BODY_COLORS, PATTERNS, FACES, HEADGEAR, ACCESSORIES,
  DEFAULT_CHARACTER, normalizeCharacter,
} from '../lib/characterParts';
import './CharacterCreatorPage.css';

export default function CharacterCreatorPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(
    normalizeCharacter(user?.characterData) || DEFAULT_CHARACTER
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <div className="card text-center">
          <p>You need to <a href={twitchLoginUrl()}>login with Twitch</a> first.</p>
        </div>
      </div>
    );
  }

  const set = (key, value) => setCharacter((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch('/api/viewers/me', { characterData: character });
      setUser({ ...user, ...res.data.viewer });
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save character.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="creator-page">
      <div className="container">
        <div className="page-header">
          <h1>Character Creator</h1>
          <p className="muted">Build your marble. Mix and match the parts — this is the face of your career.</p>
        </div>

        <div className="creator-layout">
          {/* Live preview */}
          <div className="creator-preview card">
            <MarblePortrait character={character} size={220} />
            <div className="creator-preview-name">{user.ringName || user.displayName}</div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Character'}
            </button>
          </div>

          {/* Part pickers */}
          <div className="creator-options">
            <OptionGroup title="Marble Color">
              <div className="swatch-grid">
                {BODY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    className={`swatch ${character.bodyColor === c.id ? 'active' : ''}`}
                    style={{ background: c.value }}
                    title={c.label}
                    onClick={() => set('bodyColor', c.id)}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </OptionGroup>

            <ChipGroup title="Pattern" options={PATTERNS} value={character.pattern} onChange={(v) => set('pattern', v)} />
            <ChipGroup title="Face" options={FACES} value={character.face} onChange={(v) => set('face', v)} />
            <ChipGroup title="Headgear" options={HEADGEAR} value={character.headgear} onChange={(v) => set('headgear', v)} />
            <ChipGroup title="Accessory" options={ACCESSORIES} value={character.accessory} onChange={(v) => set('accessory', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionGroup({ title, children }) {
  return (
    <div className="option-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function ChipGroup({ title, options, value, onChange }) {
  return (
    <OptionGroup title={title}>
      <div className="chip-row">
        {options.map((o) => (
          <button
            key={o.id}
            className={`chip ${value === o.id ? 'active' : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </OptionGroup>
  );
}
