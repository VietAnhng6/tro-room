import { useEffect, useMemo, useState } from 'react'

type Role = 'ADMIN' | 'LANDLORD' | 'MANAGER' | 'TENANT' | string

function Dashboard() {
  const [role, setRole] = useState<Role>('TENANT')

  useEffect(() => {
    setRole(localStorage.getItem('role') || 'TENANT')
  }, [])

  const permissions = useMemo(() => {
    if (role === 'ADMIN') {
    return { building: false, room: false, tenant: true, contract: true, service: false, profile: true, audit: true, admin: true, myRequests: false }
    }
    if (role === 'LANDLORD') {
      return { building: true, room: true, tenant: false, contract: false, service: true, profile: true, audit: false, admin: false, myRequests: false }
    }
    if (role === 'MANAGER') {
      return { building: true, room: true, tenant: false, contract: false, service: true, profile: true, audit: false, admin: false, myRequests: false }
    }
    return { building: false, room: false, tenant: false, contract: false, service: false, profile: true, audit: false, admin: false, myRequests: true }
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
    window.location.href = '/'
  }

  const go = (path: string) => {
    window.location.href = path
  }

  const actions = [
    { key: 'building', icon: '🏢', title: 'Quản lý tòa nhà', enabled: permissions.building, path: '/buildings' },
    { key: 'room', icon: '🚪', title: 'Quản lý phòng', enabled: permissions.room, path: '/rooms' },
    { key: 'tenant', icon: '👥', title: 'Người thuê', enabled: permissions.tenant, path: '/tenants' },
    { key: 'contract', icon: '📄', title: 'Hợp đồng', enabled: permissions.contract, path: '/contracts' },
    { key: 'service', icon: '⚡', title: 'Dịch vụ', enabled: permissions.service, path: '/services' },
    { key: 'profile', icon: '👤', title: 'Hồ sơ', enabled: permissions.profile, path: '/profile' },
    { key: 'myRequests', icon: '📋', title: 'Yêu cầu của tôi', enabled: permissions.myRequests, path: '/my-requests' },
    { key: 'audit', icon: '🧾', title: 'Nhật ký hệ thống', enabled: permissions.audit, path: '/audit-logs' },
    { key: 'admin', icon: '🛡️', title: 'Quản trị tài khoản', enabled: permissions.admin, path: '/admin' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      color: '#0f172a',
    }}>
      <header style={{
        height: 70, background: '#fff', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
            color: '#fff', fontWeight: 800, fontSize: 16,
          }}>TR</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>TroRoom</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Quản lý phòng trọ</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{
            padding: '7px 12px', borderRadius: 999, background: '#eff6ff',
            color: '#2563eb', fontSize: 12, fontWeight: 700,
          }}>{role}</span>
          <button onClick={handleLogout} style={{
            border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          }}>Đăng xuất</button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 32px' }}>
        <div style={{ marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Tổng quan</h1>
          <p style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>
            Chào mừng bạn đến với hệ thống TroRoom.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 18, marginBottom: 30,
        }}>
          {[
            ['🏢', 'Tòa nhà', '0'], ['🚪', 'Phòng trọ', '0'],
            ['👥', 'Người thuê', '0'], ['💰', 'Doanh thu tháng', '0 ₫'],
          ].map(([icon, title, value]) => (
            <div key={title} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
              padding: 22, boxShadow: '0 4px 12px rgba(15,23,42,.04)',
            }}>
              <div style={{ fontSize: 25, marginBottom: 12 }}>{icon}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24,
        }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 18 }}>Chức năng</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12,
          }}>
            {actions.filter(item => item.enabled).map(item => (
              <button
                key={item.key}
                onClick={() => go(item.path)}
                style={{
                  padding: 15, border: '1px solid #e2e8f0', borderRadius: 10,
                  background: '#f8fafc', color: '#334155', textAlign: 'left',
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                {item.icon} {item.title}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
