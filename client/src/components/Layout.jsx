import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleChangePassword() {
    const current = window.prompt('Current password');
    if (!current) return;
    const next = window.prompt('New password (min 6 characters)');
    if (!next) return;
    try {
      await api.changePassword(current, next);
      alert('Password changed.');
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">My NAS</Link>
        <nav>
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <button className="link-button" onClick={handleChangePassword}>{user?.username}</button>
          <button className="link-button" onClick={handleLogout}>Log out</button>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
