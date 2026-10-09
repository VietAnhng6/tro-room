import React, { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BannerCarousel from '../components/BannerCarousel'

type Role = 'ADMIN' | 'LANDLORD' | 'MANAGER' | 'TENANT' | string

function roleLabel(role: Role, hasToken: boolean) {
  if (!hasToken) return 'Khách vãng lai'
  const labels: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    LANDLORD: 'Chủ nhà',
    MANAGER: 'Quản lý',
    TENANT: 'Khách thuê',
  }
  return labels[role] || role
}

const PAGE_TITLES: Record<string, { title: string; category: string }> = {
  '/': { title: 'Tìm kiếm phòng trọ', category: 'Khám phá' },
  '/search-rooms': { title: 'Tìm kiếm phòng trọ', category: 'Khám phá' },
  '/dashboard': { title: 'Tổng quan', category: 'Hệ thống' },
  '/buildings': { title: 'Quản lý tòa nhà', category: 'Quản lý' },
  '/rooms': { title: 'Quản lý phòng', category: 'Quản lý' },
  '/services': { title: 'Dịch vụ tòa nhà', category: 'Cấu hình' },
  '/invoices': { title: 'Hoá đơn tháng', category: 'Tài chính' },
  '/landlord/requests': { title: 'Yêu cầu thuê & Xem phòng', category: 'Xử lý' },
  '/my-requests': { title: 'Yêu cầu thuê của tôi', category: 'Khách thuê' },
  '/tenants': { title: 'Danh sách người thuê', category: 'Quản lý' },
  '/contracts': { title: 'Quản lý hợp đồng', category: 'Quản lý' },
  '/profile': { title: 'Hồ sơ cá nhân & CCCD', category: 'Tài khoản' },
  '/audit-logs': { title: 'Nhật ký hệ thống', category: 'Bảo mật' },
  '/admin': { title: 'Quản trị tài khoản', category: 'Hệ thống' },
}

