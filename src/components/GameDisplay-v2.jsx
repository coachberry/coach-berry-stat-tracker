import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

function SortTh({ label, col, sort, onSort }) {
  const active = sort.col === col;
  const arrow  = active ? (sort.asc ? ' ▲' : ' ▼') : ' ⇅';
  return (
    <th onClick={() => onSort(col)} style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }} title={`Sort by ${label}`}>
      {label}<span style={{ fontSize:'10px', opacity: active?1:0.4 }}>{arrow}</span>
    </th>
  );
}

export function GameDetail({ game, allStats, teamName, onBack }) {
  const [skaterSort, setSkaterSort] = useState({ col: null, asc: false });
  const [goalieSort, setGoalieSort] = useState({ col: null, asc: false });

  const fmt = (ds) => { if (!ds) return 'N/A'; const [y,m,d]=ds.split('-'); return `${m}-${d}-${y}`; };
  const matchupLabel = (g) => `${teamName||'Us'} ${g.homeAway==='Home'?'vs.':'@'} ${g.opponent}`;

  const rawSkaters = allStats.filter(s => s.position !== 'G');
  const rawGoalies  = allStats.filter(s => s.position === 'G');

  const totalGoals   = rawSkaters.reduce((n,s)=>n+(s.goals  ||0),0);
  const totalAssists = rawSkaters.reduce((n,s)=>n+(s.assists||0),0);
  const totalShots   = rawSkaters.reduce((n,s)=>n+(s.sogs   ||0),0);
  const totalGA      = rawGoalies.reduce((n,g)=>n+(g.goalsAgainst||0),0);
  const totalPPG     = rawSkaters.reduce((n,s)=>n+(s.ppg||0),0);
  const shootPct     = totalShots > 0 ? ((totalGoals/totalShots)*100).toFixed(1) : '0.0';
  const stdLen       = game.standardGameLength || 45;

  const pp  = game.powerPlays    || 0;
  const pk  = game.penaltyKills  || 0;
  const spk = game.successfulPKs || 0;
  const ppPct = pp > 0  ? ((totalPPG / pp)  * 100).toFixed(1) : '0.0';
  const pkPct = pk > 0  ? ((spk / pk)       * 100).toFixed(1) : '0.0';

  const skaterVal = (s, col) => {
    if (col==='G')   return s.goals   ||0;
    if (col==='A')   return s.assists ||0;
    if (col==='Pts') return (s.goals||0)+(s.assists||0);
    if (col==='+')   return s.plus    ||0;
    if (col==='-')   return s.minus   ||0;
    if (col==='+/-') return (s.plus||0)-(s.minus||0);
    if (col==='SOGs')return s.sogs    ||0;
    if (col==='S%')  return s.sogs>0?s.goals/s.sogs:0;
    if (col==='PIMs')return s.pims    ||0;
    if (col==='PPG') return s.ppg     ||0;
    if (col==='PPA') return s.ppa     ||0;
    if (col==='PPP') return (s.ppg||0)+(s.ppa||0);
    if (col==='SHG') return s.shg     ||0;
    if (col==='SHA') return s.sha     ||0;
    if (col==='SHP') return (s.shg||0)+(s.sha||0);
    if (col==='GWG') return s.gwg     ||0;
    return 0;
  };
  const goalieVal = (g, col) => {
    const saves=(g.shotsAgainst||0)-(g.goalsAgainst||0);
    if (col==='MP')  return g.minutesPlayed||0;
    if (col==='SA')  return g.shotsAgainst ||0;
    if (col==='GA')  return g.goalsAgainst ||0;
    if (col==='SVs') return saves;
    if (col==='SV%') return g.shotsAgainst>0?saves/g.shotsAgainst:0;
    if (col==='GAA') return g.minutesPlayed>0?(g.goalsAgainst||0)*stdLen/g.minutesPlayed:0;
    if (col==='G')   return g.goalieGoals  ||0;
    if (col==='A')   return g.goalieAssists||0;
    if (col==='PIMs')return g.pims         ||0;
    return 0;
  };

  const applySort = (arr, sort, valFn) => {
    if (!sort.col) return [...arr].sort((a,b)=>parseInt(a.jerseyNumber)-parseInt(b.jerseyNumber));
    return [...arr].sort((a,b)=>{ const d=valFn(a,sort.col)-valFn(b,sort.col); return sort.asc?d:-d; });
  };
  const toggleSkater = col => setSkaterSort(p=>p.col===col?{col,asc:!p.asc}:{col,asc:false});
  const toggleGoalie  = col => setGoalieSort(p=>p.col===col?{col,asc:!p.asc}:{col,asc:false});

  const skaters = applySort(rawSkaters, skaterSort, skaterVal);
  const goalies  = applySort(rawGoalies, goalieSort, goalieVal);

  const infoItems = [
    { label:'Date',     value: fmt(game.gameDate) },
    game.arena    && { label:'Arena',    value: game.arena },
    game.location && { label:'Location', value: game.location },
    game.gameType && { label:'Type',     value: game.gameType },
    game.season   && { label:'Season',   value: game.season },
    { label:'Score',  value:`${totalGoals}-${totalGA}`, highlight:true },
    { label:'Result', value: game.teamResult, highlight:true },
    pp > 0 && { label:'PP%', value:`${ppPct}%  (${totalPPG}/${pp})`, highlight:true },
    pk > 0 && { label:'PK%', value:`${pkPct}%  (${spk}/${pk})`,    highlight:true },
  ].filter(Boolean);

  const STh = ({ label, col }) => <SortTh label={label} col={col} sort={skaterSort} onSort={toggleSkater} />;
  const GTh = ({ label, col }) => <SortTh label={label} col={col} sort={goalieSort} onSort={toggleGoalie} />;

  return (
    <div>
      {onBack && <button onClick={onBack} className="back-btn">← Back to Games</button>}

      <div className="game-header">
        <h2>{matchupLabel(game)}</h2>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'12px' }}>
          {infoItems.map((item,i) => (
            <div key={i} style={{
              background: item.highlight?'rgba(255,36,0,0.15)':'rgba(255,255,255,0.05)',
              border:`1px solid ${item.highlight?'#FF2400':'#333'}`,
              borderRadius:'6px', padding:'5px 12px', fontSize:'13px',
            }}>
              <span style={{ color:'#888', fontWeight:600, marginRight:'5px' }}>{item.label}:</span>
              <span style={{ color:item.highlight?'#FF2400':'#fff', fontWeight:item.highlight?700:400 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {skaters.length > 0 && (
        <div className="player-stats-display">
          <h3>Skater Statistics</h3>
          <p style={{color:'#555',fontSize:'11px',margin:'-8px 0 8px'}}>Click a column header to sort.</p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Pos</th><th>GP</th>
                  <STh label="G"   col="G"   /><STh label="A"   col="A"   /><STh label="Pts" col="Pts" />
                  <STh label="+"   col="+"   /><STh label="-"   col="-"   /><STh label="+/-" col="+/-" />
                  <STh label="SOGs"col="SOGs"/><STh label="S%"  col="S%"  /><STh label="PIMs"col="PIMs"/>
                  <STh label="PPG" col="PPG" /><STh label="PPA" col="PPA" /><STh label="PPP" col="PPP" />
                  <STh label="SHG" col="SHG" /><STh label="SHA" col="SHA" /><STh label="SHP" col="SHP" />
                  <STh label="GWG" col="GWG" />
                </tr>
              </thead>
              <tbody>
                {skaters.map((s,i) => {
                  const pm=(s.plus||0)-(s.minus||0);
                  const sPct=s.sogs>0?((s.goals/s.sogs)*100).toFixed(1):'0.0';
                  return (
                    <tr key={i}>
                      <td className="jersey">{s.jerseyNumber}</td>
                      <td className="name">{s.name}</td>
                      <td style={{textAlign:'center'}}>{s.position}</td>
                      <td>{s.dressed?1:0}</td>
                      <td>{s.goals  ||0}</td><td>{s.assists||0}</td>
                      <td className="pts">{(s.goals||0)+(s.assists||0)}</td>
                      <td>{s.plus||0}</td><td>{s.minus||0}</td>
                      <td>{pm>0?`+${pm}`:pm}</td>
                      <td>{s.sogs||0}</td><td>{sPct}%</td><td>{s.pims||0}</td>
                      <td>{s.ppg||0}</td><td>{s.ppa||0}</td><td>{(s.ppg||0)+(s.ppa||0)}</td>
                      <td>{s.shg||0}</td><td>{s.sha||0}</td><td>{(s.shg||0)+(s.sha||0)}</td>
                      <td>{s.gwg||0}</td>
                    </tr>
                  );
                })}
                <tr className="totals-row">
                  <td colSpan="3">TOTALS</td>
                  <td>{rawSkaters.filter(s=>s.dressed).length}</td>
                  <td>{totalGoals}</td><td>{totalAssists}</td><td>{totalGoals+totalAssists}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.plus||0),0)}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.minus||0),0)}</td>
                  <td>{(()=>{const pm=rawSkaters.reduce((n,s)=>n+(s.plus||0)-(s.minus||0),0);return pm>0?`+${pm}`:pm;})()}</td>
                  <td>{totalShots}</td><td>{shootPct}%</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.pims||0),0)}</td>
                  <td>{totalPPG}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.ppa||0),0)}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.ppg||0)+(s.ppa||0),0)}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.shg||0),0)}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.sha||0),0)}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.shg||0)+(s.sha||0),0)}</td>
                  <td>{rawSkaters.reduce((n,s)=>n+(s.gwg||0),0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {goalies.length > 0 && (
        <div className="goalie-stats-display">
          <h3>Goalie Statistics</h3>
          <p style={{color:'#555',fontSize:'11px',margin:'-8px 0 8px'}}>Click a column header to sort.</p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>GS</th><th>GP</th>
                  <GTh label="MP"  col="MP"  /><GTh label="SA"  col="SA"  /><GTh label="GA"  col="GA"  />
                  <GTh label="SVs" col="SVs" /><GTh label="SV%" col="SV%" /><GTh label="GAA" col="GAA" />
                  <th>W</th><th>L</th><th>T</th><th>OTW</th><th>OTL</th><th>SOW</th><th>SOL</th>
                  <GTh label="G"   col="G"   /><GTh label="A"   col="A"   /><GTh label="PIMs"col="PIMs"/>
                </tr>
              </thead>
              <tbody>
                {goalies.map((g,i) => {
                  const saves=(g.shotsAgainst||0)-(g.goalsAgainst||0);
                  const svPct=g.shotsAgainst>0?((saves/g.shotsAgainst)*100).toFixed(1):'0.0';
                  const gaa=(g.minutesPlayed||0)>0?(((g.goalsAgainst||0)*stdLen)/g.minutesPlayed).toFixed(2):'0.00';
                  const played=g.started||(g.minutesPlayed||0)>0;
                  const r=game.teamResult||'';
                  return (
                    <tr key={i}>
                      <td className="jersey">{g.jerseyNumber}</td><td className="name">{g.name}</td>
                      <td>{g.started?1:0}</td><td>{played?1:0}</td>
                      <td>{g.minutesPlayed||0}</td><td>{g.shotsAgainst||0}</td><td>{g.goalsAgainst||0}</td>
                      <td>{saves}</td><td>{svPct}%</td><td>{gaa}</td>
                      <td>{played&&r==='W'?1:0}</td><td>{played&&r==='L'?1:0}</td><td>{played&&r==='T'?1:0}</td>
                      <td>{played&&r==='OTW'?1:0}</td><td>{played&&r==='OTL'?1:0}</td>
                      <td>{played&&r==='SOW'?1:0}</td><td>{played&&r==='SOL'?1:0}</td>
                      <td>{g.goalieGoals||0}</td><td>{g.goalieAssists||0}</td><td>{g.pims||0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {allStats.length === 0 && <div className="no-data">No player stats recorded for this game.</div>}
    </div>
  );
}

export default function GameDisplay({ teamId, teamName }) {
  const [games,        setGames]        = useState([]);
  const [gameStatsMap, setGameStatsMap] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { fetchAll(); }, [teamId]);

  const fetchAll = async () => {
    try {
      const [gSnap, sSnap] = await Promise.all([
        getDocs(query(collection(db,'games'),           where('teamId','==',teamId))),
        getDocs(query(collection(db,'playerGameStats'), where('teamId','==',teamId))),
      ]);
      const games = gSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.gameDate)-new Date(a.gameDate));
      const map   = {};
      sSnap.docs.forEach(d=>{ const s=d.data(); if(!map[s.gameId])map[s.gameId]=[]; map[s.gameId].push(s); });
      setGames(games); setGameStatsMap(map);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const fmt = (ds) => { if(!ds)return 'N/A'; const[y,m,d]=ds.split('-'); return `${m}-${d}-${y}`; };
  const scoreFor = (id) => {
    const s=gameStatsMap[id]||[];
    return { gf:s.filter(x=>x.position!=='G').reduce((n,x)=>n+(x.goals||0),0), ga:s.filter(x=>x.position==='G').reduce((n,x)=>n+(x.goalsAgainst||0),0) };
  };
  const matchup = (g) => `${teamName||'Us'} ${g.homeAway==='Home'?'vs.':'@'} ${g.opponent}`;

  if (loading) return <div className="loading">Loading games...</div>;

  if (selectedGame) return (
    <div className="display-view">
      <GameDetail game={selectedGame} allStats={gameStatsMap[selectedGame.id]||[]} teamName={teamName} onBack={()=>setSelectedGame(null)} />
    </div>
  );

  return (
    <div className="display-view">
      <h2>Game Statistics</h2>
      {games.length === 0 ? <div className="no-data">No games recorded yet.</div> : (
        <div className="games-list">
          {games.map(g=>{ const {gf,ga}=scoreFor(g.id); return (
            <div key={g.id} className="game-list-item">
              <div className="game-list-date">{fmt(g.gameDate)}</div>
              <div className="game-list-opponent">{matchup(g)}</div>
              <div className="game-list-type">{g.gameType}</div>
              <div className="game-list-score">{gf}-{ga}</div>
              <div className="game-list-result">{g.teamResult}</div>
              <button onClick={()=>setSelectedGame(g)} className="view-details-btn">View Details</button>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}
