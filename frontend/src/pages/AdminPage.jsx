import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import './AdminPage.css';

const TABS = ['Blocklist', 'Belts', 'Sessions', 'Viewers'];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('Blocklist');

  if (loading) return <div className="loading-centered"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <div className="card text-center"><p className="muted">Admins only.</p></div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Panel</h1>
          <p className="muted">Run the show. Manage titles, sessions, and the roster.</p>
        </div>

        <div className="admin-tabs">
          {TABS.map((t) => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="admin-body">
          {tab === 'Blocklist' && <BlocklistTab />}
          {tab === 'Belts' && <BeltsTab />}
          {tab === 'Sessions' && <SessionsTab />}
          {tab === 'Viewers' && <ViewersTab />}
        </div>
      </div>
    </div>
  );
}

function Notice({ msg }) {
  if (!msg) return null;
  return <div className={`admin-notice ${msg.type}`}>{msg.text}</div>;
}

// ─── Blocklist ────────────────────────────────────────────────────────────────

function BlocklistTab() {
  const [list, setList] = useState([]);
  const [login, setLogin] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/api/admin/blocklist').then((r) => setList(r.data.blocklist)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!login.trim()) return;
    try {
      await api.post('/api/admin/blocklist', { twitchLogin: login.trim(), reason: reason.trim() || undefined });
      setLogin(''); setReason(''); setMsg({ type: 'ok', text: 'Account blocked.' });
      load();
    } catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || 'Failed to block.' }); }
  };

  const remove = async (twitchLogin) => {
    try { await api.delete(`/api/admin/blocklist/${twitchLogin}`); load(); }
    catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || 'Failed to remove.' }); }
  };

  return (
    <div className="card">
      <h2>Alt Account Blocklist</h2>
      <p className="muted admin-sub">Blocked Twitch logins are silently ignored when races are parsed.</p>
      <Notice msg={msg} />
      <form className="admin-inline-form" onSubmit={add}>
        <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="twitch_login" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (optional)" />
        <button className="btn btn-primary" type="submit">Block</button>
      </form>
      {list.length === 0 ? (
        <p className="muted">Nobody blocked.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Login</th><th>Reason</th><th></th></tr></thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td>{b.twitchLogin}</td>
                <td className="muted">{b.reason || '—'}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => remove(b.twitchLogin)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Belts ────────────────────────────────────────────────────────────────────

function BeltsTab() {
  const [belts, setBelts] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [selBelt, setSelBelt] = useState('');
  const [selViewer, setSelViewer] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get('/api/admin/belts').then((r) => setBelts(r.data.belts)).catch(() => {});
    api.get('/api/admin/viewers').then((r) => setViewers(r.data.viewers)).catch(() => {});
  }, []);

  const award = async (e) => {
    e.preventDefault();
    if (!selBelt || !selViewer) { setMsg({ type: 'err', text: 'Pick a belt and a wrestler.' }); return; }
    try {
      await api.post(`/api/admin/belts/${selBelt}/award`, { viewerId: selViewer });
      setMsg({ type: 'ok', text: 'Belt awarded.' });
    } catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || 'Failed to award belt.' }); }
  };

  return (
    <div className="card">
      <h2>Title Management</h2>
      <p className="muted admin-sub">Manually assign a belt. This ends any current reign for that title.</p>
      <Notice msg={msg} />
      <form className="admin-inline-form" onSubmit={award}>
        <select value={selBelt} onChange={(e) => setSelBelt(e.target.value)}>
          <option value="">Select belt…</option>
          {belts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={selViewer} onChange={(e) => setSelViewer(e.target.value)}>
          <option value="">Select wrestler…</option>
          {viewers.map((v) => <option key={v.id} value={v.id}>{v.ringName || v.displayName} (@{v.twitchLogin})</option>)}
        </select>
        <button className="btn btn-primary" type="submit">Award</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Belt</th><th>Short</th><th>Reigns</th></tr></thead>
        <tbody>
          {belts.map((b) => (
            <tr key={b.id}><td>{b.name}</td><td className="muted">{b.shortName}</td><td>{b._count?.reigns ?? 0}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get('/api/sessions?limit=50').then((r) => setSessions(r.data.sessions)).catch(() => {});
  useEffect(() => { load(); }, []);

  const generate = async (id) => {
    setBusy(id);
    try {
      await api.post(`/api/sessions/${id}/generate-card`);
      setMsg({ type: 'ok', text: 'Event card generated.' });
      load();
    } catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || 'Failed to generate.' }); }
    finally { setBusy(null); }
  };

  return (
    <div className="card">
      <h2>Sessions</h2>
      <p className="muted admin-sub">Generate the weekly Event Card recap for a stream session.</p>
      <Notice msg={msg} />
      {sessions.length === 0 ? (
        <p className="muted">No sessions yet.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Session</th><th>Date</th><th>Races</th><th>Recap</th><th></th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td><Link to={`/sessions/${s.id}`}>{s.label || 'Untitled session'}</Link></td>
                <td className="muted">{new Date(s.streamDate).toLocaleDateString()}</td>
                <td>{s._count?.races ?? 0}</td>
                <td>{s.eventCard ? <span className="teal">✓ generated</span> : <span className="muted">none</span>}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => generate(s.id)} disabled={busy === s.id}>
                    {busy === s.id ? '…' : s.eventCard ? 'Regenerate' : 'Generate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Viewers ──────────────────────────────────────────────────────────────────

function ViewersTab() {
  const [viewers, setViewers] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);

  const load = (query = '') =>
    api.get(`/api/admin/viewers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then((r) => setViewers(r.data.viewers)).catch(() => {});
  useEffect(() => { load(); }, []);

  const makeAdmin = async (id) => {
    try { await api.post(`/api/admin/viewers/${id}/make-admin`); setMsg({ type: 'ok', text: 'Admin granted.' }); load(q); }
    catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || 'Failed.' }); }
  };

  return (
    <div className="card">
      <h2>Roster</h2>
      <p className="muted admin-sub">Search wrestlers and grant admin access.</p>
      <Notice msg={msg} />
      <form className="admin-inline-form" onSubmit={(e) => { e.preventDefault(); load(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name or login…" />
        <button className="btn btn-secondary" type="submit">Search</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Wrestler</th><th>Login</th><th>Admin</th><th></th></tr></thead>
        <tbody>
          {viewers.map((v) => (
            <tr key={v.id}>
              <td><Link to={`/profile/${v.twitchLogin || v.id}`}>{v.ringName || v.displayName}</Link></td>
              <td className="muted">@{v.twitchLogin}</td>
              <td>{v.isAdmin ? <span className="teal">yes</span> : '—'}</td>
              <td>{!v.isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => makeAdmin(v.id)}>Make admin</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
