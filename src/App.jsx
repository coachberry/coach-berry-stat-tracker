import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Login from './components/Login';
import TeamDashboard from './components/TeamDashboard';
import './App.css';

const SEASONS = ['2024-25','2025-26','2026-27','2027-28','2028-29','2029-30'];

// ── Create Team Modal ─────────────────────────────────────────────────────────
function CreateTeamModal({ userId, onCreated, onClose }) {
  const [teamName, setTeamName] = useState('');
  const [season,   setSeason]   = useState('2026-27');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        coachId: userId,
        season,
        primaryColor:   '#FF2400',
        secondaryColor: '#ffffff',
        createdAt: serverTimestamp(),
      });
      onCreated({ id: docRef.id, name: teamName.trim(), season, primaryColor: '#FF2400', secondaryColor: '#ffffff' });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
      onClick={onClose}>
      <div style={{ background:'#1a1a1a', border:'2px solid #FF2400', borderRadius:'10px', padding:'32px', maxWidth:'440px', width:'100%' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ color:'#FF2400', margin:'0 0 20px' }}>Create New Team</h2>
        {error && <div style={{ color:'#FF2400', marginBottom:'12px', fontSize:'13px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ color:'#fff', fontSize:'13px', fontWeight:600, display:'block', marginBottom:'6px' }}>Team Name *</label>
            <input type="text" placeholder="e.g., Nashville Jr. Predators" value={teamName}
              onChange={e => setTeamName(e.target.value)} required autoFocus
              style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'2px solid #333', background:'#0a0a0a', color:'#fff', fontSize:'14px', boxSizing:'border-box' }} />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label style={{ color:'#fff', fontSize:'13px', fontWeight:600, display:'block', marginBottom:'6px' }}>Season</label>
            <select value={season} onChange={e => setSeason(e.target.value)}
              style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'2px solid #333', background:'#0a0a0a', color:'#fff', fontSize:'14px' }}>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button type="submit" disabled={loading}
              style={{ flex:1, padding:'11px', background:'#FF2400', color:'#000', border:'none', borderRadius:'6px', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
              {loading ? 'Creating...' : 'Create Team'}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex:1, padding:'11px', background:'transparent', color:'#ccc', border:'2px solid #333', borderRadius:'6px', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Color Scheme Picker ───────────────────────────────────────────────────────
function ColorPicker({ team, onSave, onClose }) {
  const [primary,   setPrimary]   = useState(team.primaryColor   || '#FF2400');
  const [secondary, setSecondary] = useState(team.secondaryColor || '#ffffff');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
      onClick={onClose}>
      <div style={{ background:'#1a1a1a', border:'2px solid #FF2400', borderRadius:'10px', padding:'32px', maxWidth:'360px', width:'100%' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ color:'#FF2400', margin:'0 0 6px' }}>Team Colors</h2>
        <p style={{ color:'#777', fontSize:'13px', marginBottom:'20px' }}>{team.name}</p>

        <div style={{ marginBottom:'18px' }}>
          <label style={{ color:'#fff', fontSize:'13px', fontWeight:600, display:'block', marginBottom:'8px' }}>Primary Color</label>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <input type="color" value={primary} onChange={e => setPrimary(e.target.value)}
              style={{ width:'50px', height:'38px', border:'none', borderRadius:'6px', cursor:'pointer', background:'none' }} />
            <span style={{ color:'#aaa', fontSize:'13px', fontFamily:'monospace' }}>{primary}</span>
          </div>
        </div>

        <div style={{ marginBottom:'24px' }}>
          <label style={{ color:'#fff', fontSize:'13px', fontWeight:600, display:'block', marginBottom:'8px' }}>Secondary Color</label>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)}
              style={{ width:'50px', height:'38px', border:'none', borderRadius:'6px', cursor:'pointer', background:'none' }} />
            <span style={{ color:'#aaa', fontSize:'13px', fontFamily:'monospace' }}>{secondary}</span>
          </div>
        </div>

        {/* Preview */}
        <div style={{ background:'#0a0a0a', borderRadius:'8px', padding:'14px', marginBottom:'20px', borderLeft:`4px solid ${primary}` }}>
          <span style={{ color: primary, fontWeight:700, fontSize:'14px' }}>{team.name}</span>
          <span style={{ color: secondary, fontSize:'12px', marginLeft:'10px' }}>Preview</span>
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={() => onSave(primary, secondary)}
            style={{ flex:1, padding:'11px', background:'#FF2400', color:'#000', border:'none', borderRadius:'6px', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
            Save Colors
          </button>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', background:'transparent', color:'#ccc', border:'2px solid #333', borderRadius:'6px', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Homepage ──────────────────────────────────────────────────────────────────
function Homepage({ teams, user, onSelectTeam, onCreateTeam, onLogout }) {
  return (
    <div style={{ minHeight:'100vh', background:'#000', color:'#fff' }}>
      <header style={{ background:'#0a0a0a', borderBottom:'2px solid #FF2400', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ margin:0, fontSize:'24px' }}>🏒 Hockey Stats Tracker</h1>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ color:'#888', fontSize:'13px' }}>{user.email}</span>
          <button onClick={onLogout} style={{ padding:'8px 16px', background:'#FF2400', color:'#000', border:'none', borderRadius:'6px', fontWeight:700, cursor:'pointer' }}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
          <h2 style={{ margin:0, color:'#FF2400', fontSize:'22px' }}>Your Teams</h2>
          <button onClick={onCreateTeam}
            style={{ padding:'10px 20px', background:'#FF2400', color:'#000', border:'none', borderRadius:'6px', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
            + Create New Team
          </button>
        </div>

        {teams.length === 0 ? (
          <div style={{ textAlign:'center', color:'#666', padding:'60px 20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🏒</div>
            <p style={{ fontSize:'16px' }}>No teams yet. Create your first team to get started!</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'16px' }}>
            {teams.map(team => (
              <div key={team.id}
                onClick={() => onSelectTeam(team.id)}
                style={{
                  background:'#1a1a1a', border:`2px solid ${team.primaryColor || '#333'}`,
                  borderLeft:`6px solid ${team.primaryColor || '#FF2400'}`,
                  borderRadius:'10px', padding:'22px', cursor:'pointer',
                  transition:'all 0.2s', userSelect:'none',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px ${team.primaryColor || '#FF2400'}44`}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
              >
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>🏒</div>
                <div style={{ color: team.primaryColor || '#FF2400', fontWeight:700, fontSize:'17px', marginBottom:'4px' }}>{team.name}</div>
                <div style={{ color:'#666', fontSize:'12px' }}>{team.season || '—'}</div>
                <div style={{ marginTop:'14px', color: team.secondaryColor || '#ccc', fontSize:'12px', fontWeight:600 }}>
                  Click to open →
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [userTeams,     setUserTeams]     = useState([]);
  const [selectedTeam,  setSelectedTeam]  = useState(null); // team ID or null = homepage
  const [currentPage,   setCurrentPage]   = useState('roster');
  const [showCreate,    setShowCreate]    = useState(false);
  const [showColors,    setShowColors]    = useState(false);

  const fetchTeams = async (uid) => {
    const q = query(collection(db, 'teams'), where('coachId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const teams = await fetchTeams(u.uid);
        setUserTeams(teams);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserTeams([]);
    setSelectedTeam(null);
  };

  const handleTeamCreated = (newTeam) => {
    setUserTeams(prev => [...prev, newTeam]);
    setShowCreate(false);
    setSelectedTeam(newTeam.id);
    setCurrentPage('roster');
  };

  const handleSaveColors = async (primary, secondary) => {
    const { updateDoc, doc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'teams', selectedTeam), { primaryColor: primary, secondaryColor: secondary });
    setUserTeams(prev => prev.map(t => t.id === selectedTeam ? { ...t, primaryColor: primary, secondaryColor: secondary } : t));
    setShowColors(false);
  };

  const activeTeam = userTeams.find(t => t.id === selectedTeam);
  const primary    = activeTeam?.primaryColor   || '#FF2400';
  const secondary  = activeTeam?.secondaryColor || '#ffffff';

  if (loading) return <div className="loading">Loading...</div>;
  if (!user)   return <Login />;

  // ── Homepage (no team selected) ───────────────────────────────────────────
  if (!selectedTeam) {
    return (
      <>
        <Homepage
          teams={userTeams}
          user={user}
          onSelectTeam={(id) => { setSelectedTeam(id); setCurrentPage('roster'); }}
          onCreateTeam={() => setShowCreate(true)}
          onLogout={handleLogout}
        />
        {showCreate && (
          <CreateTeamModal userId={user.uid} onCreated={handleTeamCreated} onClose={() => setShowCreate(false)} />
        )}
      </>
    );
  }

  // ── Team dashboard view ───────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Apply team colors as CSS variables */}
      <style>{`:root { --team-primary: ${primary}; --team-secondary: ${secondary}; }`}</style>

      <header className="app-header">
        <div className="header-content">
          <button onClick={() => setSelectedTeam(null)}
            style={{ background:'none', border:'none', color: primary, fontSize:'22px', cursor:'pointer', padding:'0 8px 0 0', lineHeight:1 }}
            title="Back to teams">
            🏒
          </button>
          <h1 style={{ color: primary }}>Hockey Stats Tracker</h1>
          <div className="header-right">
            {/* Team dropdown with + Create option */}
            <select
              value={selectedTeam}
              onChange={(e) => {
                if (e.target.value === '__create__') {
                  setShowCreate(true);
                  e.target.value = selectedTeam; // reset visual
                } else {
                  setSelectedTeam(e.target.value);
                  setCurrentPage('roster');
                }
              }}
              className="team-selector"
              style={{ borderColor: primary }}
            >
              {userTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
              <option value="__create__">➕ Create New Team...</option>
            </select>

            {/* Color scheme button */}
            <button
              onClick={() => setShowColors(true)}
              title="Edit team colors"
              style={{
                padding:'6px 12px', background:'transparent',
                border:`2px solid ${primary}`, borderRadius:'6px',
                color: primary, cursor:'pointer', fontWeight:700, fontSize:'12px',
                whiteSpace:'nowrap',
              }}
            >
              🎨 Colors
            </button>

            <span className="user-info">{user.email}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <TeamDashboard
        teamId={selectedTeam}
        teamName={activeTeam?.name}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {showCreate && (
        <CreateTeamModal userId={user.uid} onCreated={handleTeamCreated} onClose={() => setShowCreate(false)} />
      )}

      {showColors && activeTeam && (
        <ColorPicker team={activeTeam} onSave={handleSaveColors} onClose={() => setShowColors(false)} />
      )}
    </div>
  );
}
