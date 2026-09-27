import { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './TeamSelector.css';

export default function TeamSelector({ user, onLogout }) {
  const [showForm, setShowForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [season, setSeason] = useState('2026-27');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        coachId: user.uid,
        season: season,
        createdAt: serverTimestamp()
      });

      setMessage('Team created! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-selector-container">
      <header className="selector-header">
        <h1>🏒 Hockey Stats Tracker</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <main className="selector-main">
        <div className="selector-card">
          <h2>Create Your First Team</h2>
          <p className="subtitle">Start by creating a team to track stats</p>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="create-btn">
              + Create New Team
            </button>
          ) : (
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Team Name</label>
                <input
                  type="text"
                  placeholder="e.g., Nashville High School Predators"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Season</label>
                <select value={season} onChange={(e) => setSeason(e.target.value)}>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                  <option value="2028-29">2028-29</option>
                  <option value="2029-30">2029-30</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
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
        </div>
      </main>
    </div>
  );
}
