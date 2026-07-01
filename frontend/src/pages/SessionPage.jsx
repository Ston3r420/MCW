import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import './SessionPage.css';

export default function SessionPage() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/sessions/${sessionId}`)
      .then((res) => setData(res.data.session))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="loading-centered"><div className="spinner" /></div>;
  if (!data) return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div className="card text-center"><p className="muted">Session not found.</p></div>
    </div>
  );

  const card = data.eventCard?.data;
  const title = data.label || `Session — ${new Date(data.streamDate).toLocaleDateString()}`;

  return (
    <div className="session-page">
      <div className="container">
        <div className="session-header">
          <Link to="/events" className="muted back-link">← All events</Link>
          <div className="session-eyebrow teal">Event Recap</div>
          <h1>{title}</h1>
          <p className="muted">
            {new Date(data.streamDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}{data.races?.length || 0} races
          </p>
        </div>

        {!card ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <p className="muted">No recap has been generated for this event yet.</p>
          </div>
        ) : (
          <>
            {card.momentOfTheNight && (
              <div className="moment card">
                <div className="moment-label">🌟 Moment of the Night</div>
                <div className="moment-text">{card.momentOfTheNight}</div>
              </div>
            )}

            <div className="recap-grid">
              {card.mainEvent?.winner && (
                <div className="card recap-block">
                  <h2>Main Event</h2>
                  <div className="main-event">
                    {card.mainEvent.winner.avatarUrl && (
                      <img src={card.mainEvent.winner.avatarUrl} alt="" className="recap-avatar" />
                    )}
                    <div>
                      <div className="recap-name">{card.mainEvent.winner.name}</div>
                      <div className="muted">Won Race #{card.mainEvent.raceNumber} of {card.mainEvent.totalMarbles} marbles</div>
                    </div>
                  </div>
                </div>
              )}

              {card.topPerformers?.length > 0 && (
                <div className="card recap-block">
                  <h2>Top Performers</h2>
                  <ul className="recap-list">
                    {card.topPerformers.map((p, i) => (
                      <li key={i}>
                        <span className="gold">{['🥇', '🥈', '🥉'][i] || '•'}</span>
                        <span className="recap-name-inline">{p.name}</span>
                        <span className="muted">{p.wins}W / {p.races} races</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {card.titleChanges?.length > 0 && (
                <div className="card recap-block">
                  <h2>Title Changes</h2>
                  <ul className="recap-list">
                    {card.titleChanges.map((t, i) => (
                      <li key={i}>
                        <span>🏆</span>
                        <span className="recap-name-inline gold">{t.newChampion.name}</span>
                        <span className="muted">won the {t.shortName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {card.newRivalries?.length > 0 && (
                <div className="card recap-block">
                  <h2>Rivalries Heating Up</h2>
                  <ul className="recap-list">
                    {card.newRivalries.map((r, i) => (
                      <li key={i}>
                        <span>🔥</span>
                        <span className="recap-name-inline">{r.a} vs {r.b}</span>
                        <span className="muted">{r.closeFinishes} close finishes</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {card.hotStreaks?.length > 0 && (
                <div className="card recap-block">
                  <h2>On a Push</h2>
                  <ul className="recap-list">
                    {card.hotStreaks.map((s, i) => (
                      <li key={i}>
                        <span>📈</span>
                        <span className="recap-name-inline">{s.name}</span>
                        <span className="muted">+{s.streak} · {s.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {card.coldStreaks?.length > 0 && (
                <div className="card recap-block">
                  <h2>Jobber Watch</h2>
                  <ul className="recap-list">
                    {card.coldStreaks.map((s, i) => (
                      <li key={i}>
                        <span>📉</span>
                        <span className="recap-name-inline">{s.name}</span>
                        <span className="muted">{s.streak} · {s.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Race breakdown */}
        {data.races?.length > 0 && (
          <div className="races-section">
            <h2>Race Card</h2>
            <div className="races-list">
              {data.races.map((race) => (
                <div key={race.id} className="race-row card">
                  <h3>Race #{race.raceNumber}</h3>
                  <span className="muted">{race._count?.results || 0} marbles</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
