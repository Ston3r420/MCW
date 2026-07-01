import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { twitchLoginUrl } from '../lib/config';
import './Layout.css';

export default function Layout({ children }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="site-logo">
            <span className="logo-mcw">MCW</span>
            <span className="logo-sub">Marbles Championship Wrestling</span>
          </Link>

          <nav className="site-nav">
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/events">Events</Link>
            {user && <Link to="/profile">My Profile</Link>}
            {user?.isAdmin && <Link to="/admin">Admin</Link>}
          </nav>

          <div className="header-auth">
            {loading ? null : user ? (
              <div className="user-menu">
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="user-avatar"
                />
                <span className="user-name">
                  {user.ringName || user.displayName}
                </span>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </div>
            ) : (
              <a href={twitchLoginUrl()} className="btn btn-primary twitch-btn">
                <TwitchIcon />
                Login with Twitch
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="muted">MCW · Where every roll counts.</p>
        </div>
      </footer>
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
