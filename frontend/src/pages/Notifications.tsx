import { useCallback, useEffect, useState } from 'react'

const API = 'http://localhost:8080'

type NotificationItem = {
  id: number
  type: 'REQUEST_ACCEPTED' | 'REQUEST_REJECTED'
  title: string
  message: string
  landlordName: string
  landlordPhone: string
  landlordEmail: string
  createdAt: string
  read: boolean
}

export default function Notifications() {
  const token = localStorage.getItem('accessToken')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return

    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Không thể tải thông báo')
      }

      const data = await res.json()
      setNotifications(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function markAsRead(id: number) {
    try {
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setNotifications(prev =>
        prev.map(item =>
          item.id === id ? { ...item, read: true } : item
        )
      )
    } catch (error) {
      console.error(error)
    }
  }

  function formatDate(value: string) {
    if (!value) return ''
    return new Date(value).toLocaleString('vi-VN')
  }

  if (!token) {
    return <div style={{ padding: 30 }}>Vui lòng đăng nhập.</div>
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 20 }}>🔔 Thông báo</h2>

      {loading ? (
        <p>Đang tải thông báo...</p>
      ) : notifications.length === 0 ? (
        <div
          style={{
            padding: 30,
            textAlign: 'center',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: 10,
          }}
        >
          Bạn chưa có thông báo nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map(item => {
            const accepted = item.type === 'REQUEST_ACCEPTED'

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.read) markAsRead(item.id)
                }}
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  background: item.read ? '#fff' : '#eff6ff',
                  cursor: item.read ? 'default' : 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <strong>
                    {accepted ? '🟢' : '🔴'} {item.title}
                  </strong>

                  {!item.read && (
                    <span
                      style={{
                        color: '#2563eb',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Chưa đọc
                    </span>
                  )}
                </div>

                <p style={{ margin: '10px 0', color: '#475569' }}>
                  {item.message}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <span>
                    👤 {item.landlordName || 'Chưa cập nhật'}
                  </span>

                  {item.landlordPhone && (
                    <a
                      href={`tel:${item.landlordPhone}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        color: '#2563eb',
                        fontWeight: 700,
                      }}
                    >
                      📞 {item.landlordPhone}
                    </a>
                  )}

                  {item.landlordEmail && (
                    <a
                      href={`mailto:${item.landlordEmail}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        color: '#2563eb',
                        fontWeight: 700,
                      }}
                    >
                      ✉️ {item.landlordEmail}
                    </a>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: '#94a3b8',
                    fontSize: 12,
                  }}
                >
                  {formatDate(item.createdAt)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}