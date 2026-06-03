import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function LoginPage() {
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <div style={{ padding: '5rem 0' }}>
      <div className="container">
        <div className="card text-center" style={{ maxWidth: 400, margin: '0 auto', padding: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Enter the Ring</h1>
          <p className="muted" style={{ marginBottom: '2rem' }}>
            Log in with your Twitch account to track your marble's wrestling career.
          </p>

          {error === 'auth_failed' && (
            <div style={{
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-red)',
              padding: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}>
              Login failed. Please try again.
            </div>
          )}

          <a href={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/auth/twitch`} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 1.5rem', width: '100%', justifyContent: 'center' }}>
            <TwitchIcon />
            Login with Twitch
          </a>

          <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
            No password required. We only read your Twitch username and profile picture.
          </p>
        </div>
      </div>
    </div>
  );
}

function TwitchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
  );
}
