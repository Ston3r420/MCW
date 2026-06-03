import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import './ProfileSetupPage.css';

export default function ProfileSetupPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [ringName, setRingName] = useState(user?.ringName || '');
  const [hometown, setHometown] = useState(user?.hometown || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <div className="card text-center">
          <p>You need to <a href="https://mcw-backend-7hev.onrender.com/auth/twitch">login with Twitch</a> first.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
      });

      setUser({ ...user, ...res.data.viewer });
      navigate('/profile');
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

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary submit-btn" disabled={saving}>
              {saving ? 'Saving...' : user.ringName ? 'Save Changes' : 'Enter the Ring →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
