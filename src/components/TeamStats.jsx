import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './DisplayViews.css';

export default function TeamStats({ teamId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [teamId]);

  if (loading) return <div className="loading">Loading team stats...</div>;

  return (
    <div className="display-view">
      <h2>Team Statistics by Game</h2>
      {games.length === 0 ? (
        <div className="no-data">No games recorded yet.</div>
      ) : (
        <div className="table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Type</th>
                <th>Location</th>
                <th>Result</th>
                <th>H/A</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.id}>
                  <td>{game.gameDate}</td>
                  <td className="opponent">{game.opponent}</td>
                  <td className="game-type">{game.gameType}</td>
                  <td>{game.location}</td>
                  <td className="result">{game.teamResult}</td>
                  <td>{game.homeAway === 'Home' ? 'H' : 'A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
