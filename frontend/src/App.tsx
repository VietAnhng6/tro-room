import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
function App() {
  const path = window.location.pathname

  if (path === '/register') {
    return <Register />
  }

  if (path === '/forgot-password') {
    return <ForgotPassword />
  }

  if (path === '/reset-password') {
    return <ResetPassword />
  }

  if (path === '/dashboard') {
    return <Dashboard />
  }
  if (path === '/profile') {
  return <Profile />
}
  return <Login />
}

export default App