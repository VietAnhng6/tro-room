import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import SearchRooms from './pages/SearchRooms'
import ListingDetail from './pages/ListingDetail'
import LandlordRequests from './pages/LandlordRequests'
import MyRequests from './pages/MyRequests'
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

/*
 * Trang 403 Forbidden
 */
function Forbidden() {
  return (
    <div className="forbidden-page">
      <div className="forbidden-decoration decoration-one"></div>
      <div className="forbidden-decoration decoration-two"></div>

      <div className="forbidden-content">
        <div className="forbidden-circle">
          <span>403</span>
        </div>

        <h1>Bạn không có quyền truy cập trang này</h1>

        <p>Tài khoản của bạn không được phân quyền để truy cập chức năng này.</p>

        <button
          onClick={() => {
            window.location.href = '/dashboard'
          }}
        >
          Quay về Tổng quan
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
          fontSize: 16px;
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
      '/landlord/requests',
    ],
    TENANT: [
      '/dashboard',
      '/profile',
      '/my-requests',
      '/search-rooms',
    ],
  }

  // Base path matching
  const allowed = permissions[role] || []
  return allowed.some((p) => path === p || path.startsWith(p + '/'))
}

/*
 * Route được bảo vệ + kiểm tra quyền (yêu cầu đăng nhập)
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
    return <Navigate to="/login" replace />
  }

  if (!hasRouteAccess(path, role)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}

/*
 * Route đăng nhập / đăng ký: nếu đã đăng nhập thì chuyển vào /dashboard
 */
function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken')
  if (token) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      {/* AUTHENTICATION ROUTES (Standalone pages without sidebar) */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <Login />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <Register />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicAuthRoute>
            <ForgotPassword />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicAuthRoute>
            <ResetPassword />
          </PublicAuthRoute>
        }
      />

      <Route path="/403" element={<Forbidden />} />

      {/* ALL MAIN ROUTES WRAPPED BY MAINLAYOUT (Retains Sidebar on left) */}
      <Route element={<MainLayout />}>
        {/* Public Room Browsing Routes */}
        <Route path="/" element={<SearchRooms />} />
        <Route path="/search-rooms" element={<SearchRooms />} />
        <Route path="/listing/:id" element={<ListingDetail />} />

        {/* Protected System Pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute path="/dashboard">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buildings"
          element={
            <ProtectedRoute path="/buildings">
              <Buildings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/building-services/:buildingId"
          element={
            <ProtectedRoute path="/buildings">
              <BuildingServices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <ProtectedRoute path="/rooms">
              <Rooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute path="/services">
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/landlord/requests"
          element={
            <ProtectedRoute path="/landlord/requests">
              <LandlordRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-requests"
          element={
            <ProtectedRoute path="/my-requests">
              <MyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute path="/tenants">
              <ComingSoon title="Danh sách người thuê" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute path="/contracts">
              <ComingSoon title="Quản lý hợp đồng" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute path="/profile">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute path="/audit-logs">
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute path="/admin">
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App