import { useEffect, useMemo, useState } from 'react'

type Role = 'ADMIN' | 'LANDLORD' | 'MANAGER' | 'TENANT' | string

function roleLabel(role: Role) {
  const labels: Record<string, string> = {
    ADMIN: 'ADMIN',
    LANDLORD: 'Chủ nhà',
    MANAGER: 'Quản lý',
    TENANT: 'Người thuê',
  }

  return labels[role] || role
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('TENANT')
  const [username, setUsername] = useState('')
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    setRole(localStorage.getItem('role') || 'TENANT')
    setUsername(localStorage.getItem('username') || '')
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (!token || role !== 'LANDLORD') return

    fetch('http://localhost:8080/api/landlord/requests/pending-count', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPendingRequests(data.count)
        }
      })
      .catch(() => {})
  }, [role])

  const permissions = useMemo(() => {
    if (role === 'ADMIN') {
      return {
        building: false,
        room: false,
        tenant: true,
        contract: true,
        service: false,
        profile: true,
        audit: true,
        admin: true,
      }
    }

    if (role === 'LANDLORD' || role === 'MANAGER') {
      return {
        building: true,
        room: true,
        tenant: false,
        contract: false,
        service: true,
        profile: true,
        audit: false,
        admin: false,
      }
    }

    return {
      building: false,
      room: false,
      tenant: false,
      contract: false,
      service: false,
      profile: true,
      audit: false,
      admin: false,
    }
  }, [role])

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

    window.location.href = '/'
  }

  const go = (path: string) => {
    window.location.href = path
  }

  const actions = [
    {
      key: 'dashboard',
      icon: '',
      title: 'Tổng quan',
      enabled: true,
      path: '/dashboard',
    },
    {
      key: 'searchRooms',
      icon: '🔍',
      title: 'Tìm phòng trọ',
      enabled: true,
      path: '/search-rooms',
    },
    {
      key: 'building',
      icon: '',
      title: 'Quản lý tòa nhà',
      enabled: permissions.building,
      path: '/buildings',
    },
    {
      key: 'room',
      icon: '',
      title: 'Quản lý phòng',
      enabled: permissions.room,
      path: '/rooms',
    },
    {
      key: 'request',
      icon: '',
      title: 'Yêu cầu thuê',
      enabled: role === 'LANDLORD',
      path: '/landlord/requests',
    },
    {
      key: 'myRequests',
      icon: '',
      title: 'Yêu cầu của tôi',
      enabled: role === 'TENANT',
      path: '/my-requests',
    },
    {
      key: 'tenant',
      icon: '',
      title: 'Người thuê',
      enabled: permissions.tenant,
      path: '/tenants',
    },
    {
      key: 'contract',
      icon: '',
      title: 'Hợp đồng',
      enabled: permissions.contract,
      path: '/contracts',
    },
    {
      key: 'service',
      icon: '',
      title: 'Dịch vụ',
      enabled: permissions.service,
      path: '/services',
    },
    {
      key: 'profile',
      icon: '',
      title: 'Hồ sơ',
      enabled: permissions.profile,
      path: '/profile',
    },
    {
      key: 'audit',
      icon: '',
      title: 'Nhật ký hệ thống',
      enabled: permissions.audit,
      path: '/audit-logs',
    },
    {
      key: 'admin',
      icon: '',
      title: 'Quản trị tài khoản',
      enabled: permissions.admin,
      path: '/admin',
    },
  ]

  const currentPath = window.location.pathname

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f8fafc',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 250,
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        {/* LOGO */}
        <div
          style={{
            height: 82,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid #e2e8f0',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            TR
          </div>

          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              TroRoom
            </div>

            <div
              style={{
                color: '#94a3b8',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Quản lý phòng trọ
            </div>
          </div>
        </div>

        {/* MENU */}
        <nav
          style={{
            flex: 1,
            padding: '22px 12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.5px',
              margin: '0 12px 12px',
            }}
          >
            CHỨC NĂNG
          </div>

          {actions
            .filter((item) => item.enabled)
            .map((item) => {
              const active =
                currentPath === item.path ||
                (item.key === 'building' &&
                  currentPath.startsWith('/building-services/'))

              return (
                <button
                  key={item.key}
                  onClick={() => go(item.path)}
                  style={{
                    width: '100%',
                    height: 48,
                    border: 'none',
                    borderRadius: 10,
                    padding: '0 12px',
                    marginBottom: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : '#475569',
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      textAlign: 'center',
                      fontSize: 17,
                    }}
                  >
                    {item.icon}
                  </span>

                  <span>{item.title}</span>

                  {item.key === 'request' && pendingRequests > 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        minWidth: 20,
                        height: 20,
                        padding: '0 6px',
                        borderRadius: 10,
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      {pendingRequests}
                    </span>
                  )}
                </button>
              )
            })}
        </nav>

        {/* USER */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: 14,
          }}
        >
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 7,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {username || 'Tài khoản'}
            </div>

            <span
              style={{
                display: 'inline-block',
                padding: '5px 10px',
                borderRadius: 999,
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {roleLabel(role)}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              height: 42,
              border: 'none',
              background: '#1081b9',
              color: '#fff',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* PAGE CONTENT */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default MainLayout