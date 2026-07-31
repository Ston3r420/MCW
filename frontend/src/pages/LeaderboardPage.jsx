import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import './LeaderboardPage.css';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 25;

  useEffect(() => {
    setLoading(true);
    api.get(`/api/leaderboard?page=${page}&limit=${LIMIT}`)
      .then((res) => {
        setLeaderboard(res.data.leaderboard || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="leaderboard-page">
      <div className="container">
        <div className="page-header">
          <h1>Leaderboard</h1>
          <p className="muted">The rankings. Who's on a push and who's in jobber hell.</p>
        </div>

        {loading ? (
          <div className="loading-centered"><div className="spinner" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="card text-center" style={{ padding: '4rem' }}>
            <p className="muted">No results yet. The first race hasn't happened.</p>
          </div>
        ) : (
          <>
            <div className="leaderboard-table card">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Wrestler</th>
                    <th>W</th>
                    <th>L</th>
                    <th>W%</th>
                    <th>Streak</th>
                    <th>Titles</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.viewer.id} className={row.rank <= 3 ? 'top-three' : ''}>
                      <td className="rank-cell">
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                      </td>
                      <td className="wrestler-cell">
                        <Link to={`/profile/${row.viewer.twitchLogin || row.viewer.id}`} className="wrestler-link">
                          {row.viewer.avatarUrl && (
                            <img src={row.viewer.avatarUrl} alt="" className="row-avatar" />
                          )}
                          <div>
                            <div className="wrestler-ring-name">
                              {row.viewer.ringName || row.viewer.displayName}
                            </div>
                            {row.viewer.hometown && (
                              <div className="wrestler-hometown muted">{row.viewer.hometown}</div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="stat-win">{row.wins}</td>
                      <td className="stat-loss">{row.losses}</td>
                      <td>{row.winRate}%</td>
                      <td>
                        <span className={`streak-badge ${getStreakClass(row.currentStreak)}`}>
                          {row.streakLabel}
                        </span>
                      </td>
                      <td>
                        {row.titles.length > 0 ? (
                          <span className="gold" title={row.titles.join(', ')}>
                            {'🏆'.repeat(Math.min(row.titles.length, 3))}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className="muted">Page {page} of {Math.ceil(total / LIMIT)}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / LIMIT)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function getStreakClass(streak) {
  if (streak >= 5) return 'streak-hot';
  if (streak >= 3) return 'streak-warm';
  if (streak <= -5) return 'streak-cold';
  if (streak <= -3) return 'streak-cool';
  return '';
}
