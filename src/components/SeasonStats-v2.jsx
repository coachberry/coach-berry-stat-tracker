import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

const MS = {
  overlay:  { position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' },
  box:      { background:'#1a1a1a',border:'2px solid #FF2400',borderRadius:'10px',padding:'28px',maxWidth:'960px',width:'100%',maxHeight:'82vh',overflowY:'auto' },
  header:   { display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px' },
  title:    { color:'#FF2400',fontSize:'18px',fontWeight:700,margin:0 },
  closeBtn: { background:'transparent',border:'2px solid #555',color:'#ccc',borderRadius:'6px',padding:'6px 16px',cursor:'pointer',fontWeight:700,fontSize:'14px' },
};

function SortTh({ label, col, sort, onSort }) {
  const a=sort.col===col; const arrow=a?(sort.asc?' ▲':' ▼'):' ⇅';
  return <th onClick={()=>onSort(col)} style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} title={`Sort by ${label}`}>{label}<span style={{fontSize:'10px',opacity:a?1:0.4}}>{arrow}</span></th>;
}

export default function SeasonStats({ teamId }) {
  const [allPS,        setAllPS]        = useState([]);
  const [allGames,     setAllGames]     = useState([]);
  const [season,       setSeason]       = useState('');
  const [availSeasons, setAvailSeasons] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [skSort,       setSkSort]       = useState({ col:'Pts', asc:false });
  const [goSort,       setGoSort]       = useState({ col:null,  asc:false });

  useEffect(()=>{
    const load=async()=>{
      try{
        const [ps,gs]=await Promise.all([
          getDocs(query(collection(db,'playerGameStats'),where('teamId','==',teamId))),
          getDocs(query(collection(db,'games'),          where('teamId','==',teamId))),
        ]);
        const stats=ps.docs.map(d=>d.data());
        const games=gs.docs.map(d=>({id:d.id,...d.data()}));
        const seasons=[...new Set(games.map(g=>g.season).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
        setAllPS(stats); setAllGames(games); setAvailSeasons(seasons);
        if(seasons.length>0)setSeason(seasons[0]);
      }catch(e){console.error(e);}finally{setLoading(false);}
    };
    load();
  },[teamId]);

  const fmt=(ds)=>{if(!ds)return'N/A';const[y,m,d]=ds.split('-');return`${m}-${d}-${y}`;};
  const sum=(arr,fn)=>arr.reduce((n,x)=>n+fn(x),0);
  const pmf=(n)=>n>0?`+${n}`:`${n}`;

  const sgIds=new Set(allGames.filter(g=>g.season===season).map(g=>g.id));
  const ss   =allPS.filter(s=>sgIds.has(s.gameId));

  // Skater map
  const skMap={};
  ss.filter(s=>s.position!=='G').forEach(s=>{
    if(!skMap[s.playerId])skMap[s.playerId]={playerId:s.playerId,name:s.name,jerseyNumber:s.jerseyNumber,position:s.position,GP:0,G:0,A:0,plus:0,minus:0,SOGs:0,PIMs:0,PPG:0,PPA:0,SHG:0,SHA:0,GWG:0};
    const p=skMap[s.playerId];
    if(s.dressed)p.GP++;
    p.G+=s.goals||0;p.A+=s.assists||0;p.plus+=s.plus||0;p.minus+=s.minus||0;p.SOGs+=s.sogs||0;p.PIMs+=s.pims||0;
    p.PPG+=s.ppg||0;p.PPA+=s.ppa||0;p.SHG+=s.shg||0;p.SHA+=s.sha||0;p.GWG+=s.gwg||0;
  });

  const skVal=(p,col)=>{
    if(col==='GP') return p.GP; if(col==='G')  return p.G;  if(col==='A')  return p.A;
    if(col==='Pts')return p.G+p.A; if(col==='+')return p.plus; if(col==='-')return p.minus;
    if(col==='+/-')return p.plus-p.minus; if(col==='SOGs')return p.SOGs; if(col==='S%')return p.SOGs>0?p.G/p.SOGs:0;
    if(col==='PIMs')return p.PIMs; if(col==='PPG')return p.PPG; if(col==='PPA')return p.PPA;
    if(col==='PPP')return p.PPG+p.PPA; if(col==='SHG')return p.SHG; if(col==='SHA')return p.SHA;
    if(col==='SHP')return p.SHG+p.SHA; if(col==='GWG')return p.GWG; return 0;
  };
  const tSk=(col)=>setSkSort(p=>p.col===col?{col,asc:!p.asc}:{col,asc:false});
  const skaters=(!skSort.col?Object.values(skMap):Object.values(skMap).sort((a,b)=>{const d=skVal(a,skSort.col)-skVal(b,skSort.col);return skSort.asc?d:-d;}));

  // Goalie map
  const goMap={};
  ss.filter(s=>s.position==='G').forEach(s=>{
    const g=allGames.find(x=>x.id===s.gameId)||{};
    if(!goMap[s.playerId])goMap[s.playerId]={playerId:s.playerId,name:s.name,jerseyNumber:s.jerseyNumber,position:'G',GP:0,GS:0,MP:0,SA:0,GA:0,W:0,L:0,T:0,OTW:0,OTL:0,SOW:0,SOL:0,gG:0,gA:0,PIMs:0,stdLen:g.standardGameLength||45};
    const p=goMap[s.playerId]; const played=s.started||(s.minutesPlayed||0)>0;
    if(played)p.GP++;if(s.started)p.GS++;p.MP+=s.minutesPlayed||0;p.SA+=s.shotsAgainst||0;p.GA+=s.goalsAgainst||0;p.gG+=s.goalieGoals||0;p.gA+=s.goalieAssists||0;p.PIMs+=s.pims||0;
    if(played){const r=g.teamResult||'';if(r==='W')p.W++;if(r==='L')p.L++;if(r==='T')p.T++;if(r==='OTW')p.OTW++;if(r==='OTL')p.OTL++;if(r==='SOW')p.SOW++;if(r==='SOL')p.SOL++;}
  });
  const goVal=(p,col)=>{
    const sv=p.SA-p.GA;
    if(col==='GP')return p.GP;if(col==='GS')return p.GS;if(col==='MP')return p.MP;if(col==='SA')return p.SA;if(col==='GA')return p.GA;
    if(col==='SVs')return sv;if(col==='SV%')return p.SA>0?sv/p.SA:0;if(col==='GAA')return p.MP>0?(p.GA*p.stdLen)/p.MP:0;
    if(col==='W')return p.W;if(col==='PIMs')return p.PIMs;return 0;
  };
  const tGo=(col)=>setGoSort(p=>p.col===col?{col,asc:!p.asc}:{col,asc:false});
  const goalies=(!goSort.col?Object.values(goMap).sort((a,b)=>parseInt(a.jerseyNumber)-parseInt(b.jerseyNumber)):Object.values(goMap).sort((a,b)=>{const d=goVal(a,goSort.col)-goVal(b,goSort.col);return goSort.asc?d:-d;}));

  const openModal=(player)=>{
    const isGoalie=player.position==='G';
    const rows=ss.filter(s=>s.playerId===player.playerId).map(s=>{const g=allGames.find(x=>x.id===s.gameId)||{};const pfx=g.homeAway==='Home'?'vs.':'@';return{...s,game:g,opp:g.opponent?`${pfx} ${g.opponent}`:'—'};}).sort((a,b)=>new Date(b.game.gameDate||0)-new Date(a.game.gameDate||0));
    setModal({player,rows,isGoalie});
  };

  const STh=({l,c})=><SortTh label={l} col={c} sort={skSort} onSort={tSk}/>;
  const GTh=({l,c})=><SortTh label={l} col={c} sort={goSort} onSort={tGo}/>;

  if(loading)return<div className="loading">Loading season stats...</div>;

  return(
    <div className="display-view">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'10px'}}>
        <h2 style={{margin:0}}>Season Statistics</h2>
        {availSeasons.length>0&&(
          <select value={season} onChange={e=>setSeason(e.target.value)} style={{padding:'8px 14px',borderRadius:'6px',cursor:'pointer',background:'#0a0a0a',color:'#FF2400',border:'2px solid #FF2400',fontSize:'14px',fontWeight:600}}>
            {availSeasons.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {ss.length===0?<div className="no-data">No games recorded for the {season} season.</div>:(
        <>
          {skaters.length>0&&(
            <div className="player-stats-display">
              <h3>Skater Statistics</h3>
              <p style={{color:'#555',fontSize:'11px',margin:'-8px 0 8px'}}>Click column to sort. Click player row to view game log.</p>
              <div className="table-wrapper"><table>
                <thead><tr>
                  <th>#</th><th>Name</th><th>Pos</th>
                  <STh l="GP" c="GP"/><STh l="G" c="G"/><STh l="A" c="A"/><STh l="Pts" c="Pts"/>
                  <STh l="+" c="+"/><STh l="-" c="-"/><STh l="+/-" c="+/-"/>
                  <STh l="SOGs" c="SOGs"/><STh l="S%" c="S%"/><STh l="PIMs" c="PIMs"/>
                  <STh l="PPG" c="PPG"/><STh l="PPA" c="PPA"/><STh l="PPP" c="PPP"/>
                  <STh l="SHG" c="SHG"/><STh l="SHA" c="SHA"/><STh l="SHP" c="SHP"/>
                  <STh l="GWG" c="GWG"/>
                </tr></thead>
                <tbody>
                  {skaters.map((p,i)=>{
                    const pts=p.G+p.A;const pm=p.plus-p.minus;const sPct=p.SOGs>0?((p.G/p.SOGs)*100).toFixed(1):'0.0';
                    return(<tr key={i} onClick={()=>openModal(p)} title="View game log" style={{cursor:'pointer'}}>
                      <td className="jersey">{p.jerseyNumber}</td>
                      <td className="name" style={{color:'#FF2400',textDecoration:'underline dotted'}}>{p.name}</td>
                      <td style={{textAlign:'center'}}>{p.position}</td>
                      <td>{p.GP}</td><td>{p.G}</td><td>{p.A}</td><td className="pts">{pts}</td>
                      <td>{p.plus}</td><td>{p.minus}</td><td>{pmf(pm)}</td>
                      <td>{p.SOGs}</td><td>{sPct}%</td><td>{p.PIMs}</td>
                      <td>{p.PPG}</td><td>{p.PPA}</td><td>{p.PPG+p.PPA}</td>
                      <td>{p.SHG}</td><td>{p.SHA}</td><td>{p.SHG+p.SHA}</td>
                      <td>{p.GWG}</td>
                    </tr>);
                  })}
                  <tr className="totals-row">
                    <td colSpan="3">TOTALS</td>
                    <td>{sum(skaters,p=>p.GP)}</td><td>{sum(skaters,p=>p.G)}</td><td>{sum(skaters,p=>p.A)}</td>
                    <td>{sum(skaters,p=>p.G+p.A)}</td><td>{sum(skaters,p=>p.plus)}</td><td>{sum(skaters,p=>p.minus)}</td>
                    <td>{pmf(sum(skaters,p=>p.plus-p.minus))}</td><td>{sum(skaters,p=>p.SOGs)}</td>
                    <td>{(()=>{const g=sum(skaters,p=>p.G);const sh=sum(skaters,p=>p.SOGs);return sh>0?((g/sh)*100).toFixed(1)+'%':'0.0%';})()}</td>
                    <td>{sum(skaters,p=>p.PIMs)}</td>
                    <td>{sum(skaters,p=>p.PPG)}</td><td>{sum(skaters,p=>p.PPA)}</td><td>{sum(skaters,p=>p.PPG+p.PPA)}</td>
                    <td>{sum(skaters,p=>p.SHG)}</td><td>{sum(skaters,p=>p.SHA)}</td><td>{sum(skaters,p=>p.SHG+p.SHA)}</td>
                    <td>{sum(skaters,p=>p.GWG)}</td>
                  </tr>
                </tbody>
              </table></div>
            </div>
          )}

          {goalies.length>0&&(
            <div className="goalie-stats-display">
              <h3>Goalie Statistics</h3>
              <p style={{color:'#555',fontSize:'11px',margin:'-8px 0 8px'}}>Click column to sort. Click goalie row to view game log.</p>
              <div className="table-wrapper"><table>
                <thead><tr>
                  <th>#</th><th>Name</th>
                  <GTh l="GP" c="GP"/><GTh l="GS" c="GS"/><GTh l="MP" c="MP"/>
                  <GTh l="SA" c="SA"/><GTh l="GA" c="GA"/><GTh l="SVs" c="SVs"/><GTh l="SV%" c="SV%"/><GTh l="GAA" c="GAA"/>
                  <th>W</th><th>L</th><th>T</th><th>OTW</th><th>OTL</th><th>SOW</th><th>SOL</th>
                  <th>G</th><th>A</th><GTh l="PIMs" c="PIMs"/>
                </tr></thead>
                <tbody>
                  {goalies.map((p,i)=>{
                    const saves=p.SA-p.GA;const svPct=p.SA>0?((saves/p.SA)*100).toFixed(1):'0.0';const gaa=p.MP>0?((p.GA*p.stdLen)/p.MP).toFixed(2):'0.00';
                    return(<tr key={i} onClick={()=>openModal(p)} title="View game log" style={{cursor:'pointer'}}>
                      <td className="jersey">{p.jerseyNumber}</td>
                      <td className="name" style={{color:'#FF2400',textDecoration:'underline dotted'}}>{p.name}</td>
                      <td>{p.GP}</td><td>{p.GS}</td><td>{p.MP}</td>
                      <td>{p.SA}</td><td>{p.GA}</td><td>{saves}</td><td>{svPct}%</td><td>{gaa}</td>
                      <td>{p.W}</td><td>{p.L}</td><td>{p.T}</td><td>{p.OTW}</td><td>{p.OTL}</td><td>{p.SOW}</td><td>{p.SOL}</td>
                      <td>{p.gG}</td><td>{p.gA}</td><td>{p.PIMs}</td>
                    </tr>);
                  })}
                  <tr className="totals-row">
                    <td colSpan="2">TOTALS</td>
                    <td>{sum(goalies,p=>p.GP)}</td><td>{sum(goalies,p=>p.GS)}</td><td>{sum(goalies,p=>p.MP)}</td>
                    <td>{sum(goalies,p=>p.SA)}</td><td>{sum(goalies,p=>p.GA)}</td><td>{sum(goalies,p=>p.SA-p.GA)}</td>
                    <td>{(()=>{const sa=sum(goalies,p=>p.SA);const ga=sum(goalies,p=>p.GA);return sa>0?(((sa-ga)/sa)*100).toFixed(1)+'%':'0.0%';})()}</td><td>—</td>
                    <td>{sum(goalies,p=>p.W)}</td><td>{sum(goalies,p=>p.L)}</td><td>{sum(goalies,p=>p.T)}</td>
                    <td>{sum(goalies,p=>p.OTW)}</td><td>{sum(goalies,p=>p.OTL)}</td><td>{sum(goalies,p=>p.SOW)}</td><td>{sum(goalies,p=>p.SOL)}</td>
                    <td>{sum(goalies,p=>p.gG)}</td><td>{sum(goalies,p=>p.gA)}</td><td>{sum(goalies,p=>p.PIMs)}</td>
                  </tr>
                </tbody>
              </table></div>
            </div>
          )}
        </>
      )}

      {modal&&(
        <div style={MS.overlay} onClick={()=>setModal(null)}>
          <div style={MS.box} onClick={e=>e.stopPropagation()}>
            <div style={MS.header}>
              <h3 style={MS.title}>#{modal.player.jerseyNumber} – {modal.player.name} <span style={{color:'#777',fontWeight:400,fontSize:'14px',marginLeft:'10px'}}>Game Log · {season}</span></h3>
              <button style={MS.closeBtn} onClick={()=>setModal(null)}>✕ Close</button>
            </div>
            {modal.rows.length===0?<div className="no-data">No games this season.</div>:modal.isGoalie?(
              <div className="table-wrapper"><table>
                <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>MP</th><th>SA</th><th>GA</th><th>SV%</th><th>GAA</th><th>G</th><th>A</th><th>PIMs</th></tr></thead>
                <tbody>
                  {modal.rows.map((r,i)=>{
                    const sa=r.shotsAgainst||0;const ga=r.goalsAgainst||0;const mp=r.minutesPlayed||0;
                    const svPct=sa>0?(((sa-ga)/sa)*100).toFixed(1):'0.0';const std=r.game.standardGameLength||45;const gaa=mp>0?((ga*std)/mp).toFixed(2):'0.00';
                    return(<tr key={i}><td style={{whiteSpace:'nowrap'}}>{fmt(r.game.gameDate)}</td><td style={{whiteSpace:'nowrap'}}>{r.opp}</td><td style={{color:'#FF2400',fontWeight:700}}>{r.game.teamResult||'—'}</td><td>{mp}</td><td>{sa}</td><td>{ga}</td><td>{svPct}%</td><td>{gaa}</td><td>{r.goalieGoals||0}</td><td>{r.goalieAssists||0}</td><td>{r.pims||0}</td></tr>);
                  })}
                  <tr className="totals-row">
                    <td colSpan="3">TOTALS ({modal.rows.length} GP)</td>
                    <td>{sum(modal.rows,r=>r.minutesPlayed||0)}</td><td>{sum(modal.rows,r=>r.shotsAgainst||0)}</td><td>{sum(modal.rows,r=>r.goalsAgainst||0)}</td>
                    <td>{(()=>{const sa=sum(modal.rows,r=>r.shotsAgainst||0);const ga=sum(modal.rows,r=>r.goalsAgainst||0);return sa>0?(((sa-ga)/sa)*100).toFixed(1)+'%':'0.0%';})()}</td><td>—</td>
                    <td>{sum(modal.rows,r=>r.goalieGoals||0)}</td><td>{sum(modal.rows,r=>r.goalieAssists||0)}</td><td>{sum(modal.rows,r=>r.pims||0)}</td>
                  </tr>
                </tbody>
              </table></div>
            ):(
              <div className="table-wrapper"><table>
                <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>GP</th><th>G</th><th>A</th><th>Pts</th><th>+</th><th>-</th><th>+/-</th><th>SOGs</th><th>S%</th><th>PIMs</th><th>PPG</th><th>PPA</th><th>PPP</th><th>SHG</th><th>SHA</th><th>SHP</th><th>GWG</th></tr></thead>
                <tbody>
                  {modal.rows.map((r,i)=>{
                    const pm=(r.plus||0)-(r.minus||0);const sPct=r.sogs>0?((r.goals/r.sogs)*100).toFixed(1):'0.0';
                    return(<tr key={i}><td style={{whiteSpace:'nowrap'}}>{fmt(r.game.gameDate)}</td><td style={{whiteSpace:'nowrap'}}>{r.opp}</td><td style={{color:'#FF2400',fontWeight:700}}>{r.game.teamResult||'—'}</td><td>{r.dressed?1:0}</td><td>{r.goals||0}</td><td>{r.assists||0}</td><td className="pts">{(r.goals||0)+(r.assists||0)}</td><td>{r.plus||0}</td><td>{r.minus||0}</td><td>{pmf(pm)}</td><td>{r.sogs||0}</td><td>{sPct}%</td><td>{r.pims||0}</td><td>{r.ppg||0}</td><td>{r.ppa||0}</td><td>{(r.ppg||0)+(r.ppa||0)}</td><td>{r.shg||0}</td><td>{r.sha||0}</td><td>{(r.shg||0)+(r.sha||0)}</td><td>{r.gwg||0}</td></tr>);
                  })}
                  <tr className="totals-row">
                    <td colSpan="3">TOTALS ({modal.rows.filter(r=>r.dressed).length} GP)</td>
                    <td>{modal.rows.filter(r=>r.dressed).length}</td>
                    <td>{sum(modal.rows,r=>r.goals||0)}</td><td>{sum(modal.rows,r=>r.assists||0)}</td><td>{sum(modal.rows,r=>(r.goals||0)+(r.assists||0))}</td>
                    <td>{sum(modal.rows,r=>r.plus||0)}</td><td>{sum(modal.rows,r=>r.minus||0)}</td><td>{pmf(sum(modal.rows,r=>(r.plus||0)-(r.minus||0)))}</td>
                    <td>{sum(modal.rows,r=>r.sogs||0)}</td>
                    <td>{(()=>{const g=sum(modal.rows,r=>r.goals||0);const sh=sum(modal.rows,r=>r.sogs||0);return sh>0?((g/sh)*100).toFixed(1)+'%':'0.0%';})()}</td>
                    <td>{sum(modal.rows,r=>r.pims||0)}</td>
                    <td>{sum(modal.rows,r=>r.ppg||0)}</td><td>{sum(modal.rows,r=>r.ppa||0)}</td><td>{sum(modal.rows,r=>(r.ppg||0)+(r.ppa||0))}</td>
                    <td>{sum(modal.rows,r=>r.shg||0)}</td><td>{sum(modal.rows,r=>r.sha||0)}</td><td>{sum(modal.rows,r=>(r.shg||0)+(r.sha||0))}</td>
                    <td>{sum(modal.rows,r=>r.gwg||0)}</td>
                  </tr>
                </tbody>
              </table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