export const MainLayout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [hasToken, setHasToken] = useState(false)
  const [role, setRole] = useState<Role>('TENANT')
  const [username, setUsername] = useState('')
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const r = localStorage.getItem('role') || 'TENANT'
    const u = localStorage.getItem('username') || ''
    setHasToken(Boolean(token))
    setRole(r)
    setUsername(u)

    // Load pending requests count for landlord
    if (token && r === 'LANDLORD') {
      fetch('http://localhost:8080/api/landlord/requests/pending-count', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.count === 'number') {
            setPendingRequests(data.count)
          }
        })
        .catch(() => {})
    }
  }, [location.pathname])

  const permissions = useMemo(() => {
    if (!hasToken) {
      return {
        dashboard: false,
        building: false,
        room: false,
        tenant: false,
        contract: false,
        service: false,
        invoice: false,
        profile: false,
        audit: false,
        admin: false,
        landlordRequests: false,
        myRequests: false,
        searchRooms: true,
      }
    }

    if (role === 'ADMIN') {
      return {
        dashboard: true,
        building: false,
        room: false,
        tenant: true,
        contract: true,
        service: false,
        invoice: false,
        profile: true,
        audit: true,
        admin: true,
        landlordRequests: false,
        myRequests: false,
        searchRooms: true,
      }
    }

    if (role === 'LANDLORD') {
      return {
        dashboard: true,
        building: true,
        room: true,
        tenant: false,
        contract: false,
        service: true,
        invoice: true,
        profile: true,
        audit: false,
        admin: false,
        landlordRequests: true,
        myRequests: false,
        searchRooms: true,
      }
    }

    if (role === 'MANAGER') {
      return {
        dashboard: true,
        building: true,
        room: true,
        tenant: false,
        contract: false,
        service: true,
        invoice: true,
        profile: true,
        audit: false,
        admin: false,
        landlordRequests: true,
        myRequests: false,
        searchRooms: true,
      }
    }

    // TENANT
    return {
      dashboard: true,
      building: false,
      room: false,
      tenant: false,
      contract: false,
      service: false,
      invoice: false,
      profile: true,
      audit: false,
      admin: false,
      landlordRequests: false,
      myRequests: true,
      searchRooms: true,
    }
  }, [role, hasToken])

  const menuItems = [
    {
      key: 'dashboard',
      title: 'Tổng quan',
      enabled: permissions.dashboard,
      path: '/dashboard',
    },
    {
      key: 'searchRooms',
      title: 'Tìm phòng trọ',
      enabled: permissions.searchRooms,
      path: '/search-rooms',
    },
    {
      key: 'myRequests',
      title: 'Yêu cầu của tôi',
      enabled: permissions.myRequests,
      path: '/my-requests',
    },
    {
      key: 'building',
      title: 'Quản lý tòa nhà',
      enabled: permissions.building,
      path: '/buildings',
    },
    {
      key: 'room',
      title: 'Quản lý phòng',
      enabled: permissions.room,
      path: '/rooms',
    },
    {
      key: 'request',
      title: 'Yêu cầu thuê',
      enabled: permissions.landlordRequests,
      path: '/landlord/requests',
      badge: pendingRequests,
    },
    {
      key: 'service',
      title: 'Dịch vụ tòa nhà',
      enabled: permissions.service,
      path: '/services',
    },
    {
      key: 'invoice',
      title: 'Hoá đơn tháng',
      enabled: permissions.invoice,
      path: '/invoices',
    },
    {
      key: 'tenant',
      title: 'Người thuê',
      enabled: permissions.tenant,
      path: '/tenants',
    },
    {
      key: 'contract',
      title: 'Hợp đồng',
      enabled: permissions.contract,
      path: '/contracts',
    },
    {
      key: 'profile',
      title: 'Hồ sơ cá nhân',
      enabled: permissions.profile,
      path: '/profile',
    },
    {
      key: 'audit',
      title: 'Nhật ký hệ thống',
      enabled: permissions.audit,
      path: '/audit-logs',
    },
    {
      key: 'admin',
      title: 'Quản trị tài khoản',
      enabled: permissions.admin,
      path: '/admin',
    },
  ]

  const handleLogout = () => {
    const token = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (token && refreshToken) {
      fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('role')
    localStorage.removeItem('username')

    setHasToken(false)
    navigate('/login')
  }

  const currentPath = location.pathname
  let pageMeta = PAGE_TITLES[currentPath]
  if (!pageMeta) {
    if (currentPath.startsWith('/listing/')) {
      pageMeta = { title: 'Chi tiết phòng trọ', category: 'Khám phá' }
    } else {
      pageMeta = { title: 'TroRoom', category: 'Quản lý' }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* ================= SIDEBAR (CỐ ĐỊNH BÊN TRÁI) ================= */}
      <aside
        style={{
          width: 250,
          height: '100vh',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxSizing: 'border-box',
          zIndex: 30,
        }}
      >
        {/* LOGO BRAND */}
        <div
          onClick={() => navigate(hasToken ? '/dashboard' : '/')}
          style={{
            height: 74,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            TR
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', letterSpacing: '-0.3px' }}>
              TroRoom
            </div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 1, fontWeight: 500 }}>
              Hệ thống quản lý
            </div>
          </div>
        </div>

        {/* MENU ITEMS */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 750,
              color: '#94a3b8',
              letterSpacing: '0.6px',
              margin: '0 12px 10px',
              textTransform: 'uppercase',
            }}
          >
            Chức năng
          </div>

          {menuItems
            .filter((item) => item.enabled)
            .map((item) => {
              const active =
                (item.path === '/search-rooms' && (currentPath === '/' || currentPath === '/search-rooms' || currentPath.startsWith('/listing/'))) ||
                (item.path === '/dashboard' && currentPath === '/dashboard') ||
                (item.path !== '/dashboard' && item.path !== '/search-rooms' && currentPath.startsWith(item.path))

              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  style={{
                    width: '100%',
                    height: 42,
                    border: 'none',
                    borderRadius: 8,
                    padding: '0 14px',
                    marginBottom: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : '#475569',
                    fontWeight: active ? 750 : 550,
                    fontSize: 13.5,
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#f1f5f9'
                      e.currentTarget.style.color = '#1e293b'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#475569'
                    }
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>

                  {item.badge && item.badge > 0 ? (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 9,
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
        </nav>

        {/* USER PROFILE & LOGOUT OR LOGIN BUTTONS */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '14px 14px',
            background: '#ffffff',
          }}
        >
          {hasToken ? (
            <>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ minWidth: 0, flex: 1, marginRight: 6 }}>
                  <div
                    style={{
                      color: '#1e293b',
                      fontSize: 13,
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {username || 'Tài khoản'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>
                    {roleLabel(role, true)}
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 7px',
                    borderRadius: 4,
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: '1px solid #bfdbfe',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  height: 36,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#dc2626',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2'
                  e.currentTarget.style.borderColor = '#fecaca'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  width: '100%',
                  height: 38,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  width: '100%',
                  height: 36,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                Đăng ký tài khoản
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ================= RIGHT MAIN AREA (TOPBAR + CONTENT) ================= */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* TOPBAR / HEADER */}
        <header
          style={{
            height: 74,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            flexShrink: 0,
            zIndex: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>
              TroRoom / {pageMeta.category}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              {pageMeta.title}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f8fafc',
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                }}
              />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                Hệ thống ổn định
              </span>
            </div>

            {hasToken ? (
              <div
                onClick={() => navigate('/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                  {username || 'Hồ sơ cá nhân'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            background: '#f8fafc',
            position: 'relative',
          }}
        >
          {/* SLIDE BANNER (HIỂN THỊ KHI Ở CÁC TRANG QUẢN TRỊ / TỔNG QUAN) */}
          {currentPath !== '/search-rooms' && currentPath !== '/' && !currentPath.startsWith('/listing/') && (
            <div style={{ padding: '20px 28px 0', maxWidth: 1400, margin: '0 auto', boxSizing: 'border-box' }}>
              <BannerCarousel />
            </div>
          )}

          {/* PAGE OUTLET CONTENT */}
          <div style={{ boxSizing: 'border-box', width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
