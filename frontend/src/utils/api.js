import axios from 'axios'

// Production uses the same-origin API proxy configured in vercel.json.
// Keep local development URLs out of the deployed bundle.
const rawBase = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '')
const base = rawBase.replace(/\/+$/, '') + '/api/v1'

const api = axios.create({
  baseURL: base,
  withCredentials: true
})

api.interceptors.response.use(
  res => res,
  err => {
    const authEndpoint = /\/auth\/(login|register|me|logout)(?:\?|$)/.test(err.config?.url || '')
    if (err.response?.status === 401 && !authEndpoint) {
      window.dispatchEvent(new Event('inkwell:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
}

// Posts
export const postsAPI = {
  list: (params) => api.get('/posts', { params }),
  get: (slug, params) => api.get(`/posts/${slug}`, { params }),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  getResponses: (id) => api.get(`/posts/${id}/responses`),
  pollVote: (postId, blockId, optionIndex) => api.post(`/posts/${postId}/blocks/${blockId}/poll-vote`, { optionIndex }),
  quizAnswer: (postId, blockId, selectedIndex) => api.post(`/posts/${postId}/blocks/${blockId}/quiz-answer`, { selectedIndex })
}

// Comments
export const commentsAPI = {
  list: (postId, params) => api.get(`/comments/post/${postId}`, { params }),
  create: (postId, data) => api.post(`/comments/post/${postId}`, data),
  like: (id) => api.post(`/comments/${id}/like`),
  delete: (id) => api.delete(`/comments/${id}`)
}

// Topics
export const topicsAPI = {
  list: (params) => api.get('/topics', { params }),
  follow: (id) => api.post(`/topics/${id}/follow`)
}

// Search
export const searchAPI = {
  query: (q, params) => api.get('/search', { params: { q, ...params } })
}

// Users
export const usersAPI = {
  profile: (username) => api.get(`/users/${username}`),
  follow: (id) => api.post(`/users/${id}/follow`),
  bookmark: (postId) => api.post(`/users/bookmarks/${postId}`),
  bookmarks: () => api.get('/users/me/bookmarks')
}

// Feed
export const feedAPI = {
  get: (params) => api.get('/feed', { params })
}

// AI
export const aiAPI = {
  suggestTitles: (content) => api.post('/ai/suggest-titles', { content }),
  generateTags: (title, content) => api.post('/ai/generate-tags', { title, content }),
  eli5: (text) => api.post('/ai/eli5', { text }),
  generateSummaries: (postId) => api.post(`/ai/generate-summaries/${postId}`),
  writingAssist: (title, content) => api.post('/ai/writing-assist', { title, content }),
  rewrite: (text, mode) => api.post('/ai/rewrite', { text, mode })
}
