import { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        const userData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(userData);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newUserEmail || !newUserPassword) {
      setError('Please enter email and password');
      return;
    }

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      
      // Create Firestore document
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        email: newUserEmail,
        isAdmin: false,
        createdAt: new Date()
      });

      setUsers([...users, {
        id: userCredential.user.uid,
        email: newUserEmail,
        isAdmin: false,
        createdAt: new Date()
      }]);

      setMessage(`User ${newUserEmail} created successfully!`);
      setNewUserEmail('');
      setNewUserPassword('');

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isAdmin: true });
      setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: true } : u));
      setMessage('User promoted to admin');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleRemoveAdmin = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isAdmin: false });
      setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: false } : u));
      setMessage('User admin privileges removed');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
      setMessage('User deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="create-user-section">
        <h3>Create New User</h3>
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-create">Create User</button>
        </form>
      </div>

      <div className="users-section">
        <h3>All Users ({users.length})</h3>
        {users.length === 0 ? (
          <p>No users found</p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Admin</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.isAdmin ? '✓ Yes' : 'No'}</td>
                  <td>{user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                  <td className="actions">
                    {!user.isAdmin ? (
                      <button 
                        onClick={() => handleMakeAdmin(user.id)} 
                        className="btn-admin"
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleRemoveAdmin(user.id)} 
                        className="btn-remove-admin"
                      >
                        Remove Admin
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteUser(user.id)} 
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
