import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import './StatLeaders.css';

const SEASONS = ['2026-27', '2027-28', '2028-29', '2029-30', 'All-Time'];
const LEADER_STATS = [
  { key: 'wins', label: 'Wins', limit: 10 },
  { key: 'losses', label: 'Losses', limit: 10 },
  { key: 'goalsFor', label: 'Goals For', limit: 10 },
  { key: 'goalsAgainst', label: 'Goals Against', limit: 10 },
  { key: 'goalDifferential', label: 'Goal Differential', limit: 10 },
  { key: 'shotsOnGoal', label: 'Shots on Goal', limit: 10 },
  { key: 'shootingPercentage', label: 'Shooting Percentage', limit: 10 },
  { key: 'powerPlayPercentage', label: 'Power Play %', limit: 10 },
  { key: 'penaltyKillPercentage', label: 'Penalty Kill %', limit: 10 },
];

export default function StatLeaders() {
  const [stats, setStats] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('2026-27');
  const [selectedStat, setSelectedStat] = useState('wins');
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'teamStats'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    let filtered = selectedSeason === 'All-Time' 
      ? stats 
      : stats.filter(stat => stat.season === selectedSeason);

    // Get the stat config
    const statConfig = LEADER_STATS.find(s => s.key === selectedStat);
    const limit = selectedSeason === 'All-Time' ? 20 : 10;

    // Sort by selected stat
    filtered.sort((a, b) => {
      const aVal = parseFloat(a[selectedStat]) || 0;
      const bVal = parseFloat(b[selectedStat]) || 0;
      return bVal - aVal;
    });

    // Take top N
    setLeaders(filtered.slice(0, limit));
  }, [stats, selectedSeason, selectedStat]);

  if (loading) return <div className="loading">Loading leaders...</div>;

  const statConfig = LEADER_STATS.find(s => s.key === selectedStat);
  const isPercentage = selectedStat.includes('Percentage');

  return (
    <div className="stat-leaders">
      <h2>Stat Leaders</h2>

      <div className="leader-filters">
        <div className="filter-group">
          <label>Season:</label>
          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Stat:</label>
          <select value={selectedStat} onChange={(e) => setSelectedStat(e.target.value)}>
            {LEADER_STATS.map(stat => (
              <option key={stat.key} value={stat.key}>{stat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="leaders-display">
        <h3>{statConfig.label} - {selectedSeason}</h3>
        {leaders.length === 0 ? (
          <div className="no-data">No data available for this season and stat.</div>
        ) : (
          <div className="leaders-list">
            {leaders.map((stat, index) => (
              <div key={stat.id} className={`leader-item rank-${Math.min(index + 1, 3)}`}>
                <div className="rank">#{index + 1}</div>
                <div className="leader-info">
                  <div className="date">{stat.gameDate}</div>
                  <div className="game-type">{stat.gameType}</div>
                </div>
                <div className="leader-value">
                  {isPercentage ? `${stat[selectedStat]}%` : stat[selectedStat]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
