import { create } from 'zustand'
import { authAPI } from '../utils/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('inkwell_token'),

  login: async (email, password) => {
  const res = await authAPI.login({ email, password })
  const { token, user } = res.data
  localStorage.setItem('inkwell_token', token)
  set({ token, user })
  return user
  },
  register: async (data) => {
    const res = await authAPI.register(data)
    const { token, user } = res.data
    localStorage.setItem('inkwell_token', token)
    set({ token, user })
    return user
  },

  logout: () => {
    localStorage.removeItem('inkwell_token')
    set({ token: null, user: null })
    window.location.href = '/'
  },

  fetchMe: async () => {
    try {
      const res = await authAPI.me()
      set({ user: res.data.user })
    } catch {
      localStorage.removeItem('inkwell_token')
      set({ token: null, user: null })
    }
  },

  updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } }))
}))
