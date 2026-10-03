import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ComingSoon from './pages/ComingSoon'
import Buildings from './pages/Buildings'
import Rooms from './pages/Rooms'
import Services from './pages/Services'
import AuditLogs from './pages/AuditLogs'
import Admin from './pages/Admin'
import MyRequests from './pages/MyRequests'
import ListingDetail from './pages/ListingDetail'
function Forbidden() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff, #f8fafc, #eef2ff)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 36,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(15,23,42,.10)',
      }}>
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto 18px',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fef2f2',
          color: '#dc2626',
          fontSize: 28,
          fontWeight: 800,
        }}>
          403
        </div>

        <h1 style={{
          margin: '0 0 8px',
          color: '#0f172a',
          fontSize: 25,
        }}>
          Không có quyền truy cập
        </h1>

        <p style={{
          margin: '0 0 24px',
          color: '#64748b',
          lineHeight: 1.6,
        }}>
          Tài khoản của bạn không được phép truy cập chức năng này.
        </p>

        <button
          onClick={() => {
            window.location.href = '/dashboard'
          }}
          style={{
            border: 0,
            borderRadius: 10,
            padding: '12px 20px',
            background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ← Về Dashboard
        </button>
      </div>
    </div>
  )
}

function Protected({
  children,
}: {
  children: React.ReactNode
}) {
  const token = localStorage.getItem('accessToken')

  if (!token) {
    window.location.href = '/'
    return null
  }

  return <>{children}</>
}

function App() {
  const path = window.location.pathname

  /*
   * Public routes
   */
  if (path === '/register') {
    return <Register />
  }

  if (path === '/forgot-password') {
    return <ForgotPassword />
  }

  if (path === '/reset-password') {
    return <ResetPassword />
  }

  if (path === '/403') {
    return <Forbidden />
  }

  /*
   * Protected routes
   */
  if (path === '/dashboard') {
    return (
      <Protected>
        <Dashboard />
      </Protected>
    )
  }

  if (path === '/profile') {
    return (
      <Protected>
        <Profile />
      </Protected>
    )
  }

  /*
   * S1-07 - Quản lý tòa nhà
   */
  if (path === '/buildings') {
    return (
      <Protected>
        <Buildings />
      </Protected>
    )
  }
  if (path === '/rooms') {
  return (
    <Protected>
      <Rooms />
    </Protected>
  )
}
if (path === '/services') {
  return (
    <Protected>
      <Services />
    </Protected>
  )
}
if (path === '/audit-logs') {
  return (
    <Protected>
      <AuditLogs />
    </Protected>
  )
}
if (path === '/admin') {
  return (
    <Protected>
      <Admin />
    </Protected>
  )
}

  /*
   * S2-09 - Yêu cầu thuê của khách
   */
if (path === '/my-requests') {
  return (
    <Protected>
      <MyRequests />
    </Protected>
  )
}
if (path === '/listing') {
  return (
    <Protected>
      <ListingDetail />
    </Protected>
  )
}

  /*
   * Các chức năng chưa triển khai
   */
  const comingSoon: Record<string, string> = {
    '/tenants': 'Người thuê',
    '/contracts': 'Hợp đồng',
  }

  if (comingSoon[path]) {
    return (
      <Protected>
        <ComingSoon title={comingSoon[path]} />
      </Protected>
    )
  }

  /*
   * Mặc định → Login
   */
  return <Login />
}

export default App