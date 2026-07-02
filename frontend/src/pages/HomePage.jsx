import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { BACKEND_URL } from '../lib/api';
import './HomePage.css';

export default function HomePage() {
  const { user } = useAuth();
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/leaderboard/champions')
      .then((res) => setChampions(res.data.champions || []))
      .catch(() => setChampions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-eyebrow">⚡ Live Season Active</div>
          <h1 className="hero-title">
            Marbles<br />
            <span className="teal">Championship</span><br />
            Wrestling
          </h1>
          <p className="hero-tagline">
            Where every roll counts. Your marble has a wrestling career.<br />
            Track it, build it, become the champion.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/profile" className="btn btn-primary hero-cta">
                My Career →
              </Link>
            ) : (
              <a href={`${BACKEND_URL}/auth/twitch`} className="btn btn-primary hero-cta">
                <TwitchIcon /> Login to Enter the Ring
              </a>
            )}
            <Link to="/leaderboard" className="btn btn-secondary hero-cta">
              View Leaderboard
            </Link>
          </div>
        </div>
        <div className="hero-bg-glow" aria-hidden="true" />
      </section>

      {/* Current Champions */}
      <section className="champions-section">
        <div className="container">
          <h2 className="section-title">Current Champions</h2>
          {loading ? (
            <div className="loading-centered"><div className="spinner" /></div>
          ) : champions.length === 0 ? (
            <p className="muted text-center" style={{ padding: '2rem 0' }}>
              No champions yet — titles are earned in the ring.
            </p>
          ) : (
            <div className="champions-grid">
              {champions.map((reign) => (
                <ChampionCard key={reign.id} reign={reign} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step card">
              <div className="step-number">01</div>
              <h3>Login with Twitch</h3>
              <p className="muted">Your Twitch account is your wrestler. No separate signup.</p>
            </div>
            <div className="step card">
              <div className="step-number">02</div>
              <h3>Race every stream</h3>
              <p className="muted">Every marble race gets logged automatically. Wins, losses, placements — all tracked.</p>
            </div>
            <div className="step card">
              <div className="step-number">03</div>
              <h3>Build your career</h3>
              <p className="muted">
                Streak into contender status. Become a rival. Win the belt.
                Or spiral into jobber hell. The site tells your story.
              </p>
            </div>
            <div className="step card">
              <div className="step-number">04</div>
              <h3>Watch the drama unfold</h3>
              <p className="muted">Weekly event recaps, auto-detected rivalries, title changes. The streamer just runs the show.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChampionCard({ reign }) {
  const name = reign.viewer.ringName || reign.viewer.displayName;
  const daysHeld = Math.floor((Date.now() - new Date(reign.wonAt)) / (1000 * 60 * 60 * 24));

  return (
    <div className="champion-card card">
      <div className="champion-belt-name gold">{reign.belt.shortName}</div>
      {reign.viewer.avatarUrl && (
        <img
          src={reign.viewer.avatarUrl}
          alt={name}
          className="champion-avatar"
        />
      )}
      <div className="champion-name">{name}</div>
      {reign.viewer.hometown && (
        <div className="champion-hometown muted">from {reign.viewer.hometown}</div>
      )}
      <div className="champion-days muted">{daysHeld === 0 ? 'Crowned today' : `${daysHeld}d reign`}</div>
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
