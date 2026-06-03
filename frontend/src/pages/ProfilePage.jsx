import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import './ProfilePage.css';

export default function ProfilePage() {
  const { identifier } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // If no identifier in URL, show the logged-in user's profile
  const target = identifier || user?.twitchLogin;

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    setError(null);

    api.get(`/api/viewers/${target}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('Wrestler not found.');
        } else {
          setError('Failed to load profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [target]);

  if (!target) return <Navigate to="/login" replace />;
  if (loading) return <div className="loading-centered"><div className="spinner" /></div>;
  if (error) return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div className="card text-center">
        <p className="muted">{error}</p>
      </div>
    </div>
  );
  if (!data) return null;

  const { viewer, stats, titles, recentResults } = data;
  const name = viewer.ringName || viewer.displayName;
  const isOwnProfile = user?.id === viewer.id;
  const streak = stats?.currentStreak || 0;

  return (
    <div className="profile-page">
      <div className="container">

        {/* Profile header */}
        <div className="profile-header card">
          <div className="profile-avatar-wrap">
            {viewer.avatarUrl ? (
              <img src={viewer.avatarUrl} alt={name} className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">{name[0]}</div>
            )}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{name}</h1>
            {viewer.hometown && (
              <div className="profile-hometown muted">📍 {viewer.hometown}</div>
            )}
            {viewer.bio && (
              <p className="profile-bio">{viewer.bio}</p>
            )}
            {titles.length > 0 && (
              <div className="profile-titles">
                {titles.map((t) => (
                  <span key={t.id} className="title-badge gold">
                    🏆 {t.belt.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {isOwnProfile && (
            <a href="/setup" className="btn btn-secondary edit-btn">Edit Profile</a>
          )}
        </div>

        <div className="profile-body">
          {/* Stats */}
          <div className="profile-stats card">
            <h2>Career Stats</h2>
            <div className="stats-grid">
              <StatBox label="Wins" value={stats?.wins ?? 0} className="stat-win" />
              <StatBox label="Losses" value={stats?.losses ?? 0} className="stat-loss" />
              <StatBox label="Total Races" value={stats?.totalRaces ?? 0} />
              <StatBox
                label="Win Rate"
                value={stats?.totalRaces > 0
                  ? `${Math.round((stats.wins / stats.totalRaces) * 100)}%`
                  : '—'}
              />
              <StatBox
                label="Current Streak"
                value={streak === 0 ? '—' : streak > 0 ? `+${streak} 🔥` : `${streak} 📉`}
                className={streak >= 5 ? 'stat-win' : streak <= -5 ? 'stat-loss' : ''}
              />
              <StatBox label="Best Win Streak" value={stats?.longestWinStreak ?? 0} />
            </div>

            {stats && (
              <div className="wrestler-status">
                {getStatusLabel(streak, stats.wins, stats.losses)}
              </div>
            )}
          </div>

          {/* Recent results */}
          <div className="recent-results card">
            <h2>Recent Races</h2>
            {recentResults.length === 0 ? (
              <p className="muted">No races yet.</p>
            ) : (
              <div className="results-list">
                {recentResults.map((r) => {
                  const isWin = r.placement === 1;
                  const isTop3 = r.placement <= 3;
                  return (
                    <div key={r.id} className={`result-row ${isWin ? 'result-win' : ''}`}>
                      <span className={`placement ${isWin ? 'teal' : isTop3 ? 'gold' : 'muted'}`}>
                        #{r.placement}
                      </span>
                      <span className="result-label">
                        {isWin ? 'WIN' : isTop3 ? 'Top 3' : 'Loss'}
                      </span>
                      <span className="result-of muted">
                        of {r.totalMarbles} marbles
                      </span>
                      <span className="result-date muted">
                        {new Date(r.race.finishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatBox({ label, value, className = '' }) {
  return (
    <div className="stat-box">
      <div className={`stat-value ${className}`}>{value}</div>
      <div className="stat-label muted">{label}</div>
    </div>
  );
}

function getStatusLabel(streak, wins, losses) {
  const total = wins + losses;
  if (streak >= 10) return '🔥 UNSTOPPABLE — on a monster run';
  if (streak >= 5) return '🔥 On a push';
  if (streak >= 3) return '📈 Hot streak';
  if (streak <= -10) return '💀 Absolute jobber. Enhancement talent at best.';
  if (streak <= -5) return '📉 Enhancement talent — losing streak territory';
  if (streak <= -3) return '😬 Cold streak';
  if (total < 5) return '🆕 Newcomer — career just getting started';
  const wr = wins / total;
  if (wr >= 0.6) return '⭐ Contender — consistently near the top';
  if (wr <= 0.3) return '😔 Jobber territory';
  return '🎭 Mid-card — solid, but not a title threat yet';
}
