import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

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

  return (
    <div style={{ padding: '3rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" className="muted" style={{ fontSize: '0.85rem' }}>← Back</Link>
          <h1 style={{ marginTop: '0.5rem', fontSize: '2.5rem' }}>
            {data.label || `Session — ${new Date(data.streamDate).toLocaleDateString()}`}
          </h1>
          <p className="muted">{data.races?.length || 0} races</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(data.races || []).map((race) => (
            <div key={race.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Race #{race.raceNumber}</h3>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{race._count?.results || 0} marbles</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
