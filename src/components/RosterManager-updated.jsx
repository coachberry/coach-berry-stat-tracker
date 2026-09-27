import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import './RosterManager.css';

const POSITIONS = ['C', 'LW', 'RW', 'D', 'G'];

export default function RosterManager({ teamId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    jerseyNumber: '',
    position: 'C'
  });

  useEffect(() => {
    fetchPlayers();
  }, [teamId]);

  const fetchPlayers = async () => {
    try {
      const q = query(
        collection(db, 'players'),
        where('teamId', '==', teamId)
      );
      const snapshot = await getDocs(q);
      const playersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber));
      setPlayers(playersList);
    } catch (err) {
      setMessage(`Error fetching players: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.name || !formData.jerseyNumber) {
      setMessage('Please fill in all fields');
      return;
    }

    // Check for duplicate jersey number
    if (players.some(p => parseInt(p.jerseyNumber) === parseInt(formData.jerseyNumber))) {
      setMessage('A player with this jersey number already exists');
      return;
    }

    // Check for duplicate name (case-insensitive)
    if (players.some(p => p.name.toLowerCase() === formData.name.toLowerCase())) {
      setMessage('A player with this name already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'players'), {
        ...formData,
        teamId: teamId,
        createdAt: serverTimestamp()
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

  return (
    <div className="roster-manager">
      <div className="roster-header">
        <h2>Team Roster</h2>
        <span className="player-count">{players.length} / 50 players</span>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="add-player-btn">
          + Add Player
        </button>
      ) : (
        <form onSubmit={handleAddPlayer} className="player-form">
          <div className="form-row">
            <div className="form-group">
              <label>Player Name *</label>
              <input
                type="text"
                placeholder="e.g., John Smith"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Jersey Number *</label>
              <input
                type="number"
                placeholder="e.g., 23"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({...formData, jerseyNumber: e.target.value})}
                min="1"
                max="99"
                required
              />
            </div>

            <div className="form-group">
              <label>Position *</label>
              <select 
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
              >
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">Add Player</button>
            <button 
              type="button"
              onClick={() => setShowForm(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {players.length > 0 ? (
        <table className="roster-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Position</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.id}>
                <td className="jersey">{player.jerseyNumber}</td>
                <td className="name">{player.name}</td>
                <td className="position">{player.position}</td>
                <td className="action">
                  <button 
                    onClick={() => handleDeletePlayer(player.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-data">No players on roster yet. Add a player to get started!</div>
      )}
    </div>
  );
}
