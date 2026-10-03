import Login from './pages/Login'
import Register from './pages/Register'
import SearchRooms from './pages/SearchRooms'
import ListingDetail from './pages/ListingDetail'
import LandlordRequests from './pages/LandlordRequests'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ComingSoon from './pages/ComingSoon'
import Buildings from './pages/Buildings'
import BuildingServices from './pages/BuildingServices'
import Rooms from './pages/Rooms'
import Services from './pages/Services'
import AuditLogs from './pages/AuditLogs'
import Admin from './pages/Admin'
import MyRequests from './pages/MyRequests'

/*
 * Trang 403
 */
function Forbidden() {
  return (
    <div className="forbidden-page">
      <div className="forbidden-decoration decoration-one"></div>
      <div className="forbidden-decoration decoration-two"></div>

      <div className="forbidden-content">
        <div className="forbidden-circle">
          <span>403</span>
          <div className="forbidden-lock">🔒</div>
        </div>

        <h1>Bạn không có quyền truy cập trang này</h1>

        <p>
          Tài khoản của bạn không được phép truy cập chức năng này.
        </p>

        <button
          onClick={() => {
            window.location.href = '/dashboard'
          }}
        >
          🏠 Quay về Tổng quan
        </button>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .forbidden-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background:
            linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eef2ff 100%);
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #172033;
        }

        .forbidden-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 760px;
          text-align: center;
        }

        .forbidden-circle {
          width: 270px;
          height: 270px;
          margin: 0 auto 38px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;
          border: 4px solid #8db4f8;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.98) 0%,
              rgba(239, 246, 255, 0.9) 70%,
              rgba(219, 234, 254, 0.7) 100%
            );

          box-shadow:
            0 0 0 18px rgba(147, 197, 253, 0.08),
            0 25px 60px rgba(37, 99, 235, 0.12);
        }

        .forbidden-circle::before {
          content: "";
          position: absolute;
          inset: 14px;
          border-radius: 50%;
          border: 1px dashed rgba(37, 99, 235, 0.25);
        }

        .forbidden-circle span {
          position: relative;
          z-index: 2;
          font-size: 88px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -5px;
          color: #315db5;
        }

        .forbidden-lock {
          position: absolute;
          right: 18px;
          bottom: 22px;
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: white;
          font-size: 28px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
          transform: rotate(8deg);
        }

        .forbidden-content h1 {
          margin: 0 0 12px;
          font-size: 30px;
          line-height: 1.25;
          font-weight: 800;
          color: #172033;
        }

        .forbidden-content p {
          margin: 0 auto 28px;
          max-width: 560px;
          color: #64748b;
          font-size: 16px;
          line-height: 1.6;
        }

        .forbidden-content button {
          border: none;
          border-radius: 12px;
          padding: 13px 24px;
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.22);
          transition: 0.2s ease;
        }

        .forbidden-content button:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.30);
        }

        .forbidden-decoration {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .decoration-one {
          width: 420px;
          height: 420px;
          top: -230px;
          left: -180px;
          background: rgba(96, 165, 250, 0.10);
        }

        .decoration-two {
          width: 500px;
          height: 500px;
          right: -250px;
          bottom: -280px;
          background: rgba(129, 140, 248, 0.10);
        }

        @media (max-width: 600px) {
          .forbidden-circle {
            width: 210px;
            height: 210px;
          }

          .forbidden-circle span {
            font-size: 65px;
          }

          .forbidden-content h1 {
            font-size: 23px;
          }

          .forbidden-content p {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}


/*
 * Kiểm tra quyền truy cập route theo role
 */
function hasRouteAccess(path: string, role: string | null) {
  if (!role) {
    return false
  }

  const permissions: Record<string, string[]> = {
    ADMIN: [
      '/dashboard',
      '/profile',
      '/tenants',
      '/contracts',
      '/audit-logs',
      '/admin',
    ],

    LANDLORD: [
      '/dashboard',
      '/profile',
      '/buildings',
      '/rooms',
      '/services',
      '/landlord/requests',
    ],

    MANAGER: [
      '/dashboard',
      '/profile',
      '/buildings',
      '/rooms',
      '/services',
    ],

    TENANT: [
      '/dashboard',
      '/profile',
      '/my-requests',
    ],
  }

  return permissions[role]?.includes(path) ?? false
}

/*
 * Route được bảo vệ + kiểm tra quyền
 */
function ProtectedRoute({
  path,
  children,
}: {
  path: string
  children: React.ReactNode
}) {
  const token = localStorage.getItem('accessToken')
  const role = localStorage.getItem('role')

  if (!token) {
    window.location.href = '/'
    return null
  }

  if (!hasRouteAccess(path, role)) {
    window.location.href = '/403'
    return null
  }

  return <>{children}</>
}

function App() {
  const path = window.location.pathname

  /*
   * Public routes
   */

  // S2-04: tìm kiếm phòng - không cần đăng nhập
  if (path === '/search-rooms') {
    return <SearchRooms />
  }

  // S2-05/S2-06: chi tiết tin và gửi yêu cầu
  if (path.startsWith('/listing/')) {
    return <ListingDetail />
  }

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
      <ProtectedRoute path={path}>
        <Dashboard />
      </ProtectedRoute>
    )
  }

  if (path === '/profile') {
    return (
      <ProtectedRoute path={path}>
        <Profile />
      </ProtectedRoute>
    )
  }

  if (path === '/buildings') {
    return (
      <ProtectedRoute path={path}>
        <Buildings />
      </ProtectedRoute>
    )
  }

  // S2-10: cấu hình điện nước cho từng toà nhà
  if (path.startsWith('/building-services/')) {
    return (
      <ProtectedRoute path="/buildings">
        <BuildingServices />
      </ProtectedRoute>
    )
  }

  if (path === '/rooms') {
    return (
      <ProtectedRoute path={path}>
        <Rooms />
      </ProtectedRoute>
    )
  }

  if (path === '/services') {
    return (
      <ProtectedRoute path={path}>
        <Services />
      </ProtectedRoute>
    )
  }

  if (path === '/audit-logs') {
    return (
      <ProtectedRoute path={path}>
        <AuditLogs />
      </ProtectedRoute>
    )
  }

  if (path === '/admin') {
    return (
      <ProtectedRoute path={path}>
        <Admin />
      </ProtectedRoute>
    )
  }
  if (path === '/landlord/requests') {
    return (
      <ProtectedRoute path={path}>
        <LandlordRequests />
      </ProtectedRoute>
    )
  }
  if (path === '/my-requests') {
    return (
      <ProtectedRoute path={path}>
        <MyRequests />
      </ProtectedRoute>
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
      <ProtectedRoute path={path}>
        <ComingSoon title={comingSoon[path]} />
      </ProtectedRoute>
    )
  }

  /*
   * Nếu đang đăng nhập nhưng URL không tồn tại
   * → đưa về Tổng quan
   */
  if (localStorage.getItem('accessToken')) {
    window.location.href = '/dashboard'
    return null
  }

  /*
   * Chưa đăng nhập → Login
   */
  return <Login />
}

export default App