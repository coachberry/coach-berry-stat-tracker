import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

export default function PlayerStats({ teamId }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerGameStats, setPlayerGameStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const q = query(
          collection(db, 'playerGameStats'),
          where('teamId', '==', teamId)
        );
        const snapshot = await getDocs(q);
        const stats = snapshot.docs.map(doc => doc.data());
        
        // Get unique players
        const uniquePlayers = [...new Set(stats.map(s => s.playerId))].map(id => {
          const playerStats = stats.find(s => s.playerId === id);
          return {
            id,
            name: playerStats.name,
            jerseyNumber: playerStats.jerseyNumber,
            position: playerStats.position
          };
        }).sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber));
        
        setPlayers(uniquePlayers);
        if (uniquePlayers.length > 0) {
          setSelectedPlayer(uniquePlayers[0]);
          const filteredStats = stats
            .filter(s => s.playerId === uniquePlayers[0].id)
            .sort((a, b) => new Date(b.gameDate || 0) - new Date(a.gameDate || 0));
          setPlayerGameStats(filteredStats);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [teamId]);

  const handlePlayerChange = (e) => {
    const playerId = e.target.value;
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      // Fetch stats for this player
      const allStats = playerGameStats;
      const filtered = allStats.filter(s => s.playerId === playerId);
      setPlayerGameStats(filtered);
    }
  };

  if (loading) return <div className="loading">Loading player stats...</div>;

  return (
    <div className="display-view">
      <h2>Individual Player Statistics</h2>
      
      {players.length === 0 ? (
        <div className="no-data">No player statistics recorded yet.</div>
      ) : (
        <>
          <div className="player-selector">
            <label>Select Player:</label>
            <select 
              value={selectedPlayer?.id || ''} 
              onChange={handlePlayerChange}
              className="select-input"
            >
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  #{player.jerseyNumber} - {player.name} ({player.position})
                </option>
              ))}
            </select>
          </div>

          {selectedPlayer && playerGameStats.length > 0 ? (
            <div className="table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>GP</th>
                    <th>G</th>
                    <th>A</th>
                    <th>Pts</th>
                    <th>SOGs</th>
                    <th>+/-</th>
                    <th>PIMs</th>
                  </tr>
                </thead>
                <tbody>
                  {playerGameStats.map((stat, idx) => (
                    <tr key={idx}>
                      <td>{stat.gameDate || 'N/A'}</td>
                      <td>Game {idx + 1}</td>
                      <td>{stat.dressed ? 1 : 0}</td>
                      <td>{stat.goals || 0}</td>
                      <td>{stat.assists || 0}</td>
                      <td>{(stat.goals || 0) + (stat.assists || 0)}</td>
                      <td>{stat.sogs || 0}</td>
                      <td>{(stat.plus || 0) - (stat.minus || 0)}</td>
                      <td>{stat.pims || 0}</td>
                    </tr>
                  ))}
                  <tr className="totals-row">
                    <td colSpan="2">TOTALS</td>
                    <td>{playerGameStats.filter(s => s.dressed).length}</td>
                    <td>{playerGameStats.reduce((sum, s) => sum + (s.goals || 0), 0)}</td>
                    <td>{playerGameStats.reduce((sum, s) => sum + (s.assists || 0), 0)}</td>
                    <td>{playerGameStats.reduce((sum, s) => sum + (s.goals || 0) + (s.assists || 0), 0)}</td>
                    <td>{playerGameStats.reduce((sum, s) => sum + (s.sogs || 0), 0)}</td>
                    <td>{playerGameStats.reduce((sum, s) => sum + (s.plus || 0) - (s.minus || 0), 0)}</td>
                    <td>{playerGameStats.reduce((sum, s) => sum + (s.pims || 0), 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">No games for {selectedPlayer?.name} yet.</div>
          )}
        </>
      )}
    </div>
  );
}
