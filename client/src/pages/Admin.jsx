import { useEffect, useState } from 'react';
import { api } from '../api/client';

function emptyForm() {
  return { username: '', password: '', role: 'user', allowedPaths: '' };
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const { users } = await api.listUsers();
      setUsers(users);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const allowedPaths =
        form.role === 'admin'
          ? ['/']
          : form.allowedPaths
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean);
      await api.createUser({
        username: form.username,
        password: form.password,
        role: form.role,
        allowedPaths,
      });
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await api.deleteUser(user.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdatePaths(user) {
    const current = user.allowed_paths.join(', ');
    const next = window.prompt('Allowed folders (comma-separated, e.g. /photos, /docs)', current);
    if (next === null) return;
    try {
      const allowedPaths = next
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      await api.updateUser(user.id, { allowedPaths });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResetPassword(user) {
    const newPassword = window.prompt(`New password for "${user.username}" (min 6 chars)`);
    if (!newPassword) return;
    try {
      await api.updateUser(user.id, { password: newPassword });
      alert('Password updated');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <h2>User management</h2>
      {error && <div className="error-banner">{error}</div>}

      <form className="create-user-form" onSubmit={handleCreate}>
        <h3>Add user</h3>
        <div className="form-row">
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {form.role === 'user' && (
            <label>
              Allowed folders (comma-separated)
              <input
                placeholder="/photos, /docs"
                value={form.allowedPaths}
                onChange={(e) => setForm({ ...form, allowedPaths: e.target.value })}
              />
            </label>
          )}
        </div>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>

      <table className="file-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Allowed folders</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.allowed_paths.join(', ') || '—'}</td>
              <td className="row-actions">
                {u.role !== 'admin' && <button onClick={() => handleUpdatePaths(u)}>Edit folders</button>}
                <button onClick={() => handleResetPassword(u)}>Reset password</button>
                <button className="danger" onClick={() => handleDelete(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
