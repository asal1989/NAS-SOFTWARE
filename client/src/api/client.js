const API_BASE =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

function getToken() {
  return localStorage.getItem('nas_token');
}

async function request(path, { method = 'GET', body, isForm = false, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (raw) return res;

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  API_BASE,
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/api/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  listFiles: (path) => request(`/api/files/list?path=${encodeURIComponent(path)}`),
  mkdir: (path, name) => request('/api/files/mkdir', { method: 'POST', body: { path, name } }),
  deleteEntry: (path) => request(`/api/files/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  rename: (path, newName) => request('/api/files/rename', { method: 'POST', body: { path, newName } }),
  move: (path, newPath) => request('/api/files/move', { method: 'POST', body: { path, newPath } }),
  downloadUrl: (path) => `${API_BASE}/api/files/download?path=${encodeURIComponent(path)}&token=${getToken()}`,
  upload: async (path, files, onProgress) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    return request(`/api/files/upload?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      body: form,
      isForm: true,
    });
  },

  listUsers: () => request('/api/admin/users'),
  createUser: (payload) => request('/api/admin/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => request(`/api/admin/users/${id}`, { method: 'PUT', body: payload }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
};
