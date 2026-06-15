import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'
import Layout from './components/ui/Layout'
import HomePage from './pages/HomePage'
import PostPage from './pages/PostPage'
import WritePage from './pages/WritePage'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'
import TopicPage from './pages/TopicPage'
import BookmarksPage from './pages/BookmarksPage'
import ExplorePage from './pages/ExplorePage'

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/auth" replace />
  return children
}

// New: Public route wrapper - redirects to home if already logged in
function PublicRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: 'var(--surface2)', color: 'var(--ink)', border: '0.5px solid var(--border2)' }
      }} />
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        } />
        
        {/* Protected routes (require authentication) */}
        <Route element={<Layout />}>
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/explore" element={
            <ProtectedRoute>
              <ExplorePage />
            </ProtectedRoute>
          } />
          <Route path="/post/:slug" element={
            <ProtectedRoute>
              <PostPage />
            </ProtectedRoute>
          } />
          <Route path="/topic/:slug" element={
            <ProtectedRoute>
              <TopicPage />
            </ProtectedRoute>
          } />
          <Route path="/profile/:username" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/@:username" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/write" element={
            <ProtectedRoute>
              <WritePage />
            </ProtectedRoute>
          } />
          <Route path="/write/:id" element={
            <ProtectedRoute>
              <WritePage />
            </ProtectedRoute>
          } />
          <Route path="/bookmarks" element={
            <ProtectedRoute>
              <BookmarksPage />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Catch all - redirect to auth if not logged in, home if logged in */}
        <Route path="*" element={
          token ? <Navigate to="/" /> : <Navigate to="/auth" />
        } />
      </Routes>
    </>
  )
}