import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import {
  collection, addDoc, getDocs, query, where,
  deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import './RosterManager.css';

const SKATER_POSITIONS = ['C', 'LW', 'RW', 'D'];

export default function RosterManager({ teamId }) {
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [message, setMessage]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', jerseyNumber: '', position: 'C' });

  useEffect(() => { fetchPlayers(); }, [teamId]);

  const fetchPlayers = async () => {
    try {
      const q = query(collection(db, 'players'), where('teamId', '==', teamId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber));
      setPlayers(list);
    } catch (err) {
      setMessage(`Error fetching players: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!formData.name.trim() || !formData.jerseyNumber) {
      setMessage('Please fill in all fields'); return;
    }
    if (players.some(p => parseInt(p.jerseyNumber) === parseInt(formData.jerseyNumber))) {
      setMessage('A player with this jersey number already exists'); return;
    }
    if (players.some(p => p.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      setMessage('A player with this name already exists'); return;
    }
    try {
      await addDoc(collection(db, 'players'), {
        ...formData, name: formData.name.trim(), teamId, createdAt: serverTimestamp(),
      });
      setMessage('Player added successfully!');
      setFormData({ name: '', jerseyNumber: '', position: 'C' });
      setShowForm(false);
      fetchPlayers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    try {
      await deleteDoc(doc(db, 'players', playerId));
      setMessage('Player deleted');
      fetchPlayers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading roster...</div>;

  const skaters = players.filter(p => p.position !== 'G');
  const goalies = players.filter(p => p.position === 'G');

  const SectionTable = ({ title, list }) => (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{
        color: '#FF2400', fontSize: '16px', margin: '0 0 12px 0',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        {title}
        <span style={{
          background: 'rgba(255,36,0,0.12)', color: '#FF2400',
          padding: '2px 10px', borderRadius: '12px',
          fontSize: '12px', fontWeight: 600, border: '1px solid rgba(255,36,0,0.4)',
        }}>
          {list.length}
        </span>
      </h3>
      {list.length === 0 ? (
        <div className="no-data" style={{ padding: '18px 20px', fontSize: '13px' }}>
          No {title.toLowerCase()} on roster yet.
        </div>
      ) : (
        /* Narrow table — only as wide as content needs */
        <div style={{ display: 'inline-block', minWidth: '340px', width: '100%', maxWidth: '520px' }}>
          <table className="roster-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th style={{ textAlign: 'left', fontSize: '15px' }}>Name</th>
                <th style={{ width: '80px', textAlign: 'center', fontSize: '15px' }}>Pos</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map(player => (
                <tr key={player.id}>
                  <td className="jersey" style={{ fontSize: '15px' }}>{player.jerseyNumber}</td>
                  <td style={{ textAlign: 'left', fontSize: '15px', fontWeight: 500 }}>{player.name}</td>
                  <td className="position" style={{ fontSize: '15px' }}>{player.position}</td>
                  <td className="action">
                    <button onClick={() => handleDeletePlayer(player.id)} className="delete-btn">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="roster-manager">
      <div className="roster-header">
        <h2>Team Roster</h2>
        <span className="player-count">{players.length} / 50 players</span>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('already') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Smaller inline Add Player button */}
      {!showForm ? (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '8px 20px',
              background: '#FF2400',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            + Add Player
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddPlayer} className="player-form">
          <div className="form-row">
            <div className="form-group">
              <label>Player Name *</label>
              <input type="text" placeholder="e.g., John Smith" autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Jersey Number *</label>
              <input type="number" placeholder="e.g., 23" min="0" max="99"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Position *</label>
              <select value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}>
                <optgroup label="── Skaters ──">
                  {SKATER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </optgroup>
                <optgroup label="── Goalie ──">
                  <option value="G">G</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">Add Player</button>
            <button type="button" className="cancel-btn"
              onClick={() => { setShowForm(false); setFormData({ name: '', jerseyNumber: '', position: 'C' }); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <SectionTable title="Skaters" list={skaters} />
      <SectionTable title="Goalies" list={goalies} />
    </div>
  );
}
