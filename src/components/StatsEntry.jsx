import { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './StatsEntry.css';

const GAME_TYPES = ['Exhibition', 'GNASH League', 'Preds Cup', 'Hine Cup'];
const SEASONS = ['2026-27', '2027-28', '2028-29', '2029-30'];

export default function StatsEntry() {
  const [formData, setFormData] = useState({
    season: '2026-27',
    gameType: 'GNASH League',
    gameDate: '',
    gameTime: '',
    gamesPlayed: 1,
    wins: 0,
    losses: 0,
    ties: 0,
    overtimeWins: 0,
    overtimeLosses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    penaltyMinutes: 0,
    shotsOnGoal: 0,
    shotsAgainst: 0,
    powerPlayGoals: 0,
    powerPlayOpportunities: 0,
    penaltyKillGoals: 0,
    penaltyKillOpportunities: 0,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(value) ? value : parseInt(value) || 0
    }));
  };

  const calculateStats = () => {
    const stats = { ...formData };
    
    // Goal differential
    stats.goalDifferential = stats.goalsFor - stats.goalsAgainst;
    
    // Shooting percentage
    stats.shootingPercentage = stats.shotsOnGoal > 0 
      ? ((stats.goalsFor / stats.shotsOnGoal) * 100).toFixed(2)
      : 0;
    
    // Power play percentage
    stats.powerPlayPercentage = stats.powerPlayOpportunities > 0
      ? ((stats.powerPlayGoals / stats.powerPlayOpportunities) * 100).toFixed(2)
      : 0;
    
    // Penalty kill percentage
    stats.penaltyKillPercentage = stats.penaltyKillOpportunities > 0
      ? (((stats.penaltyKillOpportunities - stats.penaltyKillGoals) / stats.penaltyKillOpportunities) * 100).toFixed(2)
      : 0;

    return stats;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const stats = calculateStats();
      await addDoc(collection(db, 'teamStats'), {
        ...stats,
        timestamp: serverTimestamp()
      });
      
      setMessage('Game stats added successfully!');
      setFormData({
        season: '2026-27',
        gameType: 'GNASH League',
        gameDate: '',
        gameTime: '',
        gamesPlayed: 1,
        wins: 0,
        losses: 0,
        ties: 0,
        overtimeWins: 0,
        overtimeLosses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        penaltyMinutes: 0,
        shotsOnGoal: 0,
        shotsAgainst: 0,
        powerPlayGoals: 0,
        powerPlayOpportunities: 0,
        penaltyKillGoals: 0,
        penaltyKillOpportunities: 0,
      });
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stats-entry">
      <h2>Add Game Stats</h2>
      
      {message && <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
        {message}
      </div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Season</label>
            <select name="season" value={formData.season} onChange={handleChange}>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Game Type</label>
            <select name="gameType" value={formData.gameType} onChange={handleChange}>
              {GAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Game Date</label>
            <input type="date" name="gameDate" value={formData.gameDate} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Game Time</label>
            <input type="time" name="gameTime" value={formData.gameTime} onChange={handleChange} />
          </div>
        </div>

        <div className="form-section">
          <h3>Game Results</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Wins</label>
              <input type="number" name="wins" value={formData.wins} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Losses</label>
              <input type="number" name="losses" value={formData.losses} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Ties</label>
              <input type="number" name="ties" value={formData.ties} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Overtime Wins</label>
              <input type="number" name="overtimeWins" value={formData.overtimeWins} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Overtime Losses</label>
              <input type="number" name="overtimeLosses" value={formData.overtimeLosses} onChange={handleChange} min="0" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Scoring Stats</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Goals For</label>
              <input type="number" name="goalsFor" value={formData.goalsFor} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Goals Against</label>
              <input type="number" name="goalsAgainst" value={formData.goalsAgainst} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Shots on Goal</label>
              <input type="number" name="shotsOnGoal" value={formData.shotsOnGoal} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Shots Against</label>
              <input type="number" name="shotsAgainst" value={formData.shotsAgainst} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Penalty Minutes</label>
              <input type="number" name="penaltyMinutes" value={formData.penaltyMinutes} onChange={handleChange} min="0" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Special Teams</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Power Play Goals</label>
              <input type="number" name="powerPlayGoals" value={formData.powerPlayGoals} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Power Play Opportunities</label>
              <input type="number" name="powerPlayOpportunities" value={formData.powerPlayOpportunities} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Penalty Kill Goals Allowed</label>
              <input type="number" name="penaltyKillGoals" value={formData.penaltyKillGoals} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Penalty Kill Opportunities</label>
              <input type="number" name="penaltyKillOpportunities" value={formData.penaltyKillOpportunities} onChange={handleChange} min="0" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Adding Stats...' : 'Add Game Stats'}
        </button>
      </form>
    </div>
  );
}
