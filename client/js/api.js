// REST API 封装：统一错误提示，并按资源提供便捷方法

async function request(method, path, body) {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
    return data;
  } catch (err) {
    toast(err.message || '网络请求失败', 'error');
    throw err;
  }
}

export const API = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  del: (path) => request('DELETE', path),
};

export const MembersAPI = {
  list: () => API.get('/members'),
  get: (id) => API.get(`/members/${id}`),
  create: (body) => API.post('/members', body),
  update: (id, body) => API.put(`/members/${id}`, body),
  remove: (id) => API.del(`/members/${id}`),
};

export const ChoresAPI = {
  list: (query = '') => API.get(`/chores${query}`),
  get: (id) => API.get(`/chores/${id}`),
  create: (body) => API.post('/chores', body),
  update: (id, body) => API.put(`/chores/${id}`, body),
  remove: (id) => API.del(`/chores/${id}`),
  complete: (id, body = {}) => API.post(`/chores/${id}/complete`, body),
  reopen: (id) => API.post(`/chores/${id}/reopen`),
};

export const PointsAPI = {
  leaderboard: () => API.get('/points/leaderboard'),
  adjust: (body) => API.post('/points/adjust', body),
};

export const LogsAPI = {
  list: (query = '') => API.get(`/logs${query}`),
};

export const StatsAPI = {
  get: () => API.get('/stats'),
};
