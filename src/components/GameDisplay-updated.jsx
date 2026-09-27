import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './GameDisplay.css';

export default function GameDisplay({ teamId, teamName }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
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
            {games.map(game => {
              const gameStats = playerStats.filter(s => s.gameId === game.id);
              const totalGA = gameStats.filter(s => s.position === 'G').reduce((sum, g) => sum + (g.goalsAgainst || 0), 0);
              
              return (
                <div key={game.id} className="game-list-item">
                  <div className="game-list-date">{formatDate(game.gameDate)}</div>
                  <div className="game-list-opponent">{game.opponent}</div>
                  <div className="game-list-type">{game.gameType}</div>
                  <div className="game-list-score">{game.totalTeamGoals || 0}-{totalGA}</div>
                  <div className="game-list-result">{game.teamResult}</div>
                  <button 
                    onClick={() => handleSelectGame(game)}
                    className="view-details-btn"
                  >
                    View Game Details
                  </button>
                </div>
              );
            })}
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

  const titleText = selectedGame.homeAway === 'Home' 
    ? `${teamName} vs. ${selectedGame.opponent}`
    : `${teamName} @ ${selectedGame.opponent}`;

  return (
    <div className="display-view">
      <button onClick={() => setSelectedGame(null)} className="back-btn">← Back to Games</button>

      <div className="game-header">
        <h2>{titleText}</h2>
        <div className="game-info">
          <span className="date">{formatDate(selectedGame.gameDate)}</span>
          <span className="location">{selectedGame.location}</span>
          <span className="score">{totalGoals}-{totalGA}</span>
          <span className="result">{selectedGame.teamResult}</span>
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
                  <th>S%</th>
                  <th>PIMs</th>
                </tr>
              </thead>
              <tbody>
                {skaters.map((stat, idx) => {
                  const plusMinus = (stat.plus || 0) - (stat.minus || 0);
                  const plusMinusStr = plusMinus > 0 ? `+${plusMinus}` : `${plusMinus}`;
                  const shootPct = stat.sogs > 0 ? ((stat.goals / stat.sogs) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <tr key={idx}>
                      <td className="jersey">{stat.jerseyNumber}</td>
                      <td className="name">{stat.name}</td>
                      <td>{stat.dressed ? 1 : 0}</td>
                      <td>{stat.goals || 0}</td>
                      <td>{stat.assists || 0}</td>
                      <td className="pts">{(stat.goals || 0) + (stat.assists || 0)}</td>
                      <td>{plusMinusStr}</td>
                      <td>{stat.sogs || 0}</td>
                      <td>{shootPct}%</td>
                      <td>{stat.pims || 0}</td>
                    </tr>
                  );
                })}
                <tr className="totals-row">
                  <td colSpan="2">TOTALS</td>
                  <td>{skaters.filter(s => s.dressed).length}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.goals || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.assists || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.goals || 0) + (s.assists || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.plus || 0) - (s.minus || 0), 0)}</td>
                  <td>{skaters.reduce((sum, s) => sum + (s.sogs || 0), 0)}</td>
                  <td>{totalShots > 0 ? ((totalGoals / totalShots) * 100).toFixed(1) : '0.0'}%</td>
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
                  <th>GP</th>
                  <th>MP</th>
                  <th>SA</th>
                  <th>GA</th>
                  <th>SVs</th>
                  <th>SV%</th>
                  <th>GAA</th>
                  <th>W</th>
                  <th>L</th>
                  <th>T</th>
                  <th>OTW</th>
                  <th>OTL</th>
                  <th>SOW</th>
                  <th>SOL</th>
                  <th>G</th>
                  <th>A</th>
                  <th>PIMs</th>
                </tr>
              </thead>
              <tbody>
                {goalies.map((stat, idx) => {
                  const saves = (stat.shotsAgainst || 0) - (stat.goalsAgainst || 0);
                  const svPct = stat.shotsAgainst > 0 ? ((saves / stat.shotsAgainst) * 100).toFixed(1) : '0.0';
                  const gaa = stat.minutesPlayed > 0 
                    ? ((stat.goalsAgainst || 0) * (selectedGame.standardGameLength || 15) / stat.minutesPlayed).toFixed(2)
                    : '0.00';
                  
                  // Determine goalie result based on team result
                  let goalieResult = { W: 0, L: 0, T: 0, OTW: 0, OTL: 0, SOW: 0, SOL: 0 };
                  if (stat.started || stat.minutesPlayed > 0) {
                    if (selectedGame.teamResult === 'W') goalieResult.W = 1;
                    else if (selectedGame.teamResult === 'L') goalieResult.L = 1;
                    else if (selectedGame.teamResult === 'T') goalieResult.T = 1;
                    else if (selectedGame.teamResult === 'OTW') goalieResult.OTW = 1;
                    else if (selectedGame.teamResult === 'OTL') goalieResult.OTL = 1;
                    else if (selectedGame.teamResult === 'SOW') goalieResult.SOW = 1;
                    else if (selectedGame.teamResult === 'SOL') goalieResult.SOL = 1;
                  }

                  return (
                    <tr key={idx}>
                      <td className="jersey">{stat.jerseyNumber}</td>
                      <td className="name">{stat.name}</td>
                      <td>{stat.started ? 1 : 0}</td>
                      <td>{stat.minutesPlayed > 0 ? 1 : 0}</td>
                      <td>{stat.minutesPlayed || 0}</td>
                      <td>{stat.shotsAgainst || 0}</td>
                      <td>{stat.goalsAgainst || 0}</td>
                      <td>{saves}</td>
                      <td>{svPct}%</td>
                      <td>{gaa}</td>
                      <td>{goalieResult.W}</td>
                      <td>{goalieResult.L}</td>
                      <td>{goalieResult.T}</td>
                      <td>{goalieResult.OTW}</td>
                      <td>{goalieResult.OTL}</td>
                      <td>{goalieResult.SOW}</td>
                      <td>{goalieResult.SOL}</td>
                      <td>{stat.goalieGoals || 0}</td>
                      <td>{stat.goalieAssists || 0}</td>
                      <td>{stat.pims || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
