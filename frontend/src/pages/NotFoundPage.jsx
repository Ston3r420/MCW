import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ padding: '6rem 0', textAlign: 'center' }}>
      <div className="container">
        <h1 style={{ fontSize: '6rem', color: 'var(--color-teal)', marginBottom: '1rem' }}>404</h1>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Marble Not Found</h2>
        <p className="muted" style={{ marginBottom: '2rem' }}>
          This marble rolled off the track. It happens.
        </p>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </div>
  );
}
