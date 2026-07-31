import React from 'react';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#191919',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#ffffff',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        border: '5px solid #333333',
        borderTopColor: '#ffffff',
        animation: 'mcwSpin 0.9s linear infinite',
        marginBottom: '1.5rem',
      }} />
      <div style={{
        fontSize: '1.35rem',
        fontWeight: '400',
        letterSpacing: '0.02em',
        color: '#f0f0f0',
      }}>
        {message}
      </div>
      <style>{`
        @keyframes mcwSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
