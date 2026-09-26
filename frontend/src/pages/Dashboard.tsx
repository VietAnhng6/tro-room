import { useEffect, useState } from 'react'

function Dashboard() {
  const [role, setRole] = useState('')

  useEffect(() => {
    const savedRole = localStorage.getItem('role')
    setRole(savedRole || 'TENANT')
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('role')
    window.location.href = '/'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: '70px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: 'white',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            TR
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: '18px' }}>
              TroRoom
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
              Quản lý phòng trọ
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <span
            style={{
              padding: '7px 12px',
              borderRadius: '999px',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {role}
          </span>

          <button
            onClick={handleLogout}
            style={{
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '36px 32px',
        }}
      >
        <div style={{ marginBottom: '30px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 800,
            }}
          >
            Tổng quan
          </h1>

          <p
            style={{
              marginTop: '8px',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Chào mừng bạn đến với hệ thống TroRoom.
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px',
            marginBottom: '30px',
          }}
        >
          {[
            ['🏢', 'Tòa nhà', '0'],
            ['🚪', 'Phòng trọ', '0'],
            ['👥', 'Người thuê', '0'],
            ['💰', 'Doanh thu tháng', '0 ₫'],
          ].map(([icon, title, value]) => (
            <div
              key={title}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '22px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ fontSize: '25px', marginBottom: '12px' }}>
                {icon}
              </div>

              <div
                style={{
                  color: '#64748b',
                  fontSize: '13px',
                  marginBottom: '5px',
                }}
              >
                {title}
              </div>

              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h2
            style={{
              margin: '0 0 18px',
              fontSize: '18px',
            }}
          >
            Chức năng nhanh
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              '🏢 Quản lý tòa nhà',
              '🚪 Quản lý phòng',
              '👥 Người thuê',
              '📄 Hợp đồng',
              '⚡ Dịch vụ',
              '👤 Hồ sơ',
            ].map((item) => (
              <button
                key={item}
                style={{
                  padding: '15px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#334155',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard