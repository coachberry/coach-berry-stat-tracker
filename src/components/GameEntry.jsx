import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import './GameEntry.css';

const GAME_TYPES = ['Exhibition', 'League Game', 'Playoffs', 'Tournament'];
const GAME_RESULTS = ['W', 'L', 'T', 'OTW', 'OTL', 'SOW', 'SOL'];
const SEASONS = ['2026-27', '2027-28', '2028-29', '2029-30'];
const HOME_AWAY = ['Home', 'Away'];

export default function GameEntry({ teamId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);

  // Game Details
  const [gameDetails, setGameDetails] = useState({
    gameType: 'League Game',
    season: '2026-27',
    gameDate: '',
    gameTime: '',
    arena: '',
    location: '',
    opponent: '',
    homeAway: 'Home',
    period1Length: 15,
    period2Length: 15,
    period3Length: 15,
    otLength: 0,
    standardLength: 15
  });

  // Team Stats
  const [teamStats, setTeamStats] = useState({
    result: 'W',
    benchPIMs: 0
  });

  // Player Stats
  const [playerStats, setPlayerStats] = useState({});

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

      // Initialize player stats
      const initialStats = {};
      playersList.forEach(player => {
        initialStats[player.id] = {
          playerId: player.id,
          jerseyNumber: player.jerseyNumber,
          name: player.name,
          position: player.position,
          dressed: false,
          sogs: 0,
          goals: 0,
          assists: 0,
          plus: 0,
          minus: 0,
          pims: 0,
          // Goalie specific
          started: false,
          minutesPlayed: 0,
          shotsAgainst: 0,
          goalsAgainst: 0,
          goalieGoals: 0,
          goalieAssists: 0
        };
      });
      setPlayerStats(initialStats);
    } catch (err) {
      setMessage(`Error fetching players: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGameDetailsChange = (field, value) => {
    setGameDetails(prev => ({...prev, [field]: value}));
  };

  const handleTeamStatsChange = (field, value) => {
    setTeamStats(prev => ({...prev, [field]: value}));
  };

  const handlePlayerStatChange = (playerId, field, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'dressed' || field === 'started' ? !prev[playerId][field] : value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!gameDetails.gameDate || !gameDetails.opponent) {
      setMessage('Please fill in all game details');
      return;
    }

    try {
      const gameDoc = await addDoc(collection(db, 'games'), {
        teamId: teamId,
        ...gameDetails,
        teamResult: teamStats.result,
        teamBenchPIMs: teamStats.benchPIMs,
        createdAt: serverTimestamp()
      });

      // Calculate total minutes played
      const totalMinutes = gameDetails.period1Length + gameDetails.period2Length + gameDetails.period3Length + gameDetails.otLength;

      // Add player stats
      for (const [playerId, stats] of Object.entries(playerStats)) {
        if (stats.dressed || stats.started) {
          await addDoc(collection(db, 'playerGameStats'), {
            gameId: gameDoc.id,
            teamId: teamId,
            ...stats,
            totalMinutes: totalMinutes,
            createdAt: serverTimestamp()
          });
        }
      }

      setMessage('Game statistics saved successfully!');
      setStep(1);
      setGameDetails({
        gameType: 'League Game',
        season: '2026-27',
        gameDate: '',
        gameTime: '',
        arena: '',
        location: '',
        opponent: '',
        homeAway: 'Home',
        period1Length: 15,
        period2Length: 15,
        period3Length: 15,
        otLength: 0,
        standardLength: 15
      });
      setTeamStats({ result: 'W', benchPIMs: 0 });
      fetchPlayers();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading roster...</div>;

  const skaters = players.filter(p => p.position !== 'G');
  const goalies = players.filter(p => p.position === 'G');

  return (
    <div className="game-entry">
      <div className="steps-indicator">
        <div className={`step ${step === 1 ? 'active' : 'completed'}`}>1. Game Details</div>
        <div className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>2. Team Stats</div>
        <div className={`step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>3. Player Stats</div>
        <div className={`step ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>4. Review & Submit</div>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* STEP 1: Game Details */}
      {step === 1 && (
        <div className="step-content">
          <h2>Game Details</h2>
          
          <div className="form-section">
            <h3>Game Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Game Type *</label>
                <select 
                  value={gameDetails.gameType}
                  onChange={(e) => handleGameDetailsChange('gameType', e.target.value)}
                >
                  {GAME_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Season *</label>
                <select 
                  value={gameDetails.season}
                  onChange={(e) => handleGameDetailsChange('season', e.target.value)}
                >
                  {SEASONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input 
                  type="date"
                  value={gameDetails.gameDate}
                  onChange={(e) => handleGameDetailsChange('gameDate', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input 
                  type="time"
                  value={gameDetails.gameTime}
                  onChange={(e) => handleGameDetailsChange('gameTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Location Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Arena *</label>
                <input 
                  type="text"
                  placeholder="e.g., Nashville Ice Center"
                  value={gameDetails.arena}
                  onChange={(e) => handleGameDetailsChange('arena', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Location (City, State) *</label>
                <input 
                  type="text"
                  placeholder="e.g., Nashville, TN"
                  value={gameDetails.location}
                  onChange={(e) => handleGameDetailsChange('location', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Opponent *</label>
                <input 
                  type="text"
                  placeholder="e.g., Memphis Grizzlies Youth"
                  value={gameDetails.opponent}
                  onChange={(e) => handleGameDetailsChange('opponent', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Home / Away *</label>
                <select 
                  value={gameDetails.homeAway}
                  onChange={(e) => handleGameDetailsChange('homeAway', e.target.value)}
                >
                  {HOME_AWAY.map(ha => (
                    <option key={ha} value={ha}>{ha}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Period Lengths (minutes)</h3>
            <div className="form-row">
              <div className="form-group">
                <label>1st Period *</label>
                <input 
                  type="number"
                  value={gameDetails.period1Length}
                  onChange={(e) => handleGameDetailsChange('period1Length', parseInt(e.target.value))}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>2nd Period *</label>
                <input 
                  type="number"
                  value={gameDetails.period2Length}
                  onChange={(e) => handleGameDetailsChange('period2Length', parseInt(e.target.value))}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>3rd Period *</label>
                <input 
                  type="number"
                  value={gameDetails.period3Length}
                  onChange={(e) => handleGameDetailsChange('period3Length', parseInt(e.target.value))}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>OT Length</label>
                <input 
                  type="number"
                  value={gameDetails.otLength}
                  onChange={(e) => handleGameDetailsChange('otLength', parseInt(e.target.value))}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Standard Length *</label>
                <input 
                  type="number"
                  value={gameDetails.standardLength}
                  onChange={(e) => handleGameDetailsChange('standardLength', parseInt(e.target.value))}
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="step-buttons">
            <button onClick={() => setStep(2)} className="next-btn">Next Step →</button>
          </div>
        </div>
      )}

      {/* STEP 2: Team Stats */}
      {step === 2 && (
        <div className="step-content">
          <h2>Team Statistics</h2>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Game Result *</label>
                <select 
                  value={teamStats.result}
                  onChange={(e) => handleTeamStatsChange('result', e.target.value)}
                >
                  {GAME_RESULTS.map(result => (
                    <option key={result} value={result}>{result}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Bench PIMs</label>
                <input 
                  type="number"
                  value={teamStats.benchPIMs}
                  onChange={(e) => handleTeamStatsChange('benchPIMs', parseInt(e.target.value))}
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="step-buttons">
            <button onClick={() => setStep(1)} className="prev-btn">← Previous Step</button>
            <button onClick={() => setStep(3)} className="next-btn">Next Step →</button>
          </div>
        </div>
      )}

      {/* STEP 3: Player Stats */}
      {step === 3 && (
        <div className="step-content">
          <h2>Player Statistics</h2>

          {skaters.length > 0 && (
            <div className="stats-section">
              <h3>Skater Stats</h3>
              <div className="table-wrapper">
                <table className="player-stats-table">
                  <thead>
                    <tr>
                      <th>Jersey</th>
                      <th>Name</th>
                      <th>Pos</th>
                      <th>Dressed?</th>
                      <th>SOGs</th>
                      <th>G</th>
                      <th>A</th>
                      <th>+</th>
                      <th>-</th>
                      <th>PIMs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skaters.map(player => (
                      <tr key={player.id}>
                        <td className="jersey">{player.jerseyNumber}</td>
                        <td className="name">{player.name}</td>
                        <td className="position">{player.position}</td>
                        <td className="checkbox">
                          <input 
                            type="checkbox"
                            checked={playerStats[player.id]?.dressed || false}
                            onChange={() => handlePlayerStatChange(player.id, 'dressed')}
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.sogs || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'sogs', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.goals || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'goals', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.assists || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'assists', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.plus || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'plus', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.minus || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'minus', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.pims || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'pims', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {goalies.length > 0 && (
            <div className="stats-section">
              <h3>Goalie Stats</h3>
              <div className="table-wrapper">
                <table className="player-stats-table">
                  <thead>
                    <tr>
                      <th>Jersey</th>
                      <th>Name</th>
                      <th>Started?</th>
                      <th>Minutes</th>
                      <th>SA</th>
                      <th>GA</th>
                      <th>G</th>
                      <th>A</th>
                      <th>PIMs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalies.map(player => (
                      <tr key={player.id}>
                        <td className="jersey">{player.jerseyNumber}</td>
                        <td className="name">{player.name}</td>
                        <td className="checkbox">
                          <input 
                            type="checkbox"
                            checked={playerStats[player.id]?.started || false}
                            onChange={() => handlePlayerStatChange(player.id, 'started')}
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.minutesPlayed || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'minutesPlayed', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.shotsAgainst || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'shotsAgainst', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.goalsAgainst || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'goalsAgainst', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.goalieGoals || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'goalieGoals', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.goalieAssists || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'goalieAssists', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="number"
                            min="0"
                            value={playerStats[player.id]?.pims || 0}
                            onChange={(e) => handlePlayerStatChange(player.id, 'pims', parseInt(e.target.value))}
                            className="stat-input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="step-buttons">
            <button onClick={() => setStep(2)} className="prev-btn">← Previous Step</button>
            <button onClick={() => setStep(4)} className="next-btn">Review & Submit →</button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Submit */}
      {step === 4 && (
        <div className="step-content">
          <h2>Review & Submit</h2>

          <div className="review-section">
            <h3>Game Details</h3>
            <div className="review-grid">
              <div className="review-item">
                <strong>Type:</strong> {gameDetails.gameType}
              </div>
              <div className="review-item">
                <strong>Season:</strong> {gameDetails.season}
              </div>
              <div className="review-item">
                <strong>Date:</strong> {gameDetails.gameDate}
              </div>
              <div className="review-item">
                <strong>Opponent:</strong> {gameDetails.opponent}
              </div>
              <div className="review-item">
                <strong>Location:</strong> {gameDetails.location}
              </div>
              <div className="review-item">
                <strong>Home/Away:</strong> {gameDetails.homeAway}
              </div>
              <div className="review-item">
                <strong>Result:</strong> {teamStats.result}
              </div>
            </div>
          </div>

          <div className="step-buttons">
            <button onClick={() => setStep(3)} className="prev-btn">← Back to Stats</button>
            <button onClick={handleSubmit} className="submit-btn">✓ Submit Game Statistics</button>
          </div>
        </div>
      )}
    </div>
  );
}
