import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import './EventsPage.css';

export default function EventsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/sessions?limit=50')
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="events-page">
      <div className="container">
        <div className="page-header">
          <h1>Event Recaps</h1>
          <p className="muted">Every stream is a show. Catch up on the story so far.</p>
        </div>

        {loading ? (
          <div className="loading-centered"><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="card text-center" style={{ padding: '4rem' }}>
            <p className="muted">No events yet. The first bell hasn't rung.</p>
          </div>
        ) : (
          <div className="events-grid">
            {sessions.map((s) => (
              <Link key={s.id} to={`/sessions/${s.id}`} className="event-card card">
                <div className="event-date muted">{new Date(s.streamDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                <h3 className="event-title">{s.label || 'MCW Live'}</h3>
                <div className="event-meta">
                  <span>{s._count?.races ?? 0} races</span>
                  {s.eventCard
                    ? <span className="teal">Recap ready →</span>
                    : <span className="muted">Recap pending</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
