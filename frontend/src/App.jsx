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
import { Loader } from 'lucide-react' // Imported lucide icon

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/auth" replace />
  return children
}

function PublicRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { token, fetchMe, isLoading } = useAuthStore()



  // To this:
  useEffect(() => {
  if (token) {
    fetchMe()
  } else {
    // No token = no need to validate, exit loading immediately
    useAuthStore.setState({ isLoading: false })
  }
}, [token])

  // Handles the smooth loading view while validating the user's token
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'DM Sans, sans-serif',
        background: 'var(--surface1)',
        color: 'var(--ink)'
      }}>
        {/* Simple inline CSS keyframe animation injected to make the loader spin */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinning-loader {
            animation: spin 1s linear infinite;
          }
        `}</style>
        
        {/* Render the icon with a distinct size and spin styling */}
        <Loader className="spinning-loader" size={32} style={{ color: 'var(--ink)' }} />
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: 'var(--surface2)', color: 'var(--ink)', border: '0.5px solid var(--border2)' }
      }} />
      <Routes>
        <Route path="/auth" element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        } />
        
        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
          <Route path="/post/:slug" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />
          <Route path="/topic/:slug" element={<ProtectedRoute><TopicPage /></ProtectedRoute>} />
          <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/@:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/write" element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
          <Route path="/write/:id" element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
        </Route>
        
        <Route path="*" element={
          token ? <Navigate to="/" /> : <Navigate to="/auth" />
        } />
      </Routes>
    </>
  )
}