import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import './StatisticsPage.css';

const SEASONS = ['2026-27', '2027-28', '2028-29', '2029-30'];
const GAME_TYPES = ['All', 'Exhibition', 'GNASH League', 'Preds Cup', 'Hine Cup'];
const STAT_FIELDS = [
  'wins', 'losses', 'ties', 'overtimeWins', 'overtimeLosses',
  'goalsFor', 'goalsAgainst', 'goalDifferential',
  'shotsOnGoal', 'shotsAgainst', 'shootingPercentage',
  'powerPlayPercentage', 'penaltyKillPercentage', 'penaltyMinutes'
];

export default function StatisticsPage() {
  const [stats, setStats] = useState([]);
  const [filteredStats, setFilteredStats] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('2026-27');
  const [selectedGameType, setSelectedGameType] = useState('All');
  const [sortBy, setSortBy] = useState('gameDate');
  const [sortOrder, setSortOrder] = useState('desc');
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
    let filtered = stats.filter(stat => stat.season === selectedSeason);

    if (selectedGameType !== 'All') {
      filtered = filtered.filter(stat => stat.gameType === selectedGameType);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'gameDate') {
        aVal = new Date(a.gameDate);
        bVal = new Date(b.gameDate);
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredStats(filtered);
  }, [stats, selectedSeason, selectedGameType, sortBy, sortOrder]);

  if (loading) return <div className="loading">Loading statistics...</div>;

  return (
    <div className="statistics-page">
      <h2>Team Statistics</h2>

      <div className="filters">
        <div className="filter-group">
          <label>Season:</label>
          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Game Type:</label>
          <select value={selectedGameType} onChange={(e) => setSelectedGameType(e.target.value)}>
            {GAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="gameDate">Game Date</option>
            {STAT_FIELDS.map(field => (
              <option key={field} value={field}>
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Order:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {filteredStats.length === 0 ? (
        <div className="no-data">No statistics found for this season and game type.</div>
      ) : (
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>W-L-T</th>
                <th>OT W-L</th>
                <th>GF-GA</th>
                <th>Goal Diff</th>
                <th>Shots For-Against</th>
                <th>Shoot %</th>
                <th>PP %</th>
                <th>PK %</th>
                <th>Pen Min</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map(stat => (
                <tr key={stat.id}>
                  <td>{stat.gameDate}</td>
                  <td>{stat.gameType}</td>
                  <td>{stat.wins}-{stat.losses}-{stat.ties}</td>
                  <td>{stat.overtimeWins}-{stat.overtimeLosses}</td>
                  <td>{stat.goalsFor}-{stat.goalsAgainst}</td>
                  <td>{stat.goalDifferential}</td>
                  <td>{stat.shotsOnGoal}-{stat.shotsAgainst}</td>
                  <td>{stat.shootingPercentage}%</td>
                  <td>{stat.powerPlayPercentage}%</td>
                  <td>{stat.penaltyKillPercentage}%</td>
                  <td>{stat.penaltyMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
