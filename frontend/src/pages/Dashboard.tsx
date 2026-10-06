import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Role = 'ADMIN' | 'LANDLORD' | 'MANAGER' | 'TENANT' | string

export function Dashboard() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('TENANT')
  const [username, setUsername] = useState('')
  const [buildingCount, setBuildingCount] = useState(0)
  const [roomCount, setRoomCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    setRole(localStorage.getItem('role') || 'TENANT')
    setUsername(localStorage.getItem('username') || '')
  }, [])

  useEffect(() => {
    const loadDashboardStats = async () => {
      const token = localStorage.getItem('accessToken')

      if (!token || (role !== 'LANDLORD' && role !== 'MANAGER')) {
        return
      }

      try {
        const [buildingsRes, roomsRes] = await Promise.all([
          fetch('http://localhost:8080/api/buildings', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('http://localhost:8080/api/rooms', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

        if (buildingsRes.ok) {
          const buildings = await buildingsRes.json()
          setBuildingCount(buildings.length)
        }

        if (roomsRes.ok) {
          const rooms = await roomsRes.json()
          setRoomCount(rooms.length)
        }
      } catch (error) {
        console.error('Không thể tải thống kê Dashboard:', error)
      }
    }

    loadDashboardStats()
  }, [role])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || role !== 'LANDLORD') return

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
  }, [role])

  const statCards = [
    {
<<<<<<< HEAD
      title: 'Tòa nhà',
      value: String(buildingCount),
      color: '#2563eb',
=======
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
>>>>>>> 2dcbd0ecc63704ec53c21db1c3227b0430e03459
      path: '/buildings',
    },
    {
      title: 'Phòng trọ',
      value: String(roomCount),
      color: '#0d9488',
      path: '/rooms',
    },
    {
      title: 'Người thuê',
      value: '0',
      color: '#d97706',
      path: '/tenants',
    },
    {
      title: 'Doanh thu tháng',
      value: '0 ₫',
      color: '#7c3aed',
      path: '#',
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 40px', boxSizing: 'border-box' }}>
      {/* TITLE & GREETING */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.4px',
          }}
        >
          Chào mừng trở lại, {username || 'bạn'}
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            color: '#64748b',
            fontSize: 14,
          }}
        >
          Theo dõi tổng quan hệ thống, thống kê tòa nhà và hoạt động thuê phòng hôm nay.
        </p>
      </div>

      {/* PENDING REQUESTS ALERT FOR LANDLORD */}
      {role === 'LANDLORD' && pendingRequests > 0 && (
        <div
          onClick={() => navigate('/landlord/requests')}
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: '#9a3412', fontSize: 14.5 }}>
              Bạn có {pendingRequests} yêu cầu thuê / xem phòng mới đang chờ duyệt
            </div>
            <div style={{ color: '#c2410c', fontSize: 13, marginTop: 2 }}>
              Nhấn vào đây để xem chi tiết và phản hồi khách thuê ngay.
            </div>
          </div>
          <button
            style={{
              border: 'none',
              background: '#ea580c',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Xử lý ngay
          </button>
        </div>
      )}

      {/* STATISTICS - 4 EQUAL SIZED CLEAN BLOCKS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
          width: '100%',
          marginBottom: 24,
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.title}
            onClick={() => card.path !== '#' && navigate(card.path)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px 22px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
              cursor: card.path !== '#' ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (card.path !== '#') {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(15, 23, 42, 0.06)'
              }
            }}
            onMouseLeave={(e) => {
              if (card.path !== '#') {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.03)'
              }
            }}
          >
            <div style={{ color: '#64748b', fontSize: 13.5, fontWeight: 650 }}>{card.title}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: card.color,
                marginTop: 10,
                letterSpacing: '-0.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* QUICK SEARCH ROOMS BANNER (CHO KHÁCH THUÊ) */}
      {role === 'TENANT' && (
        <div
          style={{
            marginBottom: 24,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e40af', marginBottom: 3 }}>
              Khám phá danh sách phòng trọ đang cho thuê
            </div>
            <div style={{ fontSize: 13.5, color: '#2563eb' }}>
              Tìm kiếm phòng theo tòa nhà, tầng, mức giá phù hợp và đặt lịch xem phòng trực tuyến.
            </div>
          </div>
          <button
            onClick={() => navigate('/search-rooms')}
            style={{
              border: 'none',
              borderRadius: 10,
              padding: '11px 20px',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tìm phòng ngay
          </button>
        </div>
      )}

      {/* QUICK ACTIONS & WELCOME INFO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 20,
        }}
      >
        {/* LEFT CARD */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: 24,
            boxSizing: 'border-box',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Hướng dẫn sử dụng hệ thống
          </div>
          <p style={{ color: '#64748b', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 16px' }}>
            Hệ thống cung cấp đầy đủ công cụ phục vụ cả Chủ nhà và Khách thuê trong việc quản lý, đăng tin và thuê trọ tiện lợi:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 750, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                Quản lý tòa và phòng
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                Thêm tòa nhà, cấu hình tầng, số phòng và cập nhật bảng giá điện nước chi tiết.
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 750, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                Tải ảnh và Đăng tin
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                Gộp quản lý ảnh vào form sửa phòng, đăng tin cho thuê các phòng trống nhanh chóng.
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 750, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                Xử lý yêu cầu thuê
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                Tiếp nhận yêu cầu hẹn xem phòng từ khách thuê và phản hồi nhanh chóng.
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 750, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                Hồ sơ cá nhân & CCCD
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                Cập nhật thông tin định danh và tải lên hình ảnh CCCD 2 mặt với bản xem trước trực tiếp.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: 24,
            boxSizing: 'border-box',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Thông tin tài khoản
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: '#64748b' }}>Tài khoản:</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{username || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: '#64748b' }}>Vai trò:</span>
                <span
                  style={{
                    fontWeight: 750,
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {role}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: '#64748b' }}>Trạng thái:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>Đang hoạt động</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
<<<<<<< HEAD
            Chỉnh sửa hồ sơ cá nhân
          </button>
        </div>
=======
            <div
              style={{
                fontSize: 18,
                fontWeight: 750,
                marginBottom: 8,
              }}
            >
              Chào mừng đến với TroRoom 👋
            </div>

            <div
              style={{
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Sử dụng thanh chức năng bên trái để truy cập các chức năng mà tài khoản của bạn được phép sử dụng.
            </div>
          </div>

          {/* QUICK SEARCH ROOMS BANNER */}
          <div
            style={{
              marginTop: 20,
              background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
              border: '1.5px solid #bfdbfe',
              borderRadius: 16,
              padding: '22px 26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>
                🔍 Khám phá danh sách phòng trọ
              </div>
              <div style={{ fontSize: 13.5, color: '#3b82f6' }}>
                Xem danh sách tất cả các phòng trọ trống đang đăng tin cho thuê trên hệ thống TroRoom.
              </div>
            </div>
            <button
              onClick={() => go('/search-rooms')}
              style={{
                border: 'none',
                borderRadius: 12,
                padding: '12px 22px',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Xem trang tìm phòng</span>
              <span>→</span>
            </button>
          </div>
        </main>
>>>>>>> 2dcbd0ecc63704ec53c21db1c3227b0430e03459
      </div>
    </div>
  )
}

export default Dashboard