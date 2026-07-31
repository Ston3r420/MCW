import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { BACKEND_URL } from '../lib/api';
import WrestlerPicker, { DEFAULT_CHARACTER } from '../components/WrestlerPicker';
import WrestlerAvatar from '../components/WrestlerAvatar';
import './ProfileSetupPage.css';

export default function ProfileSetupPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [ringName, setRingName] = useState(user?.ringName || '');
  const [hometown, setHometown] = useState(user?.hometown || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [characterData, setCharacterData] = useState(user?.characterData || DEFAULT_CHARACTER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [geminiResult, setGeminiResult] = useState(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <div className="card text-center">
          <p>You need to <a href={`${BACKEND_URL}/auth/twitch`}>login with Twitch</a> first.</p>
        </div>
      </div>
    );
  }

  const handleGenerateAI = async (styleTheme) => {
    setAiError(null);
    setAiGenerating(true);
    const themeToUse = styleTheme || aiPrompt;
    try {
      const res = await api.post('/api/viewers/ai-generate-gimmick', { style: themeToUse });
      if (res.data) {
        if (res.data.ringName) setRingName(res.data.ringName);
        if (res.data.hometown) setHometown(res.data.hometown);
        if (res.data.bio) setBio(res.data.bio);
        if (res.data.characterData) setCharacterData(res.data.characterData);
      }
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.error || 'Failed to generate character with AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGeminiResult(null);

    if (!ringName.trim()) {
      setError('Ring name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch('/api/viewers/me', {
        ringName: ringName.trim(),
        hometown: hometown.trim(),
        bio: bio.trim(),
        characterData,
      });

      setUser({ ...user, ...res.data.viewer });

      // Show Gemini feedback briefly, then navigate to profile
      const check = res.data.characterCheck;
      if (check?.feedback) {
        setGeminiResult(check);
        setTimeout(() => navigate('/profile'), 3500);
      } else {
        navigate('/profile');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-page">
      <div className="container">
        <div className="setup-card card">
          <div className="setup-header">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt={user.displayName} className="setup-avatar" />
            )}
            <div>
              <h1>Enter the Ring</h1>
              <p className="muted">Set up your wrestler profile, {user.displayName}.</p>
            </div>
          </div>

          {/* Gemini character approval banner */}
          {geminiResult && (
            <div className={`gemini-banner ${geminiResult.passed ? 'gemini-pass' : 'gemini-warn'}`}>
              <div className="gemini-banner-inner">
                <WrestlerAvatar characterData={characterData} size={64} />
                <div className="gemini-banner-text">
                  <div className="gemini-score">
                    {geminiResult.passed ? '✅' : '⚠️'} MCW Score: {geminiResult.score ?? '—'}/100
                  </div>
                  <div className="gemini-feedback">{geminiResult.feedback}</div>
                  <div className="gemini-redirect muted">Heading to your profile…</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Character Creator Widget */}
          <div className="ai-creator-card" style={{
            backgroundColor: '#1e1b2e',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🤖</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f3e8ff', fontWeight: 700 }}>
                AI Character Creator & Gimmick Generator
              </h2>
            </div>
            <p className="muted" style={{ fontSize: '0.88rem', margin: '0 0 1rem 0', color: '#d8b4fe' }}>
              Want Gemini AI to auto-generate a complete wrestler gimmick, ring name, backstory, and outfit for you?
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[
                'Masked Heel',
                'High Flyer',
                '80s Neon Icon',
                'Hardcore Brawler',
                'Cyberpunk Marble',
                'Surprise Me',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => handleGenerateAI(preset === 'Surprise Me' ? '' : preset)}
                  style={{
                    backgroundColor: '#3b0764',
                    color: '#e9d5ff',
                    border: '1px solid #7e22ce',
                    borderRadius: '20px',
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.8rem',
                    cursor: aiGenerating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                >
                  ⚡ {preset}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Or type a custom theme (e.g. 'Space Pirate', 'Gold Miner', 'Anime Rival')..."
                disabled={aiGenerating}
                style={{
                  flex: 1,
                  backgroundColor: '#0f0d19',
                  border: '1px solid #6b21a8',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '0.5rem 0.8rem',
                  fontSize: '0.88rem',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerateAI();
                  }
                }}
              />
              <button
                type="button"
                disabled={aiGenerating}
                onClick={() => handleGenerateAI()}
                style={{
                  backgroundColor: '#9333ea',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1.1rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: aiGenerating ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {aiGenerating ? '⚡ Generating...' : '✨ Generate AI Gimmick'}
              </button>
            </div>

            {aiError && (
              <div style={{ marginTop: '0.5rem', color: '#f87171', fontSize: '0.82rem' }}>
                ⚠️ {aiError}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="field">
              <label htmlFor="ringName">
                Ring Name <span className="required">*</span>
              </label>
              <input
                id="ringName"
                type="text"
                value={ringName}
                onChange={(e) => setRingName(e.target.value)}
                placeholder="e.g. GoldRush, The Silver Bullet, CrimsonRoll"
                maxLength={50}
                required
                autoFocus
              />
              <span className="field-hint">{ringName.length}/50</span>
            </div>

            <div className="field">
              <label htmlFor="hometown">Hometown</label>
              <input
                id="hometown"
                type="text"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                placeholder="e.g. The Marble Mines of Colorado"
                maxLength={100}
              />
            </div>

            <div className="field">
              <label htmlFor="bio">
                Character Description <span className="field-hint-inline">(optional)</span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Who is your wrestler? What's their deal? Heel or face? What do they want?"
                maxLength={500}
                rows={4}
              />
              <span className="field-hint">{bio.length}/500</span>
            </div>

            <div className="field">
              <label>Build Your Wrestler</label>
              <WrestlerPicker value={characterData} onChange={setCharacterData} />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary submit-btn" disabled={saving}>
              {saving ? '🤖 Gemini is checking your character…' : user.ringName ? 'Save Changes' : 'Enter the Ring →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
