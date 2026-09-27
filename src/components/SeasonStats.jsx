import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

export default function SeasonStats({ teamId }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(
          collection(db, 'playerGameStats'),
          where('teamId', '==', teamId)
        );
        const snapshot = await getDocs(q);
        const allStats = snapshot.docs.map(doc => doc.data());
        
        // Group by player and sum
        const playerTotals = {};
        allStats.forEach(stat => {
          if (!playerTotals[stat.playerId]) {
            playerTotals[stat.playerId] = {
              playerId: stat.playerId,
              name: stat.name,
              jerseyNumber: stat.jerseyNumber,
              position: stat.position,
              gamesPlayed: 0,
              totalGoals: 0,
              totalAssists: 0,
              totalSOGs: 0,
              totalPIMs: 0
            };
          }
          const p = playerTotals[stat.playerId];
          if (stat.dressed) p.gamesPlayed++;
          p.totalGoals += stat.goals || 0;
          p.totalAssists += stat.assists || 0;
          p.totalSOGs += stat.sogs || 0;
          p.totalPIMs += stat.pims || 0;
        });
        
        setStats(Object.values(playerTotals).sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber)));
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [teamId]);

  if (loading) return <div className="loading">Loading season stats...</div>;

  return (
    <div className="display-view">
      <h2>Season Statistics</h2>
      {stats.length === 0 ? (
        <div className="no-data">No games played yet this season.</div>
      ) : (
        <div className="table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Pos</th>
                <th>GP</th>
                <th>G</th>
                <th>A</th>
                <th>Pts</th>
                <th>SOGs</th>
                <th>PIMs</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, idx) => (
                <tr key={idx}>
                  <td className="jersey">{stat.jerseyNumber}</td>
                  <td className="name">{stat.name}</td>
                  <td className="position">{stat.position}</td>
                  <td>{stat.gamesPlayed}</td>
                  <td>{stat.totalGoals}</td>
                  <td>{stat.totalAssists}</td>
                  <td className="pts">{stat.totalGoals + stat.totalAssists}</td>
                  <td>{stat.totalSOGs}</td>
                  <td>{stat.totalPIMs}</td>
                </tr>
              ))}
              <tr className="totals-row">
                <td colSpan="3">TOTALS</td>
                <td>{stats.reduce((sum, s) => sum + s.gamesPlayed, 0)}</td>
                <td>{stats.reduce((sum, s) => sum + s.totalGoals, 0)}</td>
                <td>{stats.reduce((sum, s) => sum + s.totalAssists, 0)}</td>
                <td>{stats.reduce((sum, s) => sum + s.totalGoals + s.totalAssists, 0)}</td>
                <td>{stats.reduce((sum, s) => sum + s.totalSOGs, 0)}</td>
                <td>{stats.reduce((sum, s) => sum + s.totalPIMs, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
