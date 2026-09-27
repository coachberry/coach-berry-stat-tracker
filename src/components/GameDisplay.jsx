import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

export default function GameDisplay({ teamId }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameDetails, setGameDetails] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, [teamId]);

  const fetchGames = async () => {
    try {
      const q = query(
        collection(db, 'games'),
        where('teamId', '==', teamId)
      );
      const snapshot = await getDocs(q);
      const gamesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate));
      setGames(gamesList);
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = async (game) => {
    setSelectedGame(game);
    setGameDetails(game);
    
    try {
      const q = query(
        collection(db, 'playerGameStats'),
        where('gameId', '==', game.id)
      );
      const snapshot = await getDocs(q);
      const stats = snapshot.docs.map(doc => doc.data());
      setPlayerStats(stats);
    } catch (err) {
      console.error('Error fetching player stats:', err);
    }
  };

  if (loading) return <div className="loading">Loading games...</div>;

  if (!selectedGame) {
    return (
      <div className="display-view">
        <h2>Game Statistics</h2>
        {games.length === 0 ? (
          <div className="no-data">No games recorded yet. Add a game to get started!</div>
        ) : (
          <div className="games-list">
            {games.map(game => (
              <div key={game.id} className="game-card" onClick={() => handleSelectGame(game)}>
                <div className="game-date">{game.gameDate}</div>
                <div className="game-opponent">{game.opponent}</div>
                <div className="game-type">{game.gameType} • {game.season}</div>
                <div className="game-result">Result: {game.teamResult}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const skaters = playerStats.filter(s => s.position !== 'G');
  const goalies = playerStats.filter(s => s.position === 'G');

  const totalGoals = skaters.reduce((sum, s) => sum + (s.goals || 0), 0);
  const totalShots = skaters.reduce((sum, s) => sum + (s.sogs || 0), 0);
  const totalSA = goalies.reduce((sum, g) => sum + (g.shotsAgainst || 0), 0);
  const totalGA = goalies.reduce((sum, g) => sum + (g.goalsAgainst || 0), 0);
  const shootingPct = totalShots > 0 ? ((totalGoals / totalShots) * 100).toFixed(2) : '0.00';

  return (
    <div className="display-view">
      <button onClick={() => setSelectedGame(null)} className="back-btn">← Back to Games</button>

      <div className="game-header">
        <h2>{selectedGame.opponent}</h2>
        <div className="game-info">
          <span className="date">{selectedGame.gameDate}</span>
          <span className="location">{selectedGame.location}</span>
          <span className="result">{selectedGame.teamResult}</span>
        </div>
      </div>

      <div className="team-stats-display">
        <h3>Team Statistics</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Goals</div>
            <div className="stat-value">{totalGoals}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Goals Against</div>
            <div className="stat-value">{totalGA}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Shots</div>
            <div className="stat-value">{totalShots}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Shots Against</div>
            <div className="stat-value">{totalSA}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Shooting %</div>
            <div className="stat-value">{shootingPct}%</div>
          </div>
        </div>
      </div>

      {skaters.length > 0 && (
        <div className="player-stats-display">
          <h3>Skater Statistics</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>GP</th>
                  <th>G</th>
                  <th>A</th>
                  <th>Pts</th>
                  <th>+/-</th>
                  <th>SOGs</th>
                  <th>PIMs</th>
                </tr>
              </thead>
              <tbody>
                {skaters.map((stat, idx) => (
                  <tr key={idx}>
                    <td>{stat.jerseyNumber}</td>
                    <td>{stat.name}</td>
                    <td>{stat.dressed ? 1 : 0}</td>
                    <td>{stat.goals || 0}</td>
                    <td>{stat.assists || 0}</td>
                    <td>{(stat.goals || 0) + (stat.assists || 0)}</td>
                    <td>{stat.plus || 0}-{stat.minus || 0}</td>
                    <td>{stat.sogs || 0}</td>
                    <td>{stat.pims || 0}</td>
                  </tr>
                ))}
                <tr className="totals-row">
                  <td colSpan="2">TOTALS</td>
                  <td>{skaters.filter(s => s.dressed).length}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.goals || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.assists || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.goals || 0) + (s.assists || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.plus || 0), 0)}-{skaters.reduce((sum, s) => sum + (s.minus || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.sogs || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.pims || 0), 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {goalies.length > 0 && (
        <div className="goalie-stats-display">
          <h3>Goalie Statistics</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>GS</th>
                  <th>MP</th>
                  <th>SA</th>
                  <th>GA</th>
                  <th>SVs</th>
                  <th>G</th>
                  <th>A</th>
                  <th>PIMs</th>
                </tr>
              </thead>
              <tbody>
                {goalies.map((stat, idx) => (
                  <tr key={idx}>
                    <td>{stat.jerseyNumber}</td>
                    <td>{stat.name}</td>
                    <td>{stat.started ? 1 : 0}</td>
                    <td>{stat.minutesPlayed || 0}</td>
                    <td>{stat.shotsAgainst || 0}</td>
                    <td>{stat.goalsAgainst || 0}</td>
                    <td>{(stat.shotsAgainst || 0) - (stat.goalsAgainst || 0)}</td>
                    <td>{stat.goalieGoals || 0}</td>
                    <td>{stat.goalieAssists || 0}</td>
                    <td>{stat.pims || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
