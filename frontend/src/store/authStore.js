import { create } from 'zustand'
import { authAPI } from '../utils/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('inkwell_token'),
  // New: Tracks if we are still validating the user session on reload
  isLoading: !!localStorage.getItem('inkwell_token'), 

  login: async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { token, user } = res.data
    localStorage.setItem('inkwell_token', token)
    set({ token, user, isLoading: false })
    return user
  },
  
  register: async (data) => {
    const res = await authAPI.register(data)
    const { token, user } = res.data
    localStorage.setItem('inkwell_token', token)
    set({ token, user, isLoading: false })
    return user
  },

  logout: () => {
    localStorage.removeItem('inkwell_token')
    set({ token: null, user: null, isLoading: false })
    window.location.href = '/'
  },

  fetchMe: async () => {
    // If no token exists, there's nothing to fetch
    if (!get().token) {
      set({ isLoading: false })
      return
    }
    
    try {
      set({ isLoading: true })
      const res = await authAPI.me()
      set({ user: res.data.user, isLoading: false })
    } catch {
      localStorage.removeItem('inkwell_token')
      set({ token: null, user: null, isLoading: false })
    }
  },

  updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } }))
}))