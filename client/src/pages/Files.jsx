import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function currentPathFromLocation(pathname) {
  const prefix = '/files';
  let p = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '/';
  if (!p) p = '/';
  try { p = decodeURIComponent(p); } catch { /* leave as-is if malformed */ }
  return p;
}

export default function Files() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPath = currentPathFromLocation(location.pathname);

  // Non-admin users may not have access to root ("/"). If they land there
  // without permission, redirect to their first allowed folder instead.
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    if (currentPath !== '/') return;
    const hasRoot = user.allowedPaths.includes('/');
    if (!hasRoot && user.allowedPaths.length > 0) {
      navigate(`/files${user.allowedPaths[0]}`, { replace: true });
    }
  }, [user, currentPath, navigate]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    // Skip fetching root for a non-admin without root access; a redirect to
    // their first allowed folder is about to happen.
    if (user && user.role !== 'admin' && currentPath === '/' && !user.allowedPaths.includes('/')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.listFiles(currentPath);
      const sorted = [...data.items].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setItems(sorted);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath, user]);

  useEffect(() => {
    load();
    setSelected(null);
  }, [load]);

  function goTo(name) {
    const next = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    navigate(`/files${next}`);
  }

  function goUp() {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigate(`/files/${parts.join('/')}`);
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      await api.upload(currentPath, files);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = '';
    }
  }

  async function handleMkdir() {
    const name = window.prompt('New folder name');
    if (!name) return;
    try {
      await api.mkdir(currentPath, name);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(item) {
    const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteEntry(itemPath);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(item) {
    const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
    const newName = window.prompt('New name', item.name);
    if (!newName || newName === item.name) return;
    try {
      await api.rename(itemPath, newName);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDownload(item) {
    const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
    window.open(api.downloadUrl(itemPath), '_blank');
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="files-page">
      <div className="toolbar">
        <div className="breadcrumbs">
          <button className="crumb" onClick={() => navigate('/files')}>Home</button>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx}>
              {' / '}
              <button
                className="crumb"
                onClick={() => navigate(`/files/${breadcrumbs.slice(0, idx + 1).join('/')}`)}
              >
                {crumb}
              </button>
            </span>
          ))}
        </div>
        <div className="actions">
          {currentPath !== '/' && <button onClick={goUp}>Up</button>}
          <button onClick={handleMkdir}>New folder</button>
          <button onClick={() => fileInputRef.current?.click()}>Upload</button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleUpload}
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="center-message">Loading…</div>
      ) : items.length === 0 ? (
        <div className="center-message">This folder is empty</div>
      ) : (
        <table className="file-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Modified</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.name}>
                <td>
                  {item.isDirectory ? (
                    <button className="entry-name folder" onClick={() => goTo(item.name)}>
                      📁 {item.name}
                    </button>
                  ) : (
                    <span className="entry-name">📄 {item.name}</span>
                  )}
                </td>
                <td>{item.isDirectory ? '—' : formatSize(item.size)}</td>
                <td>{item.modifiedAt ? new Date(item.modifiedAt).toLocaleString() : '—'}</td>
                <td className="row-actions">
                  {!item.isDirectory && <button onClick={() => handleDownload(item)}>Download</button>}
                  <button onClick={() => handleRename(item)}>Rename</button>
                  <button className="danger" onClick={() => handleDelete(item)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
