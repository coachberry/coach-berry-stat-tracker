import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import './GameEntry.css';

const GAME_TYPES  = ['Exhibition', 'League Game', 'Playoffs', 'Tournament'];
const GAME_RESULTS= ['W', 'L', 'T', 'OTW', 'OTL', 'SOW', 'SOL'];
const SEASONS     = ['2024-25','2025-26','2026-27', '2027-28', '2028-29', '2029-30'];
const HOME_AWAY   = ['Home', 'Away'];
const DEFAULT_P1  = 15, DEFAULT_P2 = 15, DEFAULT_P3 = 15;

export default function GameEntry({ teamId }) {
  const [players,     setPlayers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState('');
  const [step,        setStep]        = useState(1);

  const [gameDetails, setGameDetails] = useState({
    gameType: 'League Game', season: '2026-27',
    gameDate: '', gameTime: '', arena: '', location: '',
    opponent: '', homeAway: 'Home',
    period1Length: DEFAULT_P1, period2Length: DEFAULT_P2, period3Length: DEFAULT_P3,
    otLength: 0, standardGameLength: DEFAULT_P1 + DEFAULT_P2 + DEFAULT_P3,
  });

  // teamStats: result, PP, PK, successfulPKs, GWGPlayerId (no benchPIMs)
  const [teamStats, setTeamStats] = useState({
    result: 'W', powerPlays: 0, penaltyKills: 0, successfulPKs: 0, gwgPlayerId: '',
  });

  const [playerStats, setPlayerStats] = useState({});

  useEffect(() => { fetchPlayers(); }, [teamId]);

  const fetchPlayers = async () => {
    try {
      const q = query(collection(db, 'players'), where('teamId', '==', teamId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber));
      setPlayers(list);
      const init = {};
      list.forEach(p => {
        init[p.id] = {
          playerId: p.id, jerseyNumber: p.jerseyNumber, name: p.name, position: p.position,
          // skater
          dressed: false, sogs: 0, goals: 0, assists: 0, plus: 0, minus: 0, pims: 0,
          ppg: 0, ppa: 0, shg: 0, sha: 0, gwg: 0,
          // goalie
          started: false, minutesPlayed: 0, shotsAgainst: 0, goalsAgainst: 0,
          goalieGoals: 0, goalieAssists: 0,
        };
      });
      setPlayerStats(init);
    } catch (err) {
      setMessage(`Error fetching players: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGameDetailsChange = (field, value) => {
    setGameDetails(prev => {
      const u = { ...prev, [field]: value };
      if (['period1Length','period2Length','period3Length'].includes(field)) {
        u.standardGameLength =
          (field==='period1Length'?value:prev.period1Length) +
          (field==='period2Length'?value:prev.period2Length) +
          (field==='period3Length'?value:prev.period3Length);
      }
      return u;
    });
  };

  const handleTeamStatsChange = (field, value) => setTeamStats(prev => ({ ...prev, [field]: value }));

  const handlePlayerStatChange = (playerId, field, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: (field === 'dressed' || field === 'started') ? !prev[playerId][field] : value,
      },
    }));
  };

  const totalTeamGoals = () =>
    Object.values(playerStats).filter(p => p.position !== 'G').reduce((s, p) => s + (p.goals || 0), 0);

  const validateStats = () => {
    const ttg = totalTeamGoals();
    for (const s of Object.values(playerStats).filter(p => p.position !== 'G' && p.dressed)) {
      if (s.goals > 0 && s.sogs === 0) return `Player #${s.jerseyNumber} cannot have goals without shots on goal`;
      if (s.goals > s.sogs)            return `Player #${s.jerseyNumber} cannot have more goals than shots on goal`;
      if (s.assists > ttg)             return `Player #${s.jerseyNumber} cannot have more assists than total team goals`;
      if (s.plus > ttg)                return `Player #${s.jerseyNumber} cannot have more + than total team goals`;
      if ((s.ppg || 0) > (s.goals || 0)) return `Player #${s.jerseyNumber} PPG cannot exceed total goals`;
      if ((s.shg || 0) > (s.goals || 0)) return `Player #${s.jerseyNumber} SHG cannot exceed total goals`;
    }
    // Validate GWG player if winning
    const winning = ['W','OTW','SOW'].includes(teamStats.result);
    if (winning && teamStats.gwgPlayerId) {
      const gwgP = playerStats[teamStats.gwgPlayerId];
      if (gwgP && (gwgP.goals || 0) === 0) return 'GWG player must have at least 1 goal';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!gameDetails.gameDate || !gameDetails.opponent) { setMessage('Please fill in all game details'); return; }
    const err = validateStats();
    if (err) { setMessage(err); return; }

    try {
      const totalMinutes = gameDetails.period1Length + gameDetails.period2Length + gameDetails.period3Length + gameDetails.otLength;
      const ttg = totalTeamGoals();
      const winning = ['W','OTW','SOW'].includes(teamStats.result);

      const gameDoc = await addDoc(collection(db, 'games'), {
        teamId, ...gameDetails,
        teamResult:    teamStats.result,
        powerPlays:    teamStats.powerPlays    || 0,
        penaltyKills:  teamStats.penaltyKills  || 0,
        successfulPKs: teamStats.successfulPKs || 0,
        gwgPlayerId:   winning ? (teamStats.gwgPlayerId || '') : 'N/A',
        totalTeamGoals: ttg,
        createdAt: serverTimestamp(),
      });

      for (const [, stats] of Object.entries(playerStats)) {
        if (stats.dressed || stats.started) {
          const isGWG = winning && teamStats.gwgPlayerId === stats.playerId ? 1 : 0;
          await addDoc(collection(db, 'playerGameStats'), {
            gameId: gameDoc.id, teamId,
            ...stats,
            gwg: isGWG,
            totalMinutes,
            createdAt: serverTimestamp(),
          });
        }
      }

      setMessage('Game statistics saved successfully!');
      setStep(1);
      setGameDetails({ gameType:'League Game', season:'2026-27', gameDate:'', gameTime:'', arena:'', location:'', opponent:'', homeAway:'Home', period1Length:DEFAULT_P1, period2Length:DEFAULT_P2, period3Length:DEFAULT_P3, otLength:0, standardGameLength:DEFAULT_P1+DEFAULT_P2+DEFAULT_P3 });
      setTeamStats({ result:'W', powerPlays:0, penaltyKills:0, successfulPKs:0, gwgPlayerId:'' });
      fetchPlayers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading roster...</div>;

  const skaters = players.filter(p => p.position !== 'G');
  const goalies  = players.filter(p => p.position === 'G');
  const ttg      = totalTeamGoals();
  const winning  = ['W','OTW','SOW'].includes(teamStats.result);

  // Real-time totals
  const sv = skaters.map(p => playerStats[p.id] || {});
  const totDressed = sv.filter(s => s.dressed).length;
  const totSOGs    = sv.reduce((s,p)=>s+(p.sogs   ||0),0);
  const totG       = sv.reduce((s,p)=>s+(p.goals  ||0),0);
  const totA       = sv.reduce((s,p)=>s+(p.assists||0),0);
  const totPlus    = sv.reduce((s,p)=>s+(p.plus   ||0),0);
  const totMinus   = sv.reduce((s,p)=>s+(p.minus  ||0),0);
  const totPIMs    = sv.reduce((s,p)=>s+(p.pims   ||0),0);
  const totPPG     = sv.reduce((s,p)=>s+(p.ppg    ||0),0);
  const totPPA     = sv.reduce((s,p)=>s+(p.ppa    ||0),0);
  const totSHG     = sv.reduce((s,p)=>s+(p.shg    ||0),0);
  const totSHA     = sv.reduce((s,p)=>s+(p.sha    ||0),0);

  const gv = goalies.map(p => playerStats[p.id] || {});
  const totGStarted  = gv.filter(g=>g.started).length;
  const totGMinutes  = gv.reduce((s,g)=>s+(g.minutesPlayed||0),0);
  const totSA        = gv.reduce((s,g)=>s+(g.shotsAgainst ||0),0);
  const totGA        = gv.reduce((s,g)=>s+(g.goalsAgainst ||0),0);
  const totGGoals    = gv.reduce((s,g)=>s+(g.goalieGoals  ||0),0);
  const totGAssists  = gv.reduce((s,g)=>s+(g.goalieAssists||0),0);
  const totGPIMs     = gv.reduce((s,g)=>s+(g.pims         ||0),0);

  const numInput = (pid, field, step_=1) => (
    <input type="number" min="0" step={step_} className="stat-input"
      value={playerStats[pid]?.[field] || 0}
      onChange={e => handlePlayerStatChange(pid, field, step_<1 ? parseFloat(e.target.value)||0 : parseInt(e.target.value)||0)} />
  );

  return (
    <div className="game-entry">
      <div className="steps-indicator">
        <div className={`step ${step===1?'active':'completed'}`}>1. Game Details</div>
        <div className={`step ${step===2?'active':step>2?'completed':''}`}>2. Team Stats</div>
        <div className={`step ${step===3?'active':step>3?'completed':''}`}>3. Player Stats</div>
        <div className={`step ${step===4?'active':''}`}>4. Review & Submit</div>
      </div>

      {message && (
        <div className={`message ${message.includes('Error')||message.includes('cannot')||message.includes('must')?'error':'success'}`}>{message}</div>
      )}

      {/* ── STEP 1: Game Details ── */}
      {step === 1 && (
        <div className="step-content">
          <h2>Game Details</h2>
          <div className="form-section">
            <h3>Game Information</h3>
            <div className="form-row">
              <div className="form-group"><label>Game Type *</label>
                <select value={gameDetails.gameType} onChange={e=>handleGameDetailsChange('gameType',e.target.value)}>{GAME_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-group"><label>Season *</label>
                <select value={gameDetails.season} onChange={e=>handleGameDetailsChange('season',e.target.value)}>{SEASONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div className="form-group"><label>Date *</label>
                <input type="date" value={gameDetails.gameDate} onChange={e=>handleGameDetailsChange('gameDate',e.target.value)} required /></div>
              <div className="form-group"><label>Time</label>
                <input type="time" value={gameDetails.gameTime} onChange={e=>handleGameDetailsChange('gameTime',e.target.value)} /></div>
            </div>
          </div>
          <div className="form-section">
            <h3>Location Information</h3>
            <div className="form-row">
              <div className="form-group"><label>Arena *</label>
                <input type="text" placeholder="e.g., Nashville Ice Center" value={gameDetails.arena} onChange={e=>handleGameDetailsChange('arena',e.target.value)} required /></div>
              <div className="form-group"><label>Location (City, State) *</label>
                <input type="text" placeholder="e.g., Nashville, TN" value={gameDetails.location} onChange={e=>handleGameDetailsChange('location',e.target.value)} required /></div>
              <div className="form-group"><label>Opponent *</label>
                <input type="text" placeholder="e.g., Memphis Youth" value={gameDetails.opponent} onChange={e=>handleGameDetailsChange('opponent',e.target.value)} required /></div>
              <div className="form-group"><label>Home / Away *</label>
                <select value={gameDetails.homeAway} onChange={e=>handleGameDetailsChange('homeAway',e.target.value)}>{HOME_AWAY.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
            </div>
          </div>
          <div className="form-section">
            <h3>Period Lengths (minutes)</h3>
            <div className="form-row">
              {[['1st Period','period1Length'],['2nd Period','period2Length'],['3rd Period','period3Length'],['OT Length','otLength']].map(([lbl,field])=>(
                <div key={field} className="form-group"><label>{lbl}{field!=='otLength'?' *':''}</label>
                  <input type="number" min="0" value={gameDetails[field]} onChange={e=>handleGameDetailsChange(field,parseInt(e.target.value)||0)} /></div>
              ))}
              <div className="form-group"><label>Standard Game Length *</label>
                <input type="number" min="0" value={gameDetails.standardGameLength}
                  onChange={e=>handleGameDetailsChange('standardGameLength',parseInt(e.target.value)||0)}
                  style={{background:'#111',color:'#FF2400',fontWeight:'bold'}} /></div>
            </div>
          </div>
          <div className="step-buttons">
            <button onClick={()=>setStep(2)} className="next-btn">Next Step →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Team Stats ── */}
      {step === 2 && (
        <div className="step-content">
          <h2>Team Statistics</h2>
          <div className="form-section">
            <div className="form-row">
              <div className="form-group"><label>Game Result *</label>
                <select value={teamStats.result} onChange={e=>handleTeamStatsChange('result',e.target.value)}>
                  {GAME_RESULTS.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
              <div className="form-group"><label>Power Plays (PP)</label>
                <input type="number" min="0" value={teamStats.powerPlays}
                  onChange={e=>handleTeamStatsChange('powerPlays',parseInt(e.target.value)||0)} /></div>
              <div className="form-group"><label>Penalty Kills (PK)</label>
                <input type="number" min="0" value={teamStats.penaltyKills}
                  onChange={e=>handleTeamStatsChange('penaltyKills',parseInt(e.target.value)||0)} /></div>
              <div className="form-group"><label>Successful PKs</label>
                <input type="number" min="0" value={teamStats.successfulPKs}
                  onChange={e=>handleTeamStatsChange('successfulPKs',parseInt(e.target.value)||0)} /></div>
            </div>
            <div className="form-row" style={{marginTop:'12px'}}>
              <div className="form-group" style={{maxWidth:'300px'}}>
                <label>Game Winning Goal (GWG) Scorer</label>
                <select value={teamStats.gwgPlayerId} onChange={e=>handleTeamStatsChange('gwgPlayerId',e.target.value)}
                  disabled={!winning}>
                  <option value="">{winning ? '— Select Player —' : 'N/A (no win)'}</option>
                  {winning && skaters.map(p=>(
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.name} ({playerStats[p.id]?.goals||0}G)
                    </option>
                  ))}
                </select>
                {!winning && <small style={{color:'#666',fontSize:'11px'}}>GWG only applies when result is W, OTW, or SOW</small>}
              </div>
            </div>
          </div>
          <div className="step-buttons">
            <button onClick={()=>setStep(1)} className="prev-btn">← Previous Step</button>
            <button onClick={()=>setStep(3)} className="next-btn">Next Step →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Player Stats ── */}
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
                      <th>Jersey</th><th>Name</th><th>Pos</th><th>Dressed?</th>
                      <th>SOGs</th><th>G</th><th>A</th>
                      <th>+</th><th>-</th><th>PIMs</th>
                      <th>PPG</th><th>PPA</th>
                      <th>SHG</th><th>SHA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skaters.map(p => (
                      <tr key={p.id}>
                        <td className="jersey">{p.jerseyNumber}</td>
                        <td className="name">{p.name}</td>
                        <td className="position">{p.position}</td>
                        <td className="checkbox">
                          <input type="checkbox" checked={playerStats[p.id]?.dressed||false}
                            onChange={()=>handlePlayerStatChange(p.id,'dressed')} />
                        </td>
                        <td>{numInput(p.id,'sogs')}</td>
                        <td>{numInput(p.id,'goals')}</td>
                        <td>{numInput(p.id,'assists')}</td>
                        <td>{numInput(p.id,'plus')}</td>
                        <td>{numInput(p.id,'minus')}</td>
                        <td>{numInput(p.id,'pims',0.5)}</td>
                        <td>{numInput(p.id,'ppg')}</td>
                        <td>{numInput(p.id,'ppa')}</td>
                        <td>{numInput(p.id,'shg')}</td>
                        <td>{numInput(p.id,'sha')}</td>
                      </tr>
                    ))}
                    <tr className="totals-row">
                      <td colSpan="3">TOTALS</td>
                      <td>{totDressed}</td>
                      <td>{totSOGs}</td><td>{totG}</td><td>{totA}</td>
                      <td>{totPlus}</td><td>{totMinus}</td><td>{totPIMs}</td>
                      <td>{totPPG}</td><td>{totPPA}</td>
                      <td>{totSHG}</td><td>{totSHA}</td>
                    </tr>
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
                      <th>Jersey</th><th>Name</th><th>Started?</th>
                      <th>Minutes</th><th>SA</th><th>GA</th><th>G</th><th>A</th><th>PIMs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalies.map(p => (
                      <tr key={p.id}>
                        <td className="jersey">{p.jerseyNumber}</td>
                        <td className="name">{p.name}</td>
                        <td className="checkbox">
                          <input type="checkbox" checked={playerStats[p.id]?.started||false}
                            onChange={()=>handlePlayerStatChange(p.id,'started')} />
                        </td>
                        <td>{numInput(p.id,'minutesPlayed')}</td>
                        <td>{numInput(p.id,'shotsAgainst')}</td>
                        <td>{numInput(p.id,'goalsAgainst')}</td>
                        <td>{numInput(p.id,'goalieGoals')}</td>
                        <td>{numInput(p.id,'goalieAssists')}</td>
                        <td>{numInput(p.id,'pims',0.5)}</td>
                      </tr>
                    ))}
                    <tr className="totals-row">
                      <td colSpan="2">TOTALS</td>
                      <td>{totGStarted}</td><td>{totGMinutes}</td>
                      <td>{totSA}</td><td>{totGA}</td>
                      <td>{totGGoals}</td><td>{totGAssists}</td><td>{totGPIMs}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="step-buttons">
            <button onClick={()=>setStep(2)} className="prev-btn">← Previous Step</button>
            <button onClick={()=>setStep(4)} className="next-btn">Review & Submit →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review ── */}
      {step === 4 && (
        <div className="step-content">
          <h2>Review & Submit</h2>
          <div className="review-section">
            <h3>Game Details</h3>
            <div className="review-grid">
              <div className="review-item"><strong>Type:</strong> {gameDetails.gameType}</div>
              <div className="review-item"><strong>Season:</strong> {gameDetails.season}</div>
              <div className="review-item"><strong>Date:</strong> {gameDetails.gameDate}</div>
              <div className="review-item"><strong>Opponent:</strong> {gameDetails.opponent}</div>
              <div className="review-item"><strong>Location:</strong> {gameDetails.location}</div>
              <div className="review-item"><strong>Home/Away:</strong> {gameDetails.homeAway}</div>
            </div>
          </div>
          <div className="review-section">
            <h3>Result & Score</h3>
            <div className="review-grid">
              <div className="review-item">
                <strong>Score:</strong>{' '}
                <span className="score">{ttg}</span> - <span>{gv.reduce((s,g)=>s+(g.goalsAgainst||0),0)}</span>
              </div>
              <div className="review-item"><strong>Result:</strong> {teamStats.result}</div>
              <div className="review-item"><strong>PP:</strong> {teamStats.powerPlays} | <strong>PK:</strong> {teamStats.penaltyKills} | <strong>Succ. PKs:</strong> {teamStats.successfulPKs}</div>
              {winning && teamStats.gwgPlayerId && (
                <div className="review-item"><strong>GWG:</strong> {players.find(p=>p.id===teamStats.gwgPlayerId)?.name || '—'}</div>
              )}
            </div>
          </div>
          <div className="step-buttons">
            <button onClick={()=>setStep(3)} className="prev-btn">← Back to Stats</button>
            <button onClick={handleSubmit} className="submit-btn">✓ Submit Game Statistics</button>
          </div>
        </div>
      )}
    </div>
  );
}
