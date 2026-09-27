import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { GameDetail } from './GameDisplay-v2';
import './DisplayViews.css';

const StatCard = ({ label, value, highlight, color }) => (
  <div style={{ background:'#0a0a0a', border:`1px solid ${highlight?'rgba(255,36,0,0.4)':'#2a2a2a'}`, borderRadius:'8px', padding:'12px 8px', textAlign:'center', flex:'1 1 70px', minWidth:'65px' }}>
    <div style={{ color:color||(highlight?'#FF2400':'#ffffff'), fontSize:'18px', fontWeight:700, lineHeight:1 }}>{value}</div>
    <div style={{ color:'#666', fontSize:'10px', fontWeight:600, marginTop:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
  </div>
);
const Row = ({ children }) => <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'8px' }}>{children}</div>;

export default function TeamStats({ teamId, teamName }) {
  const [rows,         setRows]         = useState([]);
  const [gameStatsMap, setGameStatsMap] = useState({});
  const [modalGame,    setModalGame]    = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(()=>{
    const load=async()=>{
      try{
        const [gSnap,psSnap]=await Promise.all([
          getDocs(query(collection(db,'games'),           where('teamId','==',teamId))),
          getDocs(query(collection(db,'playerGameStats'), where('teamId','==',teamId))),
        ]);
        const games=gSnap.docs.map(d=>({id:d.id,...d.data()}));
        const allStats=psSnap.docs.map(d=>d.data());
        const byGame={};
        allStats.forEach(s=>{if(!byGame[s.gameId])byGame[s.gameId]=[];byGame[s.gameId].push(s);});

        const enriched=games.map(game=>{
          const stats=byGame[game.id]||[];
          const sk=stats.filter(s=>s.position!=='G');
          const go=stats.filter(s=>s.position==='G');
          const GF  =sk.reduce((n,s)=>n+(s.goals       ||0),0);
          const GA  =go.reduce((n,g)=>n+(g.goalsAgainst||0),0);
          const SOGs=sk.reduce((n,s)=>n+(s.sogs        ||0),0);
          const PIMs=stats.reduce((n,s)=>n+(s.pims     ||0),0);
          const PPG =sk.reduce((n,s)=>n+(s.ppg         ||0),0);
          const r=game.teamResult||'';
          return{...game,GF,GA,GD:GF-GA,SOGs,PIMs,PPG,
            PP:game.powerPlays||0, PK:game.penaltyKills||0, SPK:game.successfulPKs||0,
            W:r==='W'?1:0,L:r==='L'?1:0,T:r==='T'?1:0,
            OTW:r==='OTW'?1:0,OTL:r==='OTL'?1:0,SOW:r==='SOW'?1:0,SOL:r==='SOL'?1:0,
          };
        }).sort((a,b)=>new Date(b.gameDate)-new Date(a.gameDate));

        setRows(enriched); setGameStatsMap(byGame);
      }catch(e){console.error(e);}finally{setLoading(false);}
    };
    load();
  },[teamId]);

  const fmt=(ds)=>{if(!ds)return'N/A';const[y,m,d]=ds.split('-');return`${m}-${d}-${y}`;};
  const opp=(g)=>`${g.homeAway==='Home'?'vs.':'@'} ${g.opponent}`;
  const sum=(fn)=>rows.reduce((n,r)=>n+fn(r),0);

  if(loading)return<div className="loading">Loading team stats...</div>;

  const GP      =rows.length;
  const tGF     =sum(r=>r.GF); const tGA=sum(r=>r.GA); const tGD=sum(r=>r.GD);
  const tSOG    =sum(r=>r.SOGs);
  const tSPct   =tSOG>0?((tGF/tSOG)*100).toFixed(1):'0.0';
  const tPP     =sum(r=>r.PP);  const tPPG=sum(r=>r.PPG);
  const tPK     =sum(r=>r.PK);  const tSPK=sum(r=>r.SPK);
  const tPPPct  =tPP>0?((tPPG/tPP)*100).toFixed(1):'0.0';
  const tPKPct  =tPK>0?((tSPK/tPK)*100).toFixed(1):'0.0';

  return(
    <div className="display-view">
      <h2>Team Statistics</h2>
      {rows.length===0?<div className="no-data">No games recorded yet.</div>:(
        <>
          {/* Summary panel */}
          <div style={{background:'#0a0a0a',border:'1px solid #333',borderRadius:'10px',padding:'20px',marginBottom:'28px'}}>
            <div style={{color:'#FF2400',fontWeight:700,fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'14px'}}>
              {teamName||'Team'} · Season Summary
            </div>
            <Row>
              <StatCard label="GP"  value={GP} />
              <StatCard label="W"   value={sum(r=>r.W)}   highlight />
              <StatCard label="T"   value={sum(r=>r.T)} />
              <StatCard label="L"   value={sum(r=>r.L)} />
            </Row>
            <Row>
              <StatCard label="OTW" value={sum(r=>r.OTW)} highlight />
              <StatCard label="OTL" value={sum(r=>r.OTL)} />
              <StatCard label="SOW" value={sum(r=>r.SOW)} highlight />
              <StatCard label="SOL" value={sum(r=>r.SOL)} />
            </Row>
            <Row>
              <StatCard label="GF"  value={tGF} />
              <StatCard label="GA"  value={tGA} />
              <StatCard label="GD"  value={tGD>0?`+${tGD}`:tGD} highlight={tGD>=0} color={tGD>=0?'#4caf50':'#FF2400'} />
            </Row>
            <Row>
              <StatCard label="SOGs" value={tSOG} />
              <StatCard label="S%"   value={`${tSPct}%`} />
              <StatCard label="PIMs" value={sum(r=>r.PIMs)} />
            </Row>
            <Row>
              <StatCard label="PPG"  value={tPPG} />
              <StatCard label="PP"   value={tPP} />
              <StatCard label="PP%"  value={`${tPPPct}%`} highlight />
              <StatCard label="PK"   value={tPK} />
              <StatCard label="PK%"  value={`${tPKPct}%`} highlight />
            </Row>
          </div>

          <h3 style={{color:'#FF2400',marginBottom:'6px'}}>Team Statistics by Game</h3>
          <p style={{color:'#555',fontSize:'11px',marginBottom:'12px'}}>Click any game row to view full game details.</p>
          <div className="table-wrapper">
            <table className="stats-table">
              <thead><tr>
                <th>Date</th><th>Opponent</th><th>Type</th><th>Result</th><th>Score</th>
                <th>W</th><th>T</th><th>L</th><th>OTW</th><th>OTL</th><th>SOW</th><th>SOL</th>
                <th>GF</th><th>GA</th><th>GD</th><th>SOGs</th><th>S%</th><th>PIMs</th>
                <th>PPG</th><th>PP</th><th>PP%</th><th>PK</th><th>PK%</th>
              </tr></thead>
              <tbody>
                {rows.map(game=>{
                  const sPct=game.SOGs>0?((game.GF/game.SOGs)*100).toFixed(1):'0.0';
                  const gdS=game.GD>0?`+${game.GD}`:`${game.GD}`;
                  const ppPct=game.PP>0?((game.PPG/game.PP)*100).toFixed(1):'0.0';
                  const pkPct=game.PK>0?((game.SPK/game.PK)*100).toFixed(1):'0.0';
                  return(
                    <tr key={game.id} onClick={()=>setModalGame(game)} style={{cursor:'pointer'}} title="Click to view game details">
                      <td style={{whiteSpace:'nowrap'}}>{fmt(game.gameDate)}</td>
                      <td style={{whiteSpace:'nowrap'}}>{opp(game)}</td>
                      <td>{game.gameType}</td>
                      <td style={{color:'#FF2400',fontWeight:700}}>{game.teamResult}</td>
                      <td style={{color:'#FF2400',fontWeight:700,whiteSpace:'nowrap'}}>{game.GF}-{game.GA}</td>
                      <td>{game.W}</td><td>{game.T}</td><td>{game.L}</td>
                      <td>{game.OTW}</td><td>{game.OTL}</td><td>{game.SOW}</td><td>{game.SOL}</td>
                      <td>{game.GF}</td><td>{game.GA}</td>
                      <td style={{color:game.GD>=0?'#4caf50':'#FF2400'}}>{gdS}</td>
                      <td>{game.SOGs}</td><td>{sPct}%</td><td>{game.PIMs}</td>
                      <td>{game.PPG}</td><td>{game.PP}</td><td>{ppPct}%</td>
                      <td>{game.PK}</td><td>{pkPct}%</td>
                    </tr>
                  );
                })}
                <tr className="totals-row">
                  <td colSpan="3">TOTALS ({GP} GP)</td><td>—</td>
                  <td style={{whiteSpace:'nowrap'}}>{tGF}-{sum(r=>r.GA)}</td>
                  <td>{sum(r=>r.W)}</td><td>{sum(r=>r.T)}</td><td>{sum(r=>r.L)}</td>
                  <td>{sum(r=>r.OTW)}</td><td>{sum(r=>r.OTL)}</td><td>{sum(r=>r.SOW)}</td><td>{sum(r=>r.SOL)}</td>
                  <td>{tGF}</td><td>{sum(r=>r.GA)}</td>
                  <td style={{color:tGD>=0?'#4caf50':'#FF2400'}}>{tGD>0?`+${tGD}`:tGD}</td>
                  <td>{tSOG}</td><td>{tSPct}%</td><td>{sum(r=>r.PIMs)}</td>
                  <td>{tPPG}</td><td>{tPP}</td><td>{tPPPct}%</td>
                  <td>{tPK}</td><td>{tPKPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalGame&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px',overflowY:'auto'}}
          onClick={()=>setModalGame(null)}>
          <div style={{background:'#1a1a1a',border:'2px solid #FF2400',borderRadius:'10px',padding:'28px',maxWidth:'1100px',width:'100%',marginTop:'20px',marginBottom:'20px'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'16px'}}>
              <button onClick={()=>setModalGame(null)} style={{background:'transparent',border:'2px solid #555',color:'#ccc',borderRadius:'6px',padding:'6px 16px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>✕ Close</button>
            </div>
            <GameDetail game={modalGame} allStats={gameStatsMap[modalGame.id]||[]} teamName={teamName} onBack={null} />
          </div>
        </div>
      )}
    </div>
  );
}
