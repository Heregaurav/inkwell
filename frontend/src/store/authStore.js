import { create } from 'zustand'
import { authAPI } from '../utils/api'

const GUEST_MODE_KEY = 'inkwell_guest_mode'
localStorage.removeItem('inkwell_token')

export const useAuthStore = create((set, get) => ({
  user: null,
  guestMode: localStorage.getItem(GUEST_MODE_KEY) === 'true',
  isLoading: localStorage.getItem(GUEST_MODE_KEY) !== 'true',

  login: async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { user } = res.data
    localStorage.removeItem(GUEST_MODE_KEY)
    set({ user, guestMode: false, isLoading: false })
    return user
  },
  
  register: async (data) => {
    const res = await authAPI.register(data)
    const { user } = res.data
    localStorage.removeItem(GUEST_MODE_KEY)
    set({ user, guestMode: false, isLoading: false })
    return user
  },

  enterGuestMode: () => {
    localStorage.setItem(GUEST_MODE_KEY, 'true')
    set({ user: null, guestMode: true, isLoading: false })
    authAPI.logout().catch(() => {})
  },

  logout: async () => {
    try {
      await authAPI.logout()
    } catch {}
    localStorage.removeItem(GUEST_MODE_KEY)
    set({ user: null, guestMode: false, isLoading: false })
    window.location.href = '/auth'
  },

  fetchMe: async () => {
    if (get().guestMode) {
      set({ isLoading: false })
      return
    }
    
    try {
      set({ isLoading: true })
      const res = await authAPI.me()
      set({ user: res.data.user, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },

  updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } }))
}))