import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StatsEntry from './components/StatsEntry';
import StatisticsPage from './components/StatisticsPage';
import StatLeaders from './components/StatLeaders';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState('stats-entry');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().isAdmin);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('stats-entry');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🏒 Hockey Stats Tracker</h1>
          <div className="user-info">
            <span>{user.email}</span>
            {isAdmin && <span className="admin-badge">Admin</span>}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={currentPage === 'stats-entry' ? 'active' : ''} 
          onClick={() => setCurrentPage('stats-entry')}
        >
          Add Game Stats
        </button>
        <button 
          className={currentPage === 'statistics' ? 'active' : ''} 
          onClick={() => setCurrentPage('statistics')}
        >
          Statistics
        </button>
        <button 
          className={currentPage === 'leaders' ? 'active' : ''} 
          onClick={() => setCurrentPage('leaders')}
        >
          Stat Leaders
        </button>
        {isAdmin && (
          <button 
            className={currentPage === 'admin' ? 'active' : ''} 
            onClick={() => setCurrentPage('admin')}
          >
            Admin Dashboard
          </button>
        )}
      </nav>

      <main className="app-main">
        {currentPage === 'stats-entry' && <StatsEntry />}
        {currentPage === 'statistics' && <StatisticsPage />}
        {currentPage === 'leaders' && <StatLeaders />}
        {currentPage === 'admin' && isAdmin && <AdminDashboard />}
      </main>
    </div>
  );
}
