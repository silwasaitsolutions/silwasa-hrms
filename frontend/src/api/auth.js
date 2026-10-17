import client from './client.js';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data.data);

export const logout = (refreshToken) =>
  client.post('/auth/logout', { refreshToken }).then((r) => r.data);

export const getMe = () => client.get('/auth/me').then((r) => r.data.data);

export const changePassword = (payload) =>
  client.post('/auth/change-password', payload).then((r) => r.data);
