import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Login from './components/Login';
import TeamSelector from './components/TeamSelector';
import TeamDashboard from './components/TeamDashboard';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user's teams
        const teamsQuery = query(
          collection(db, 'teams'),
          where('coachId', '==', currentUser.uid)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teams = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserTeams(teams);
        
        // Set first team as selected if available
        if (teams.length > 0 && !selectedTeam) {
          setSelectedTeam(teams[0].id);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [selectedTeam]);

  const handleLogout = async () => {
    await signOut(auth);
    setSelectedTeam(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!selectedTeam || userTeams.length === 0) {
    return <TeamSelector user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🏒 Hockey Stats Tracker</h1>
          <div className="header-right">
            <select 
              value={selectedTeam} 
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="team-selector"
            >
              {userTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <span className="user-info">{user.email}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <TeamDashboard 
        teamId={selectedTeam} 
        teamName={userTeams.find(t => t.id === selectedTeam)?.name}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
