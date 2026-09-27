import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

export default function PlayerStats({ teamId }) {
  const [allPS,      setAllPS]      = useState([]);
  const [allGames,   setAllGames]   = useState([]);
  const [players,    setPlayers]    = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading,    setLoading]    = useState(true);

  useEffect(()=>{
    const load=async()=>{
      try{
        const [ps,gs]=await Promise.all([
          getDocs(query(collection(db,'playerGameStats'),where('teamId','==',teamId))),
          getDocs(query(collection(db,'games'),          where('teamId','==',teamId))),
        ]);
        const stats=ps.docs.map(d=>d.data());
        const games=gs.docs.map(d=>({id:d.id,...d.data()}));
        const seen=new Set(); const uniq=[];
        stats.slice().sort((a,b)=>parseInt(a.jerseyNumber)-parseInt(b.jerseyNumber)).forEach(s=>{
          if(!seen.has(s.playerId)){seen.add(s.playerId);uniq.push({id:s.playerId,name:s.name,jerseyNumber:s.jerseyNumber,position:s.position});}
        });
        setAllPS(stats);setAllGames(games);setPlayers(uniq);
        if(uniq.length>0)setSelectedId(uniq[0].id);
      }catch(e){console.error(e);}finally{setLoading(false);}
    };
    load();
  },[teamId]);

  const fmt=(ds)=>{if(!ds)return'N/A';const[y,m,d]=ds.split('-');return`${m}-${d}-${y}`;};
  const pmf=(n)=>n>0?`+${n}`:`${n}`;
  const sum=(arr,fn)=>arr.reduce((n,x)=>n+fn(x),0);

  const selected=players.find(p=>p.id===selectedId);
  const isGoalie=selected?.position==='G';

  const gameRows=allPS.filter(s=>s.playerId===selectedId).map(s=>{
    const g=allGames.find(x=>x.id===s.gameId)||{};
    return{...s,gameDate:g.gameDate||'',opponentLabel:g.opponent?`${g.homeAway==='Home'?'vs.':'@'} ${g.opponent}`:'—',teamResult:g.teamResult||'—',game:g};
  }).sort((a,b)=>new Date(b.gameDate||0)-new Date(a.gameDate||0));

  if(loading)return<div className="loading">Loading player stats...</div>;
  if(players.length===0)return<div className="display-view"><h2>Individual Player Statistics</h2><div className="no-data">No player statistics recorded yet.</div></div>;

  return(
    <div className="display-view">
      <h2>Individual Player Statistics</h2>
      <div style={{marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
        <label style={{color:'#fff',fontWeight:600,fontSize:'14px'}}>Select Player:</label>
        <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}
          style={{padding:'8px 12px',borderRadius:'6px',background:'#0a0a0a',color:'#fff',border:'2px solid #333',fontSize:'14px',cursor:'pointer',minWidth:'220px'}}>
          {players.map(p=><option key={p.id} value={p.id}>#{p.jerseyNumber} – {p.name} ({p.position})</option>)}
        </select>
        {selected&&<span style={{background:'rgba(255,36,0,0.12)',color:'#FF2400',padding:'4px 12px',borderRadius:'12px',fontSize:'12px',fontWeight:600,border:'1px solid rgba(255,36,0,0.4)'}}>
          {gameRows.filter(r=>r.dressed||r.started).length} GP
        </span>}
      </div>

      {gameRows.length===0?<div className="no-data">No games recorded for {selected?.name||'this player'} yet.</div>:isGoalie?(
        <div className="table-wrapper"><table>
          <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>GS</th><th>MP</th><th>SA</th><th>GA</th><th>SVs</th><th>SV%</th><th>G</th><th>A</th><th>PIMs</th></tr></thead>
          <tbody>
            {gameRows.map((r,i)=>{
              const sa=r.shotsAgainst||0;const ga=r.goalsAgainst||0;const saves=sa-ga;
              const svPct=sa>0?((saves/sa)*100).toFixed(1):'0.0';
              return(<tr key={i}><td style={{whiteSpace:'nowrap'}}>{fmt(r.gameDate)}</td><td style={{whiteSpace:'nowrap'}}>{r.opponentLabel}</td><td style={{color:'#FF2400',fontWeight:700}}>{r.teamResult}</td><td>{r.started?1:0}</td><td>{r.minutesPlayed||0}</td><td>{sa}</td><td>{ga}</td><td>{saves}</td><td>{svPct}%</td><td>{r.goalieGoals||0}</td><td>{r.goalieAssists||0}</td><td>{r.pims||0}</td></tr>);
            })}
            <tr className="totals-row">
              <td colSpan="3">TOTALS ({gameRows.filter(r=>r.started).length} GS)</td>
              <td>{gameRows.filter(r=>r.started).length}</td><td>{sum(gameRows,r=>r.minutesPlayed||0)}</td>
              <td>{sum(gameRows,r=>r.shotsAgainst||0)}</td><td>{sum(gameRows,r=>r.goalsAgainst||0)}</td>
              <td>{sum(gameRows,r=>(r.shotsAgainst||0)-(r.goalsAgainst||0))}</td>
              <td>{(()=>{const sa=sum(gameRows,r=>r.shotsAgainst||0);const ga=sum(gameRows,r=>r.goalsAgainst||0);return sa>0?(((sa-ga)/sa)*100).toFixed(1)+'%':'0.0%';})()}</td>
              <td>{sum(gameRows,r=>r.goalieGoals||0)}</td><td>{sum(gameRows,r=>r.goalieAssists||0)}</td><td>{sum(gameRows,r=>r.pims||0)}</td>
            </tr>
          </tbody>
        </table></div>
      ):(
        <div className="table-wrapper"><table>
          <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>GP</th><th>G</th><th>A</th><th>Pts</th><th>+</th><th>-</th><th>+/-</th><th>SOGs</th><th>S%</th><th>PIMs</th><th>PPG</th><th>PPA</th><th>PPP</th><th>SHG</th><th>SHA</th><th>SHP</th><th>GWG</th></tr></thead>
          <tbody>
            {gameRows.map((r,i)=>{
              const pm=(r.plus||0)-(r.minus||0);const sPct=r.sogs>0?((r.goals/r.sogs)*100).toFixed(1):'0.0';
              return(<tr key={i}><td style={{whiteSpace:'nowrap'}}>{fmt(r.gameDate)}</td><td style={{whiteSpace:'nowrap'}}>{r.opponentLabel}</td><td style={{color:'#FF2400',fontWeight:700}}>{r.teamResult}</td><td>{r.dressed?1:0}</td><td>{r.goals||0}</td><td>{r.assists||0}</td><td className="pts">{(r.goals||0)+(r.assists||0)}</td><td>{r.plus||0}</td><td>{r.minus||0}</td><td>{pmf(pm)}</td><td>{r.sogs||0}</td><td>{sPct}%</td><td>{r.pims||0}</td><td>{r.ppg||0}</td><td>{r.ppa||0}</td><td>{(r.ppg||0)+(r.ppa||0)}</td><td>{r.shg||0}</td><td>{r.sha||0}</td><td>{(r.shg||0)+(r.sha||0)}</td><td>{r.gwg||0}</td></tr>);
            })}
            <tr className="totals-row">
              <td colSpan="3">TOTALS ({gameRows.filter(r=>r.dressed).length} GP)</td>
              <td>{gameRows.filter(r=>r.dressed).length}</td>
              <td>{sum(gameRows,r=>r.goals||0)}</td><td>{sum(gameRows,r=>r.assists||0)}</td><td>{sum(gameRows,r=>(r.goals||0)+(r.assists||0))}</td>
              <td>{sum(gameRows,r=>r.plus||0)}</td><td>{sum(gameRows,r=>r.minus||0)}</td><td>{pmf(sum(gameRows,r=>(r.plus||0)-(r.minus||0)))}</td>
              <td>{sum(gameRows,r=>r.sogs||0)}</td>
              <td>{(()=>{const g=sum(gameRows,r=>r.goals||0);const sh=sum(gameRows,r=>r.sogs||0);return sh>0?((g/sh)*100).toFixed(1)+'%':'0.0%';})()}</td>
              <td>{sum(gameRows,r=>r.pims||0)}</td>
              <td>{sum(gameRows,r=>r.ppg||0)}</td><td>{sum(gameRows,r=>r.ppa||0)}</td><td>{sum(gameRows,r=>(r.ppg||0)+(r.ppa||0))}</td>
              <td>{sum(gameRows,r=>r.shg||0)}</td><td>{sum(gameRows,r=>r.sha||0)}</td><td>{sum(gameRows,r=>(r.shg||0)+(r.sha||0))}</td>
              <td>{sum(gameRows,r=>r.gwg||0)}</td>
            </tr>
          </tbody>
        </table></div>
      )}
    </div>
  );
}
